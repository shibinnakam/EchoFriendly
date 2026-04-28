const Razorpay = require('razorpay');
const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../shared/db');
const { ok, err } = require('../shared/response');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.handler = async (event) => {
    try {
        const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
        if (!userId) return err(401, 'Unauthorized');

        const { orderId } = JSON.parse(event.body || '{}');

        const res = await ddbDocClient.send(new GetCommand({
            TableName: process.env.ORDERS_TABLE,
            Key: { orderId }
        }));

        const order = res.Item;
        if (!order) return err(404, 'Order not found');
        if (order.userId !== userId) return err(403, 'Forbidden');
        if (order.status === 'Delivered' || order.status === 'Cancelled') {
            return err(400, `Cannot cancel an order with status: ${order.status}`);
        }

        // Step 1: Cancel the order immediately
        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.ORDERS_TABLE,
            Key: { orderId },
            UpdateExpression: 'SET #s = :status, refundStatus = :rs, cancelledAt = :ca',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
                ':status': 'Cancelled',
                ':rs': 'pending',
                ':ca': new Date().toISOString()
            }
        }));

        // Step 2: Attempt Razorpay refund (non-blocking)
        try {
            if (order.paymentId) {
                const refund = await razorpay.payments.refund(order.paymentId, { speed: 'optimum' });
                await ddbDocClient.send(new UpdateCommand({
                    TableName: process.env.ORDERS_TABLE,
                    Key: { orderId },
                    UpdateExpression: 'SET refundId = :rid, refundStatus = :rs, refundedAt = :ra',
                    ExpressionAttributeValues: {
                        ':rid': refund.id,
                        ':rs': 'completed',
                        ':ra': new Date().toISOString()
                    }
                }));
            }
        } catch (refundErr) {
            console.error('Razorpay refund error (order already cancelled):', refundErr);
        }

        // Step 3: Restore stock
        try {
            for (const item of order.items) {
                const pRes = await ddbDocClient.send(new GetCommand({
                    TableName: process.env.PRODUCTS_TABLE,
                    Key: { productId: item.id }
                }));
                const p = pRes.Item;
                if (p) {
                    if (item.variantSize && p.variants) {
                        const vIdx = p.variants.findIndex(v => v.size === item.variantSize);
                        if (vIdx > -1) {
                            await ddbDocClient.send(new UpdateCommand({
                                TableName: process.env.PRODUCTS_TABLE,
                                Key: { productId: item.id },
                                UpdateExpression: `SET variants[${vIdx}].stock = variants[${vIdx}].stock + :qty`,
                                ExpressionAttributeValues: { ':qty': parseInt(item.qty) }
                            }));
                        }
                    } else {
                        await ddbDocClient.send(new UpdateCommand({
                            TableName: process.env.PRODUCTS_TABLE,
                            Key: { productId: item.id },
                            UpdateExpression: 'SET stock = stock + :qty',
                            ExpressionAttributeValues: { ':qty': parseInt(item.qty) }
                        }));
                    }
                }
            }
        } catch (stockErr) {
            console.error('Stock restore error:', stockErr);
        }

        return ok({ message: 'Order cancelled successfully' });
    } catch (e) {
        console.error('CancelOrder error:', e);
        return err(500, e.message);
    }
};

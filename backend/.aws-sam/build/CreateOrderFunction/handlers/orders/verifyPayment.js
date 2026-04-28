const crypto = require('crypto');
const { PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../shared/db');
const { ok, err } = require('../shared/response');

exports.handler = async (event) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = JSON.parse(event.body || '{}');

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return err(400, 'Invalid signature');
        }

        const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        await ddbDocClient.send(new PutCommand({
            TableName: process.env.ORDERS_TABLE,
            Item: {
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                invoiceId,
                status: 'Ordered',
                amount: orderDetails.totalAmount,
                items: orderDetails.items,
                address: orderDetails.address,
                userId: orderDetails.userId,
                userEmail: orderDetails.userEmail || 'N/A',
                createdAt: new Date().toISOString(),
            },
        }));

        // Decrement stock for each item
        try {
            for (const item of orderDetails.items) {
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
                                UpdateExpression: `SET variants[${vIdx}].stock = variants[${vIdx}].stock - :qty`,
                                ExpressionAttributeValues: { ':qty': parseInt(item.qty) }
                            }));
                        }
                    } else {
                        await ddbDocClient.send(new UpdateCommand({
                            TableName: process.env.PRODUCTS_TABLE,
                            Key: { productId: item.id },
                            UpdateExpression: 'SET stock = stock - :qty',
                            ExpressionAttributeValues: { ':qty': parseInt(item.qty) },
                            ConditionExpression: 'stock >= :qty'
                        }));
                    }
                }
            }
        } catch (stockErr) {
            console.error('Stock reduction error:', stockErr);
        }

        return ok({ status: 'success', message: 'Payment verified', invoiceId });
    } catch (e) {
        console.error('VerifyPayment error:', e);
        return err(500, e.message);
    }
};

const Razorpay = require('razorpay');
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ADMIN_EMAIL = 'shibinsaji2026@mca.ajce.in';

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    const { routeKey, body, headers, requestContext } = event;
    const data = body ? JSON.parse(body) : {};

    try {
        // --- 1. CREATE ORDER ---
        if (routeKey === 'POST /orders/create') {
            // --- SECURITY: RE-CALCULATE TOTAL FROM DATABASE ---
            let calculatedTotal = 0;
            for (const item of data.items) {
                const res = await ddbDocClient.send(new GetCommand({
                    TableName: process.env.PRODUCTS_TABLE,
                    Key: { productId: item.productId }
                }));
                const product = res.Item;
                if (!product) throw new Error(`Product not found: ${item.productId}`);
                
                let itemPrice = parseFloat(product.price);
                if (item.variantSize && product.variants && product.variants.length > 0) {
                    const variant = product.variants.find(v => v.size === item.variantSize);
                    if (variant) itemPrice = parseFloat(variant.price);
                }
                
                calculatedTotal += itemPrice * parseInt(item.qty);
            }

            const options = {
                amount: Math.round(calculatedTotal * 100), // convert to paise
                currency: data.currency || 'INR',
                receipt: `receipt_${Date.now()}`,
            };
            const order = await razorpay.orders.create(options);
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify(order),
            };
        }

        // --- 2. VERIFY PAYMENT (FRONTEND CALL) ---
        if (routeKey === 'POST /orders/verify') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = data;
            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
            const generated_signature = hmac.digest('hex');

            if (generated_signature === razorpay_signature) {
                const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                
                // Save Order to DB
                await ddbDocClient.send(new PutCommand({
                    TableName: process.env.ORDERS_TABLE,
                    Item: {
                        orderId: razorpay_order_id,
                        paymentId: razorpay_payment_id,
                        invoiceId: invoiceId,
                        status: 'Ordered',
                        amount: orderDetails.totalAmount,
                        items: orderDetails.items,
                        address: orderDetails.address,
                        userId: orderDetails.userId,
                        userEmail: orderDetails.userEmail || 'N/A',
                        createdAt: new Date().toISOString(),
                    },
                }));
                
                // --- 2.1 DECREMENT STOCK FOR EACH ITEM ---
                try {
                    for (const item of orderDetails.items) {
                        const pRes = await ddbDocClient.send(new GetCommand({ TableName: process.env.PRODUCTS_TABLE, Key: { productId: item.id } }));
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
                    console.error("Stock reduction error:", stockErr);
                }

                return {
                    statusCode: 200,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    },
                    body: JSON.stringify({ status: 'success', message: 'Payment verified', invoiceId }),
                };
            } else {
                return {
                    statusCode: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    },
                    body: JSON.stringify({ status: 'failure', message: 'Invalid signature' }),
                };
            }
        }

        // --- 3. RAZORPAY WEBHOOK ---
        if (routeKey === 'POST /orders/webhook') {
            // ... (webhook logic stays the same)
            return { statusCode: 200, body: 'OK' };
        }

        // --- 4. UPDATE ORDER STATUS (ADMIN ONLY) ---
        if (routeKey === 'PUT /orders/status') {
            const claims = requestContext.authorizer?.jwt?.claims;
            if (!claims || claims.email !== ADMIN_EMAIL) {
                return {
                    statusCode: 403,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ message: 'Forbidden' }),
                };
            }
            
            const { orderId, status } = data;
            
            const resOrder = await ddbDocClient.send(new GetCommand({
                TableName: process.env.ORDERS_TABLE,
                Key: { orderId: orderId }
            }));
            
            if (resOrder.Item && resOrder.Item.status === 'Cancelled') {
                return {
                    statusCode: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ message: 'Cannot change status of a cancelled order' }),
                };
            }

            await ddbDocClient.send(new UpdateCommand({
                TableName: process.env.ORDERS_TABLE,
                Key: { orderId: orderId },
                UpdateExpression: 'SET #s = :status',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':status': status }
            }));
            
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify({ message: 'Status updated successfully' }),
            };
        }

        // --- 5. LIST ALL ORDERS (ADMIN ONLY) ---
        if (routeKey === 'GET /orders/list') {
            // --- SECURITY: ADMIN CHECK ---
            const claims = requestContext.authorizer?.jwt?.claims;
            if (!claims || claims.email !== ADMIN_EMAIL) {
                return {
                    statusCode: 403,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ message: 'Forbidden' }),
                };
            }

            const res = await ddbDocClient.send(new ScanCommand({
                TableName: process.env.ORDERS_TABLE
            }));
            
            const orders = res.Items || [];
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify(orders),
            };
        }

        // --- 5. LIST USER ORDERS ---
        if (routeKey === 'GET /orders/user-list') {
            const userId = requestContext.authorizer.jwt.claims.sub;
            
            const res = await ddbDocClient.send(new ScanCommand({
                TableName: process.env.ORDERS_TABLE,
                FilterExpression: 'userId = :u',
                ExpressionAttributeValues: { ':u': userId }
            }));
            
            const orders = res.Items || [];
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify(orders),
            };
        }

        // --- 6. CANCEL ORDER (USER) ---
        if (routeKey === 'PUT /orders/cancel') {
            const userId = requestContext.authorizer?.jwt?.claims?.sub;
            if (!userId) return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Unauthorized' };

            const { orderId } = data;
            
            const res = await ddbDocClient.send(new GetCommand({
                TableName: process.env.ORDERS_TABLE,
                Key: { orderId: orderId }
            }));
            
            const order = res.Item;
            if (!order) return { statusCode: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ message: 'Order not found' }) };
            
            if (order.userId !== userId) return { statusCode: 403, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ message: 'Forbidden' }) };
            
            if (order.status === 'Delivered' || order.status === 'Cancelled') {
                return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ message: `Cannot cancel an order with status: ${order.status}` }) };
            }
            
            // Process Razorpay Refund
            let refundId = null;
            try {
                if (order.paymentId) {
                    const refund = await razorpay.payments.refund(order.paymentId, {
                        speed: "optimum"
                    });
                    refundId = refund.id; // e.g. "rfnd_XXXXXXXXXXXX"
                }
            } catch (refundErr) {
                console.error("Razorpay refund error:", refundErr);
                return {
                    statusCode: 500,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ message: 'Cancellation failed. Unable to process refund automatically. Please contact support.' })
                };
            }
            
            // Mark order as Cancelled, storing refundId as proof
            await ddbDocClient.send(new UpdateCommand({
                TableName: process.env.ORDERS_TABLE,
                Key: { orderId: orderId },
                UpdateExpression: 'SET #s = :status, refundId = :refundId, refundedAt = :refundedAt',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { 
                    ':status': 'Cancelled',
                    ':refundId': refundId,
                    ':refundedAt': new Date().toISOString()
                }
            }));
            
            // Re-increment stock
            try {
                for (const item of order.items) {
                    const pRes = await ddbDocClient.send(new GetCommand({ TableName: process.env.PRODUCTS_TABLE, Key: { productId: item.id } }));
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
                console.error("Stock restore error:", stockErr);
            }

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Order cancelled successfully' }),
            };
        }

        return { statusCode: 404, body: 'Not Found' };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
            body: JSON.stringify({ error: err.message }),
        };
    }
};

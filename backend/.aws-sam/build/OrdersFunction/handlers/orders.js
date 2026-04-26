const Razorpay = require('razorpay');
const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    const { routeKey, body, headers, requestContext } = event;
    const data = body ? JSON.parse(body) : {};

    try {
        // --- 1. CREATE ORDER ---
        if (routeKey === 'POST /orders/create') {
            const options = {
                amount: data.amount, // in paise
                currency: data.currency || 'INR',
                receipt: `receipt_${Date.now()}`,
            };
            const order = await razorpay.orders.create(options);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
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
                // Generate Standard Invoice ID
                const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                
                await ddbDocClient.send(new PutCommand({
                    TableName: process.env.ORDERS_TABLE,
                    Item: {
                        orderId: razorpay_order_id,
                        paymentId: razorpay_payment_id,
                        invoiceId: invoiceId,
                        status: 'paid',
                        amount: orderDetails.totalAmount,
                        items: orderDetails.items,
                        address: orderDetails.address,
                        userId: orderDetails.userId,
                        userEmail: orderDetails.userEmail || 'N/A',
                        createdAt: new Date().toISOString(),
                    },
                }));

                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'success', message: 'Payment verified', invoiceId }),
                };
            } else {
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'failure', message: 'Invalid signature' }),
                };
            }
        }

        // --- 3. RAZORPAY WEBHOOK ---
        if (routeKey === 'POST /orders/webhook') {
            const signature = headers['x-razorpay-signature'];
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
            
            const hmac = crypto.createHmac('sha256', webhookSecret);
            hmac.update(body);
            const generated_signature = hmac.digest('hex');

            if (generated_signature !== signature) {
                return { statusCode: 400, body: 'Invalid signature' };
            }

            const rzpEvent = data.event;
            console.log('Webhook Event:', rzpEvent);

            if (rzpEvent === 'order.paid' || rzpEvent === 'payment.captured') {
                // If the order wasn't already fulfilled by the direct verification call,
                // you could handle it here. For simplicity in this demo, we rely on the direct call.
                // But in production, this is where you'd handle edge cases like tab closing.
            }

            return { statusCode: 200, body: 'OK' };
        }

        // --- 4. LIST ALL ORDERS (ADMIN) ---
        if (routeKey === 'GET /orders/list') {
            // In a real app, check for admin claims here
            const res = await ddbDocClient.send(new ScanCommand({
                TableName: process.env.ORDERS_TABLE
            }));
            
            const orders = res.Items || [];
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orders),
            };
        }

        return { statusCode: 404, body: 'Not Found' };
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message }),
        };
    }
};

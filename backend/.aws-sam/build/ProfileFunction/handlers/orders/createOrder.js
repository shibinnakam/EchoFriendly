const Razorpay = require('razorpay');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../shared/db');
const { ok, err } = require('../shared/response');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.handler = async (event) => {
    try {
        const data = JSON.parse(event.body || '{}');
        let calculatedTotal = 0;

        for (const item of data.items) {
            const res = await ddbDocClient.send(new GetCommand({
                TableName: process.env.PRODUCTS_TABLE,
                Key: { productId: item.productId }
            }));
            const product = res.Item;
            if (!product) throw new Error(`Product not found: ${item.productId}`);

            let itemPrice = parseFloat(product.price);
            if (item.variantSize && product.variants?.length > 0) {
                const variant = product.variants.find(v => v.size === item.variantSize);
                if (variant) itemPrice = parseFloat(variant.price);
            }
            calculatedTotal += itemPrice * parseInt(item.qty);
        }

        const order = await razorpay.orders.create({
            amount: Math.round(calculatedTotal * 100),
            currency: data.currency || 'INR',
            receipt: `receipt_${Date.now()}`,
        });

        return ok(order);
    } catch (e) {
        console.error('CreateOrder error:', e);
        return err(500, e.message);
    }
};

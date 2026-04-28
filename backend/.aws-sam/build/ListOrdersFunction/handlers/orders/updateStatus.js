const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../shared/db');
const { ok, err } = require('../shared/response');

const ADMIN_EMAIL = 'shibinsaji2026@mca.ajce.in';

exports.handler = async (event) => {
    try {
        const claims = event.requestContext.authorizer?.jwt?.claims;
        if (!claims || claims.email !== ADMIN_EMAIL) return err(403, 'Forbidden');

        const { orderId, status } = JSON.parse(event.body || '{}');

        const resOrder = await ddbDocClient.send(new GetCommand({
            TableName: process.env.ORDERS_TABLE,
            Key: { orderId }
        }));

        if (resOrder.Item?.status === 'Cancelled') {
            return err(400, 'Cannot change status of a cancelled order');
        }

        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.ORDERS_TABLE,
            Key: { orderId },
            UpdateExpression: 'SET #s = :status',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':status': status }
        }));

        return ok({ message: 'Status updated successfully' });
    } catch (e) {
        console.error('UpdateStatus error:', e);
        return err(500, e.message);
    }
};

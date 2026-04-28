const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../shared/db');
const { ok, err } = require('../shared/response');

const ADMIN_EMAIL = 'shibinsaji2026@mca.ajce.in';

exports.handler = async (event) => {
    try {
        const path = event.requestContext.http.path;
        const isAdminList = path.includes('/orders/list');
        const isUserList = path.includes('/orders/user-list');

        if (isAdminList) {
            const claims = event.requestContext.authorizer?.jwt?.claims;
            if (!claims || claims.email !== ADMIN_EMAIL) return err(403, 'Forbidden');

            const res = await ddbDocClient.send(new ScanCommand({ TableName: process.env.ORDERS_TABLE }));
            const orders = (res.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return ok(orders);
        }

        if (isUserList) {
            const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
            if (!userId) return err(401, 'Unauthorized');

            const res = await ddbDocClient.send(new ScanCommand({
                TableName: process.env.ORDERS_TABLE,
                FilterExpression: 'userId = :u',
                ExpressionAttributeValues: { ':u': userId }
            }));
            const orders = (res.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return ok(orders);
        }

        return err(404, 'Not found');
    } catch (e) {
        console.error('ListOrders error:', e);
        return err(500, e.message);
    }
};

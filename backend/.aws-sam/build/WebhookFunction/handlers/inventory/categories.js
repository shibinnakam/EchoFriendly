const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ADMIN_EMAIL = 'shibinsaji2026@mca.ajce.in';

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify(body)
    };
}

exports.handler = async (event) => {
    try {
        const method = event.requestContext.http.method;

        if (method === 'OPTIONS') return response(200, { message: 'CORS OK' });

        if (method !== 'GET') {
            const claims = event.requestContext.authorizer?.jwt?.claims;
            if (!claims || claims.email !== ADMIN_EMAIL) return response(403, { message: 'Forbidden' });
        }

        if (method === 'GET') {
            const { Items } = await docClient.send(new ScanCommand({ TableName: process.env.CATEGORIES_TABLE }));
            return response(200, Items || []);
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { categoryId, ...data } = body;
            if (!categoryId) return response(400, { message: 'Missing categoryId' });
            await docClient.send(new PutCommand({
                TableName: process.env.CATEGORIES_TABLE,
                Item: { categoryId, ...data, updatedAt: new Date().toISOString(), createdAt: data.createdAt || new Date().toISOString() }
            }));
            return response(200, { message: 'Category saved', categoryId });
        }

        if (method === 'DELETE') {
            const categoryId = event.queryStringParameters?.categoryId;
            if (!categoryId) return response(400, { message: 'Missing categoryId' });
            await docClient.send(new DeleteCommand({ TableName: process.env.CATEGORIES_TABLE, Key: { categoryId } }));
            return response(200, { message: 'Category deleted' });
        }

        return response(404, { message: 'Route not found' });
    } catch (e) {
        console.error('CategoriesFunction error:', e);
        return response(500, { message: e.message });
    }
};

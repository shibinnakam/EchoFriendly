const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});
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
        const path = event.requestContext.http.path;

        if (method === 'OPTIONS') return response(200, { message: 'CORS OK' });

        if (method !== 'GET') {
            const claims = event.requestContext.authorizer?.jwt?.claims;
            if (!claims || claims.email !== ADMIN_EMAIL) return response(403, { message: 'Forbidden' });
        }

        if (path.includes('/presigned-url')) {
            const { fileName, fileType } = JSON.parse(event.body || '{}');
            const key = `uploads/${Date.now()}-${fileName}`;
            const command = new PutObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: key, ContentType: fileType });
            const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
            const fileUrl = `https://${process.env.MEDIA_BUCKET}.s3.amazonaws.com/${key}`;
            return response(200, { uploadUrl, fileUrl });
        }

        if (method === 'GET') {
            const categoryId = event.queryStringParameters?.categoryId;
            let Items;
            if (categoryId) {
                const result = await docClient.send(new QueryCommand({
                    TableName: process.env.PRODUCTS_TABLE,
                    IndexName: 'CategoryIndex',
                    KeyConditionExpression: 'categoryId = :c',
                    ExpressionAttributeValues: { ':c': categoryId }
                }));
                Items = result.Items;
            } else {
                const result = await docClient.send(new ScanCommand({ TableName: process.env.PRODUCTS_TABLE }));
                Items = result.Items;
            }
            return response(200, Items || []);
        }

        if (method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { productId, ...data } = body;
            if (!productId) return response(400, { message: 'Missing productId' });
            await docClient.send(new PutCommand({
                TableName: process.env.PRODUCTS_TABLE,
                Item: { productId, ...data, updatedAt: new Date().toISOString(), createdAt: data.createdAt || new Date().toISOString() }
            }));
            return response(200, { message: 'Product saved', productId });
        }

        if (method === 'DELETE') {
            const productId = event.queryStringParameters?.productId;
            if (!productId) return response(400, { message: 'Missing productId' });
            await docClient.send(new DeleteCommand({ TableName: process.env.PRODUCTS_TABLE, Key: { productId } }));
            return response(200, { message: 'Product deleted' });
        }

        return response(404, { message: 'Route not found' });
    } catch (e) {
        console.error('ProductsFunction error:', e);
        return response(500, { message: e.message });
    }
};

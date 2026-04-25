const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET;

exports.handler = async (event) => {
    console.log('Inventory Event:', JSON.stringify(event, null, 2));

    try {
        const method = event.requestContext.http.method;
        const path = event.requestContext.http.path;

        if (method === 'OPTIONS') {
            return response(200, { message: 'CORS OK' });
        }

        if (path.includes('/presigned-url')) {
            return await generatePresignedUrl(event);
        }

        if (path.startsWith('/inventory/categories')) {
            if (method === 'GET') return await getCategories();
            if (method === 'POST') return await upsertCategory(event);
            if (method === 'DELETE') return await permanentDeleteCategory(event);
        }

        if (path.startsWith('/inventory/products')) {
            if (method === 'GET') return await getProducts(event);
            if (method === 'POST') return await upsertProduct(event);
            if (method === 'DELETE') return await permanentDeleteProduct(event);
        }

        return response(404, { message: 'Route not found' });
    } catch (err) {
        console.error('Inventory Error:', err);
        return response(500, { message: err.message || 'Internal Server Error' });
    }
};

async function getCategories() {
    const params = { TableName: CATEGORIES_TABLE };
    const { Items } = await docClient.send(new ScanCommand(params));
    return response(200, Items || []);
}

async function upsertCategory(event) {
    const body = JSON.parse(event.body || '{}');
    const { categoryId, ...data } = body;
    if (!categoryId) return response(400, { message: 'Missing categoryId' });

    const item = {
        categoryId,
        ...data,
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString()
    };

    await docClient.send(new PutCommand({ TableName: CATEGORIES_TABLE, Item: item }));
    return response(200, { message: 'Category saved', categoryId });
}

async function permanentDeleteCategory(event) {
    const categoryId = event.queryStringParameters?.categoryId;
    if (!categoryId) return response(400, { message: 'Missing categoryId' });
    await docClient.send(new DeleteCommand({ TableName: CATEGORIES_TABLE, Key: { categoryId } }));
    return response(200, { message: 'Category permanently deleted' });
}

async function getProducts(event) {
    const categoryId = event.queryStringParameters?.categoryId;
    let Items;
    if (categoryId) {
        const params = { TableName: PRODUCTS_TABLE, IndexName: 'CategoryIndex', KeyConditionExpression: 'categoryId = :c', ExpressionAttributeValues: { ':c': categoryId } };
        const result = await docClient.send(new QueryCommand(params));
        Items = result.Items;
    } else {
        const result = await docClient.send(new ScanCommand({ TableName: PRODUCTS_TABLE }));
        Items = result.Items;
    }
    return response(200, Items || []);
}

async function upsertProduct(event) {
    const body = JSON.parse(event.body || '{}');
    const { productId, ...data } = body;
    if (!productId) return response(400, { message: 'Missing productId' });

    const item = {
        productId,
        ...data,
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString()
    };

    await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
    return response(200, { message: 'Product saved', productId });
}

async function permanentDeleteProduct(event) {
    const productId = event.queryStringParameters?.productId;
    if (!productId) return response(400, { message: 'Missing productId' });
    await docClient.send(new DeleteCommand({ TableName: PRODUCTS_TABLE, Key: { productId } }));
    return response(200, { message: 'Product permanently deleted' });
}

async function generatePresignedUrl(event) {
    const body = JSON.parse(event.body || '{}');
    const { fileName, fileType } = body;
    const key = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, ContentType: fileType });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const fileUrl = `https://${MEDIA_BUCKET}.s3.amazonaws.com/${key}`;
    return response(200, { uploadUrl, fileUrl });
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
        },
        body: JSON.stringify(body)
    };
}

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function response(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(body)
    };
}

exports.handler = async (event) => {
    try {
        const method = event.requestContext.http.method;

        if (method === 'GET') {
            const userId = event.queryStringParameters?.userId;
            if (!userId) return response(400, { message: 'Missing userId' });
            const { Item } = await docClient.send(new GetCommand({ TableName: process.env.USERS_TABLE, Key: { userId } }));
            return response(200, Item || {});
        }

        if (method === 'POST') {
            const { userId, ...profileData } = JSON.parse(event.body || '{}');
            if (!userId) return response(400, { message: 'Missing userId' });
            await docClient.send(new PutCommand({
                TableName: process.env.USERS_TABLE,
                Item: { userId, ...profileData, updatedAt: new Date().toISOString() }
            }));
            return response(200, { message: 'Profile updated successfully' });
        }

        return response(404, { message: 'Not found' });
    } catch (e) {
        console.error('ProfileFunction error:', e);
        return response(500, { message: e.message });
    }
};

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USERS_TABLE;

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        const routeKey = `${event.requestContext.http.method} ${event.requestContext.http.path}`;
        
        switch (routeKey) {
            case 'GET /profile':
                return await getProfile(event);
            case 'POST /profile':
                return await updateProfile(event);
            default:
                return response(404, { message: 'Not found' });
        }
    } catch (err) {
        console.error(err);
        return response(500, { message: 'Internal Server Error' });
    }
};

async function getProfile(event) {
    // In a real app with Cognito authorizer on API Gateway, you'd extract userId from the authorizer claims.
    // For this example without an authorizer yet, we expect userId in query parameters.
    const userId = event.queryStringParameters?.userId;
    
    if (!userId) return response(400, { message: 'Missing userId' });

    const params = {
        TableName: TABLE_NAME,
        Key: { userId }
    };

    const { Item } = await docClient.send(new GetCommand(params));
    
    return response(200, Item || {});
}

async function updateProfile(event) {
    const body = JSON.parse(event.body || '{}');
    const { userId, ...profileData } = body;

    if (!userId) return response(400, { message: 'Missing userId' });

    const params = {
        TableName: TABLE_NAME,
        Item: {
            userId,
            ...profileData,
            updatedAt: new Date().toISOString()
        }
    };

    await docClient.send(new PutCommand(params));
    
    return response(200, { message: 'Profile updated successfully' });
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // Required for CORS support to work
        },
        body: JSON.stringify(body)
    };
}

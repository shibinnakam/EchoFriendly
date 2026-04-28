const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function ok(body) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify(body) };
}

function err(statusCode, message) {
    return { statusCode, headers: CORS, body: JSON.stringify({ message }) };
}

module.exports = { ok, err };

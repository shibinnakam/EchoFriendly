import { CognitoUserPool, CognitoUser } from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId: 'us-east-1_SZ2YkwiZW', // Replace with your actual User Pool ID
    ClientId: '4sdi4gt03g0ais2mbsavfdp530'   // Replace with your actual Client ID
};

const userPool = new CognitoUserPool(poolData);

export const getAuthToken = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();
        if (!cognitoUser) return resolve(null);

        cognitoUser.getSession((err, session) => {
            if (err) {
                console.warn('Session retrieval failed:', err);
                return resolve(null);
            }
            if (session.isValid()) {
                resolve(session.getAccessToken().getJwtToken());
            } else {
                resolve(null);
            }
        });
    });
};

export const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
    window.location.href = '/';
};

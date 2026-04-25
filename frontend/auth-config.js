/* ============================================
   ECHOFRIENDLY — AUTH CONFIGURATION
   Centralized AWS Cognito & API Settings
   ============================================ */

const AUTH_CONFIG = {
    poolData: {
        UserPoolId: 'us-east-1_SZ2YkwiZW',
        ClientId: '4sdi4gt03g0ais2mbsavfdp530'
    },
    region: 'us-east-1',
    apiUrl: 'https://dw2z2yix5k.execute-api.us-east-1.amazonaws.com/',
    adminEmail: 'shibin@gmail.com'
};

// Export for module systems if needed, but we'll also attach to window for vanilla JS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AUTH_CONFIG;
} else {
    window.AUTH_CONFIG = AUTH_CONFIG;
}

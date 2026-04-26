/* ============================================
   ECHOFRIENDLY — AUTH CONFIGURATION
   Centralized AWS Cognito & API Settings
   ============================================ */

const AUTH_CONFIG = {
    poolData: {
        UserPoolId: 'ap-south-1_ZuiT8sted',
        ClientId: '5b8jcqhik3k0b5aostkbes8hig'
    },
    region: 'ap-south-1',
    apiUrl: 'https://sd2jkxbwqh.execute-api.ap-south-1.amazonaws.com/',
    adminEmail: 'shibin@gmail.com'
};

// Export for module systems if needed, but we'll also attach to window for vanilla JS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AUTH_CONFIG;
} else {
    window.AUTH_CONFIG = AUTH_CONFIG;
}

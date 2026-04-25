/* ============================================
   ECHOFRIENDLY — AUTH GUARD
   Prevents unauthorized access and flashing
   ============================================ */

(function () {
    'use strict';

    // 1. Immediately hide the entire page
    const hideStyle = document.createElement('style');
    hideStyle.id = 'auth-guard-lock';
    hideStyle.innerHTML = 'html { display: none !important; }';
    document.documentElement.appendChild(hideStyle);

    /**
     * Reveals the page content
     */
    function revealPage() {
        const lock = document.getElementById('auth-guard-lock');
        if (lock) lock.remove();
    }

    /**
     * Handles redirection to landing page
     */
    function redirectToLogin() {
        console.warn('Unauthorized access detected. Redirecting to landing page...');
        window.location.href = 'index.html';
    }

    /**
     * Core Guard Logic
     */
    function runGuard() {
        // Ensure Cognito and Config are available
        if (typeof AmazonCognitoIdentity === 'undefined' || !window.AUTH_CONFIG) {
            console.error('Auth Guard: Dependencies missing.');
            revealPage(); // Reveal so user can at least see something or error
            return;
        }

        const userPool = new AmazonCognitoIdentity.CognitoUserPool(window.AUTH_CONFIG.poolData);
        const user = userPool.getCurrentUser();
        const isAdminPage = window.location.pathname.includes('admin.html');
        const isUserPage = window.location.pathname.includes('user.html');
        const isLandingPage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '';

        if (!user) {
            // No user session at all
            if (isAdminPage || isUserPage) {
                // Special check for Admin Bypass (stored in localStorage)
                const bypassAdmin = localStorage.getItem('isAdmin') === 'true';
                if (isAdminPage && bypassAdmin) {
                    console.log('Auth Guard: Admin bypass detected.');
                    revealPage();
                    return;
                }
                redirectToLogin();
            } else {
                // Not a protected page
                revealPage();
            }
            return;
        }

        // Check session validity
        user.getSession((err, session) => {
            if (err || !session.isValid()) {
                if (isAdminPage || isUserPage) {
                    redirectToLogin();
                } else {
                    revealPage();
                }
                return;
            }

            // User is logged in. 
            
            // If on landing page, redirect to appropriate dashboard
            if (isLandingPage) {
                const email = session.getIdToken().payload.email;
                if (email === window.AUTH_CONFIG.adminEmail) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'user.html';
                }
                return;
            }

            // Now check role if it's admin page.
            if (isAdminPage) {
                const email = session.getIdToken().payload.email;
                const bypassAdmin = localStorage.getItem('isAdmin') === 'true';
                
                if (email === window.AUTH_CONFIG.adminEmail || bypassAdmin) {
                    console.log('Auth Guard: Admin authorized.');
                    revealPage();
                } else {
                    console.warn('Auth Guard: Non-admin tried to access admin page.');
                    redirectToLogin();
                }
            } else {
                // User is logged in and it's either user page or public page
                console.log('Auth Guard: User authorized.');
                revealPage();
            }
        });
    }

    // Wait for DOM to be parsed enough to have head, but don't wait for onload
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runGuard);
    } else {
        runGuard();
    }

    // Safety timeout: If guard takes too long (e.g. network error with Cognito), reveal anyway
    // but this shouldn't happen as Cognito SDK usually works with local data first.
    setTimeout(revealPage, 5000);

})();

/* ============================================
   ECHOFRIENDLY — AUTH GUARD
   Prevents unauthorized access and flashing
   ============================================ */

(function () {
    'use strict';

    // 1. Immediately hide the entire page to prevent flashing
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
        
        // Remove the loading class to reveal body and hide preloader
        document.documentElement.classList.remove('auth-loading');
        document.documentElement.classList.remove('protected-page');
    }

    /**
     * Handles redirection to landing page
     */
    function redirectToLogin() {
        console.warn('Unauthorized access detected. Redirecting to landing page...');
        // We use window.location.origin to ensure it works on any domain (Netlify, localhost, etc.)
        window.location.href = window.location.origin + '/index.html';
    }

    /**
     * Core Guard Logic
     */
    function runGuard() {
        // Ensure Cognito and Config are available
        if (typeof AmazonCognitoIdentity === 'undefined' || !window.AUTH_CONFIG) {
            console.error('Auth Guard: Dependencies missing. Retrying...');
            // If they aren't loaded yet, wait a bit
            setTimeout(runGuard, 100);
            return;
        }

        const userPool = new AmazonCognitoIdentity.CognitoUserPool(window.AUTH_CONFIG.poolData);
        const user = userPool.getCurrentUser();
        
        // Better path detection for various hosting (Netlify, etc.)
        const url = window.location.href.toLowerCase();
        const isAdminPage = url.includes('admin');
        const isUserPage = url.includes('user');
        const isLandingPage = url.endsWith('/') || url.includes('index.html') || url.split('/').pop() === '';

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
                    window.location.href = window.location.origin + '/admin.html';
                } else {
                    window.location.href = window.location.origin + '/user.html';
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

    // Execute immediately if head is ready, otherwise wait for DOM
    if (document.head) {
        runGuard();
    } else {
        const observer = new MutationObserver((mutations, obs) => {
            if (document.head) {
                runGuard();
                obs.disconnect();
            }
        });
        observer.observe(document.documentElement, { childList: true });
    }

    // Safety timeout: If guard takes too long, reveal anyway to prevent black screen forever
    setTimeout(revealPage, 5000);

})();

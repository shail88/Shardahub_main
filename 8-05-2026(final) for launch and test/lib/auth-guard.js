/**
 * ShardaHub Auth Guard
 * =====================
 * Include this script in ANY page that requires the user to be logged in.
 * It automatically redirects unauthenticated users to the login page,
 * and stores their intended destination for post-login redirect.
 *
 * Usage:
 *   <script src="/lib/supabase.js"></script>
 *   <script src="/lib/auth-guard.js" data-redirect="/login.html"></script>
 */

(async function () {
    const redirectTo = document.currentScript?.getAttribute('data-redirect') || '/login.html';
    const requiredFeature = document.currentScript?.getAttribute('data-feature') || null;
    const requiredRole = document.currentScript?.getAttribute('data-role') || null;

    // Wait for Supabase to be available
    let client = null;
    let attempts = 0;
    while (!client && attempts < 20) {
        client = window.getSupabase ? window.getSupabase() : null;
        if (!client) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
    }

    if (!client) {
        console.error('[AuthGuard] Supabase client not available. Check script load order.');
        return;
    }

    const { data: { session }, error } = await client.auth.getSession();

    if (error || !session) {
        // Save current URL so we can redirect back after login
        sessionStorage.setItem('sharda_redirect_after_login', window.location.href);
        window.location.href = redirectTo;
        return;
    }

    // Make session user available globally
    window.currentUser = session.user;
    window.currentSession = session;

    // Optional role/feature check
    if (requiredRole || requiredFeature) {
        const { data: userData } = await client
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        const userRole = userData?.role || 'Registered';
        window.currentUserRole = userRole;

        const ROLE_HIERARCHY = {
            'Guest': 0, 'Registered': 1, 'Student': 2,
            'Subscriber': 3, 'Pro': 4, 'Admin': 99
        };

        const FEATURE_PERMISSIONS = {
            'ai:use': ['Pro', 'Admin'],
            'course:enroll_paid': ['Student', 'Subscriber', 'Pro', 'Admin'],
            'course:enroll_free': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
            'game:play_premium': ['Subscriber', 'Pro', 'Admin'],
            'template:purchase': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
            'admin:panel': ['Admin'],
            'dashboard:view': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin']
        };

        if (requiredRole) {
            const userLevel = ROLE_HIERARCHY[userRole] || 0;
            const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
            if (userLevel < requiredLevel) {
                window.location.href = '/upgrade.html';
                return;
            }
        }

        if (requiredFeature) {
            const allowed = (FEATURE_PERMISSIONS[requiredFeature] || []).includes(userRole);
            if (!allowed) {
                window.location.href = '/upgrade.html';
                return;
            }
        }
    }

    console.log('[AuthGuard] ✅ Access granted to:', session.user.email);
})();

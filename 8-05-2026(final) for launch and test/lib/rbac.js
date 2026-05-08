/**
 * ShardaHub Role-Based Access Control (RBAC)
 * ============================================
 * Controls what users can see and do based on their role.
 *
 * Roles (in ascending hierarchy):
 *   Guest → Registered → Student → Subscriber → Pro → Admin
 *
 * Usage:
 *   Include after supabase.js on any page.
 *   Call window.RBAC.applyUIPermissions(userRole) after page loads.
 *
 * HTML Integration:
 *   <button data-require-feature="ai:use">Use AI</button>
 *   <a data-require-role="Admin" href="/admin/">Admin</a>
 */

window.RBAC = (function () {

    const ROLE_HIERARCHY = {
        'Guest': 0,
        'Registered': 1,
        'Student': 2,
        'Subscriber': 3,
        'Pro': 4,
        'Admin': 99
    };

    const FEATURE_PERMISSIONS = {
        'ai:use': ['Pro', 'Admin'],
        'ai:unlimited': ['Admin'],
        'course:enroll_free': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
        'course:enroll_paid': ['Student', 'Subscriber', 'Pro', 'Admin'],
        'course:certificate': ['Student', 'Subscriber', 'Pro', 'Admin'],
        'game:play_free': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
        'game:play_premium': ['Subscriber', 'Pro', 'Admin'],
        'template:view': ['Guest', 'Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
        'template:purchase': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
        'robotics:purchase': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
        'dashboard:view': ['Registered', 'Student', 'Subscriber', 'Pro', 'Admin'],
        'admin:panel': ['Admin'],
        'admin:users': ['Admin'],
        'admin:products': ['Admin']
    };

    return {
        /**
         * Check if a role has at least the required hierarchy level
         * @param {string} userRole
         * @param {string} requiredRole
         * @returns {boolean}
         */
        hasRole(userRole, requiredRole) {
            const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
            const reqLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
            return userLevel >= reqLevel;
        },

        /**
         * Check if a role has permission for a specific feature
         * @param {string} userRole
         * @param {string} feature
         * @returns {boolean}
         */
        can(userRole, feature) {
            const allowed = FEATURE_PERMISSIONS[feature];
            if (!allowed) {
                console.warn(`[RBAC] Unknown feature: "${feature}"`);
                return false;
            }
            return allowed.includes(userRole);
        },

        /**
         * Get the current user's role from Supabase
         * @returns {Promise<string>}
         */
        async getUserRole() {
            const client = window.getSupabase();
            if (!client) return 'Guest';

            const { data: { session } } = await client.auth.getSession();
            if (!session) return 'Guest';

            const { data: userData } = await client
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            return userData?.role || 'Registered';
        },

        /**
         * Apply UI permissions — hides/locks elements based on role.
         * Call this after the page loads and you know the user's role.
         * @param {string} userRole
         */
        applyUIPermissions(userRole) {
            // Hide elements requiring a specific role
            document.querySelectorAll('[data-require-role]').forEach(el => {
                const required = el.getAttribute('data-require-role');
                if (!this.hasRole(userRole, required)) {
                    el.style.display = 'none';
                }
            });

            // Lock/show elements requiring a specific feature
            document.querySelectorAll('[data-require-feature]').forEach(el => {
                const feature = el.getAttribute('data-require-feature');
                if (!this.can(userRole, feature)) {
                    el.classList.add('sharda-locked');
                    el.setAttribute('title', '🔒 Upgrade your plan to unlock this feature');
                    el.style.opacity = '0.5';
                    el.style.cursor = 'not-allowed';
                    el.style.pointerEvents = 'none';

                    // Add lock icon if it's a button
                    if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                        const originalText = el.textContent;
                        el.textContent = '🔒 ' + originalText;
                    }
                }
            });

            // Show elements only for specific features (hidden by default)
            document.querySelectorAll('[data-show-if-feature]').forEach(el => {
                const feature = el.getAttribute('data-show-if-feature');
                if (this.can(userRole, feature)) {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            });

            // Add current role class to body for CSS targeting
            document.body.classList.add('role-' + userRole.toLowerCase());
        },

        /**
         * Full page protection: verifies session + role, redirects if not authorized.
         * @param {string|null} requiredFeature - feature key like 'admin:panel'
         * @param {string} redirectUrl - where to redirect if not authorized
         * @returns {Promise<{user, role}|null>}
         */
        async protectPage(requiredFeature = null, redirectUrl = '/login.html') {
            const client = window.getSupabase();
            if (!client) {
                window.location.href = redirectUrl;
                return null;
            }

            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                sessionStorage.setItem('sharda_redirect_after_login', window.location.href);
                window.location.href = redirectUrl;
                return null;
            }

            const role = await this.getUserRole();
            window.currentUserRole = role;
            window.currentUser = session.user;

            if (requiredFeature && !this.can(role, requiredFeature)) {
                window.location.href = '/upgrade.html';
                return null;
            }

            this.applyUIPermissions(role);
            return { user: session.user, role };
        }
    };
})();

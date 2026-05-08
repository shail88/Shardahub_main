/**
 * ShardaHub Subpass SSO Handler (Production-Grade)
 * Handles unified login state and multi-role flags.
 */
// Use var to allow re-declaration if script is loaded twice
var SubpassAuth = window.SubpassAuth || {
    // Current user and metadata
    user: null,
    metadata: null,
    _resolveReady: null,
    ready: null,

    init() {
        if (this._initialized) return;
        this._initialized = true;

        // If ready wasn't created yet for some reason, create it
        if (!this.ready) {
            this.ready = new Promise(resolve => { this._resolveReady = resolve; });
        }

        console.log("ShardaHub Production Auth Initialized");
        this.checkAuthState();
    },

    async checkAuthState() {
        var supabase = window.getSupabase();
        if (!supabase) {
            console.warn("Auth System: Supabase client not available. Initialization halted.");
            if (this._resolveReady) this._resolveReady();
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                this.user = session.user;

                // Use limit(1) instead of single() to avoid 406/Coercion errors if row is missing
                const { data: profiles, error } = await supabase
                    .from('users')
                    .select('id, full_name, avatar_url, role')
                    .eq('id', session.user.id)
                    .limit(1);

                if (error) {
                    console.warn("Auth: DB query error:", error.message);
                }

                const profile = (profiles && profiles.length > 0) ? profiles[0] : null;

                if (!profile) {
                    console.warn("Auth: Profile row missing in 'public.users'. Role defaulting to 'Registered'.");
                }

                // fallback assignments
                this.user.role = profile?.role || 'Registered';
                this.user.full_name = profile?.full_name || session.user.user_metadata?.full_name || 'Sharda User';
                this.user.avatar = profile?.avatar_url || session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.full_name)}&background=0ea5e9&color=fff`;

                console.log("Auth System: User Identity Resolved", { email: this.user.email, role: this.user.role });
            } else {
                this.user = null;
                this.metadata = null;
                console.log("Auth System: No active session.");
            }
        } catch (err) {
            console.error("Auth System: Fatal error during state check", err);
            this.user = null;
        }

        this.updateUI();
        if (this._resolveReady) this._resolveReady();
    },

    async login(email, password) {
        const { data, error } = await window.shardaHubAuth.signIn(email, password);
        if (error) return { success: false, error: error.message };
        await this.checkAuthState();
        return { success: true };
    },

    async signup(email, password, name) {
        const { data, error } = await window.shardaHubAuth.signUp(email, password, name);
        if (error) return { success: false, error: error.message };
        await this.checkAuthState();
        return { success: true };
    },

    // Universal Access Helper
    hasRole(requiredRole) {
        if (!this.user) return requiredRole === 'Guest';

        // Use the profile subscription_plan or default
        const currentRole = this.metadata ? this.metadata.subscription_plan : 'Registered';

        if (currentRole === 'Admin') return true;

        const hierarchy = ['Guest', 'Registered', 'Student', 'Subscriber', 'Pro', 'Admin'];
        return hierarchy.indexOf(currentRole) >= hierarchy.indexOf(requiredRole);
    },

    updateUI() {
        // Dispatch event for components to react
        document.dispatchEvent(new CustomEvent('sharda-auth-updated', {
            detail: { user: this.user, metadata: this.metadata }
        }));
    },

    async logout() {
        const supabase = window.getSupabase();
        if (supabase) await supabase.auth.signOut();
        this.user = null;
        this.metadata = null;
        this.updateUI();
        window.location.href = (window.ShardaBaseUrl || './') + 'index.html';
    },

    // Trigger Modals
    showLogin() { document.dispatchEvent(new Event('sharda-show-login')); },
    showSignup() { document.dispatchEvent(new Event('sharda-show-signup')); }
};

// Listen for auth changes
const client = window.getSupabase();
if (client) {
    client.auth.onAuthStateChange((event, session) => {
        if (window.SubpassAuth) window.SubpassAuth.checkAuthState();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SubpassAuth.init());
} else {
    SubpassAuth.init();
}
window.SubpassAuth = SubpassAuth;

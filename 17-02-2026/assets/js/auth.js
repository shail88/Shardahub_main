/**
 * ShardaHub Subpass SSO Handler (Production-Grade)
 * Handles unified login state and multi-role flags.
 */
// Use var to allow re-declaration if script is loaded twice
var SubpassAuth = window.SubpassAuth || {
    // Current user and metadata
    user: null,
    metadata: null,

    init() {
        if (this._initialized) return;
        this._initialized = true;
        console.log("ShardaHub Production Auth Initialized");
        this.checkAuthState();
    },

    async checkAuthState() {
        var supabase = window.getSupabase();
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.user = session.user;
            // Fetch profile data from user_profiles table
            const { data: profile, error } = await supabase
                .from('users')
                .select('*, user_profiles(*)')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                this.metadata = { ...profile, ...profile.user_profiles };
            }

            // Enrich user object for UI components
            this.user.full_name = profile?.full_name || session.user.user_metadata?.full_name || 'Sharda User';
            this.user.avatar = profile?.avatar_url || session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.full_name)}&background=0ea5e9&color=fff`;
            this.user.role = profile?.subscription_plan || 'Registered';
        } else {
            this.user = null;
            this.metadata = null;
        }
        this.updateUI();
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
        await supabase.auth.signOut();
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

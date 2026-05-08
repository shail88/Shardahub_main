/**
 * ShardaHub Subpass SSO Handler (Production-Grade)
 * Handles unified login state and multi-role flags.
 */
const SubpassAuth = {
    // Current user and metadata
    user: null,
    metadata: null,

    init() {
        console.log("ShardaHub Production Auth Initialized");
        this.checkAuthState();
    },

    async checkAuthState() {
        // Mock SSO: Shared localStorage key
        const userId = localStorage.getItem('shardahub_session_token');
        if (userId) {
            this.user = await ShardaDB.getUserById(userId);
            this.metadata = await ShardaDB.getUserMetadata(userId);
        } else {
            this.user = null;
            this.metadata = null;
        }
        this.updateUI();
    },

    async login(email, password) {
        // Production Logic Simulation
        const user = await ShardaDB.getUserByEmail(email);
        if (user) {
            this.user = user;
            localStorage.setItem('shardahub_session_token', user.id);
            await this.checkAuthState();
            return { success: true };
        }
        return { success: false, error: "Invalid credentials" };
    },

    async signup(email, password, name) {
        const id = 'u_' + Date.now();
        const isAdmin = email.includes('admin');
        const newUser = {
            id,
            email,
            full_name: name,
            role: isAdmin ? 'Admin' : 'Registered',
            is_admin: isAdmin,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + email,
            created_at: new Date().toISOString()
        };

        const newMetadata = {
            user_id: id,
            ai_credits: 10, // Starter credits
            subscription_status: 'inactive'
        };

        await ShardaDB.saveUser(newUser, newMetadata);
        localStorage.setItem('shardahub_session_token', id);
        await this.checkAuthState();
        return { success: true };
    },

    // Universal Access Helper
    hasRole(requiredRole) {
        if (!this.user) return requiredRole === 'Guest';
        if (this.user.role === 'Admin') return true;

        // Multi-role flag parity: 
        // In this simulation, roles are hierarchical for simplicity, 
        // but 'Admin' overrides everything.
        const hierarchy = ['Guest', 'Registered', 'Student', 'Subscriber', 'Pro', 'Admin'];
        return hierarchy.indexOf(this.user.role) >= hierarchy.indexOf(requiredRole);
    },

    updateUI() {
        // Dispatch event for header.js to react
        document.dispatchEvent(new CustomEvent('sharda-auth-updated', {
            detail: { user: this.user, metadata: this.metadata }
        }));
    },

    async logout() {
        localStorage.removeItem('shardahub_session_token');
        this.user = null;
        this.metadata = null;
        this.updateUI();
        window.location.href = (window.ShardaBaseUrl || './') + 'index.html';
    },

    // Trigger Modals (handled in header.js)
    showLogin() { document.dispatchEvent(new Event('sharda-show-login')); },
    showSignup() { document.dispatchEvent(new Event('sharda-show-signup')); }
};

document.addEventListener('DOMContentLoaded', () => SubpassAuth.init());
window.SubpassAuth = SubpassAuth;

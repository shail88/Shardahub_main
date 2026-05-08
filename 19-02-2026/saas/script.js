const SaaSModule = {
    init() {
        console.log("SaaS Module Initialized");
        this.loadSaaSPlans();
    },

    async loadSaaSPlans() {
        const grid = document.getElementById('saas-grid');
        if (!grid) return;

        try {
            const { data: products } = await window.shardaHubData.fetchProducts();
            const saasPlans = products ? products.filter(p => p.categories?.slug === 'saas') : [];

            if (saasPlans.length > 0) {
                grid.innerHTML = saasPlans.map(p => `
                    <div class="col-md-4">
                        <div class="glass p-4 rounded-4 h-100 border border-secondary interactive-card">
                            <i class="bi ${p.icon || 'bi-cloud-check'} display-4 text-warning mb-3 d-block"></i>
                            <h4 class="fw-bold text-white">${p.title}</h4>
                            <p class="text-secondary small mb-4">${p.tagline || 'Expert business solution'}</p>
                            <div class="mb-4">
                                <span class="h2 fw-bold text-white">₹${(p.price_inr || 0).toLocaleString()}</span>
                                <span class="text-secondary">/mo</span>
                            </div>
                            <button class="btn btn-warning w-100 rounded-pill fw-bold" 
                                onclick="window.location.href='../product.html?id=${p.id}'">View Plans</button>
                        </div>
                    </div>
                `).join('');
            } else {
                grid.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No SaaS plans currently active.</div>';
            }
        } catch (e) {
            console.error("SaaS plans load error:", e);
        }
    },

    async enterDashboard() {
        if (!SubpassAuth.user) {
            alert("Login required to access SaaS tools.");
            window.location.href = '../login.html';
            return;
        }

        const meta = await ShardaDB.getUserMetadata(SubpassAuth.user.id);
        if (meta.subscription_status === 'active' && meta.subscription_plan === 'SaaS') {
            alert("Welcome to your SaaS Admin Dashboard!");
            // Redirect to dashboard page
        } else {
            alert("Active SaaS Subscription required. Redirecting to Shop...");
            window.location.href = '../shop/index.html';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => SaaSModule.init());

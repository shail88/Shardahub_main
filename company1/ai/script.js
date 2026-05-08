const AIModule = {
    // Default tier limits (if not specified in DB)
    tierLimits: {
        'Free': 5,
        'Basic': 50,
        'Advance': -1 // Unlimited
    },

    init() {
        console.log("ShardaAI Module Initialized");
        this.updateAILimitsDisplay();
        this.loadAITools();
    },

    async loadAITools() {
        const grid = document.getElementById('ai-tools-grid');
        if (!grid) return;

        try {
            const products = await ShardaDB.getProducts('ai');
            if (products && products.length > 0) {
                grid.innerHTML = products.map(p => {
                    const tiers = p.product_tiers || [];
                    const hasFree = tiers.some(t => t.name.toLowerCase().includes('free') || t.is_free);
                    const hasBasic = tiers.some(t => t.name.toLowerCase().includes('basic'));
                    const hasAdvance = tiers.some(t => t.name.toLowerCase().includes('advance') || t.name.toLowerCase().includes('pro'));

                    return `
                    <div class="col-md-3">
                        <div class="glass p-4 rounded-4 h-100 text-center tool-card interactive-card">
                            <div class="d-flex justify-content-center gap-1 mb-2">
                                ${hasFree ? '<span class="badge bg-secondary-subtle text-secondary x-small">Free</span>' : ''}
                                ${hasBasic ? '<span class="badge bg-info-subtle text-info x-small">Basic</span>' : ''}
                                ${hasAdvance ? '<span class="badge bg-warning-subtle text-warning x-small">Advance</span>' : ''}
                            </div>
                            <i class="bi ${p.icon || 'bi-robot'} display-5 text-info mb-3 d-block"></i>
                            <h4 class="fw-bold text-white mb-1">${p.title}</h4>
                            <p class="small text-secondary card-tagline">${p.tagline || 'Next-gen tool'}</p>
                            <div class="d-flex flex-column gap-2 mt-3">
                                <button class="btn btn-info w-100 rounded-pill fw-bold" 
                                    onclick="AIModule.handleToolAction('${p.id}', '${p.product_type}')">
                                    Launch Tool
                                </button>
                                <button class="btn btn-sm btn-outline-secondary w-100 rounded-pill border-0" 
                                    onclick="window.location.href='../product.html?id=${p.id}'">
                                    Compare Tiers
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                }).join('');
            } else {
                grid.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No AI tools currently available in the catalog.</div>';
            }
        } catch (e) {
            console.error("AI tools load error:", e);
        }
    },

    async updateAILimitsDisplay() {
        const user = SubpassAuth.user;
        const container = document.getElementById('ai-credit-count');
        if (!container) return;

        if (!user) {
            container.innerHTML = '<span class="text-secondary small">Login to track limits</span>';
            return;
        }

        try {
            const usageToday = await ShardaDB.getAIUsageToday(user.id);
            const sub = await ShardaDB.getActiveSubscription(user.id, 'ai-product'); // or the actual slug

            // Try to find ANY AI subscription if 'ai-product' slug fails
            let activeSub = sub;
            if (!activeSub) {
                const subs = await ShardaDB.getUserSubscriptions(user.id);
                activeSub = subs.find(s => s.products?.product_type === 'ai' && s.status === 'active');
            }

            const planName = activeSub?.plan_name || 'Free';
            const limit = activeSub?.product_tiers?.daily_limit || this.tierLimits[planName] || 5;
            const limitText = limit === -1 ? 'Unlimited' : limit;

            container.innerHTML = `
                <div class="d-flex align-items-center gap-3">
                    <div class="badge bg-info text-dark rounded-pill px-3">${planName} Plan</div>
                    <span class="text-white small">${usageToday} / ${limitText} daily uses</span>
                </div>
            `;
        } catch (err) {
            console.warn("Could not load AI limits:", err);
        }
    },

    async handleToolAction(toolId, type) {
        if (!SubpassAuth.user) {
            alert("Please login to use AI Tools.");
            window.location.href = '../login.html';
            return;
        }

        const user = SubpassAuth.user;

        // 1. Get current usage
        const usageToday = await ShardaDB.getAIUsageToday(user.id);

        // 2. Get active subscription
        const subs = await ShardaDB.getUserSubscriptions(user.id);
        const aiSub = subs.find(s => s.products?.product_type === 'ai' && s.status === 'active');

        const planName = aiSub?.plan_name || 'Free';
        const limit = aiSub?.product_tiers?.daily_limit || this.tierLimits[planName] || 5;

        // 3. Check condition
        if (limit !== -1 && usageToday >= limit) {
            alert(`Daily limit reached for ${planName} plan. Upgrade to Basic or Advance for more tools!`);
            window.location.href = '../product.html?id=ai-ecosystem'; // Redirect to a page where they can upgrade
            return;
        }

        // 4. Record usage
        await ShardaDB.logAIGeneration(user.id, toolId, "Using ShardaAI Web Tool");

        // 5. Update UI & Feedback
        this.updateAILimitsDisplay();
        alert(`Launching ${toolId}... (Logged under ${planName} limit)`);

        // Normally you'd open the actual tool page here
        // window.location.href = `tools/${toolId}.html`;
    }
};

document.addEventListener('DOMContentLoaded', () => AIModule.init());
document.addEventListener('sharda-auth-updated', () => AIModule.updateAILimitsDisplay());


const AIModule = {
    init() {
        console.log("AI Module Initialized");
        this.updateCreditDisplay();
        this.loadAITools();
    },

    async loadAITools() {
        const grid = document.getElementById('ai-tools-grid');
        if (!grid) return;

        try {
            const { data: products } = await window.shardaHubData.fetchProducts();
            const aiTools = products ? products.filter(p => p.categories?.slug === 'ai') : [];

            if (aiTools.length > 0) {
                grid.innerHTML = aiTools.map(p => `
                    <div class="col-md-3">
                        <div class="glass p-4 rounded-4 h-100 text-center tool-card interactive-card">
                            <i class="bi ${p.icon || 'bi-robot'} display-5 text-info mb-3 d-block"></i>
                            <h4 class="fw-bold text-white">${p.title}</h4>
                            <p class="small text-secondary">${p.tagline || 'Next-gen tool'}</p>
                            <div class="d-flex flex-column gap-2 mt-3">
                                ${this.renderToolButtons(p)}
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                grid.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No AI tools currently available in the catalog.</div>';
            }
        } catch (e) {
            console.error("AI tools load error:", e);
            grid.innerHTML = '<div class="col-12 text-center py-5 text-danger">Failed to load AI tools.</div>';
        }
    },

    async updateCreditDisplay() {
        if (SubpassAuth.user) {
            const meta = await ShardaDB.getUserMetadata(SubpassAuth.user.id);
            const container = document.getElementById('ai-credit-count');
            if (container) container.innerText = `${meta.ai_credits} Credits remaining`;
        }
    },

    renderToolButtons(product) {
        const tiers = product.product_tiers || [];
        const freeTier = tiers.find(t => t.name.toLowerCase() === 'free');
        const paidTier = tiers.find(t => t.name.toLowerCase() !== 'free');

        let buttons = '';

        if (freeTier) {
            buttons += `<button class="btn btn-info w-100 rounded-pill fw-bold mb-2" 
                onclick="AIModule.openTool('${product.id}', '${freeTier.action_url}', true)">
                Try Free
            </button>`;
        }

        if (paidTier) {
            buttons += `<button class="btn btn-sm btn-outline-info w-100 rounded-pill" 
                onclick="window.location.href='../product.html?id=${product.slug || product.id}'">
                Get Pro
            </button>`;
        } else if (!freeTier) {
            buttons += `<button class="btn btn-info w-100 rounded-pill fw-bold" 
                onclick="window.location.href='../product.html?id=${product.slug || product.id}'">
                View Details
            </button>`;
        }
        return buttons;
    },

    async openTool(toolId, actionUrl, isFree) {
        if (isFree) {
            if (actionUrl) {
                window.open(actionUrl, '_blank');
            } else {
                // Fallback to internal tool logic if no external URL
                this.useTool(toolId, false);
            }
            return;
        }
        // Logic for paid tools handled via product details page for now
    },

    async useTool(toolId, isPro = false) {
        if (!SubpassAuth.user) {
            alert("Login required to use ShardaAI tools.");
            window.location.href = '../login.html';
            return;
        }

        if (isPro && !SubpassAuth.hasRole('Pro')) {
            alert("This is a Pro Tool. Upgrade to ShardaHub Pro to unlock.");
            return;
        }

        const success = await ShardaDB.deductAICredit(SubpassAuth.user.id);
        if (success) {
            alert(`Using tool: ${toolId}. 1 Credit deducted.`);
            this.updateCreditDisplay();
        } else {
            alert("Insufficient credits. Please purchase more AI credits at the shop.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AIModule.init());
document.addEventListener('sharda-auth-updated', () => AIModule.updateCreditDisplay());

/**
 * ShardaHub Templates Module Logic
 */
const TemplatesModule = {
    init() {
        console.log("Templates Module Initialized");
        this.loadTemplates();
    },

    async loadTemplates() {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;

        try {
            const { data: products } = await window.shardaHubData.fetchProducts();
            const templates = products ? products.filter(p => p.categories?.slug === 'templates') : [];

            if (templates.length > 0) {
                grid.innerHTML = templates.map(p => `
                    <div class="col-md-4">
                        <div class="glass p-4 rounded-4 h-100 template-card d-flex flex-column">
                            <div class="preview-pane text-center py-5 bg-dark bg-opacity-25 rounded-4 mb-3">
                                <i class="bi ${p.icon || 'bi-window-sidebar'} display-1 text-secondary opacity-25"></i>
                            </div>
                            <h4 class="fw-bold text-white">${p.title}</h4>
                            <p class="small text-secondary">${p.tagline || 'Premium digital asset'}</p>
                            <div class="mt-auto">
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <span class="h5 mb-0 fw-bold text-info">₹${(p.price_inr || 0).toLocaleString()}</span>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-sm btn-outline-info rounded-pill" onclick="window.location.href='../product.html?id=${p.id}'">
                                            Info
                                        </button>
                                        <button class="btn btn-sm btn-warning rounded-pill px-3 fw-bold" 
                                            onclick="ShardaPayments.addToCart({id: '${p.id}', name: '${p.title}', price: ${p.price_inr || 0}, icon: '${p.icon || 'bi-box'}'}); window.location.href='../checkout.html'">
                                            Buy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                grid.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No templates available in the catalog yet.</div>';
            }
        } catch (e) {
            console.error("Templates load error:", e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => TemplatesModule.init());

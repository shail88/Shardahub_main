/**
 * ShardaHub Shop Module Logic
 * Fetches products from Supabase and renders them dynamically.
 */
const ShopModule = {
    async init() {
        console.log("Shop Module Initialized");
        const grid = document.getElementById('product-grid');
        if (!grid) return;

        grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-info" role="status"></div><p class="mt-2 text-secondary">Loading official gear...</p></div>';

        const { data: products, error } = await window.shardaHubData.fetchProducts();

        if (error || !products) {
            console.error("Shop load failed:", error);
            grid.innerHTML = '<div class="col-12 text-center py-5 text-danger">Failed to load shop products. Check your connection.</div>';
            return;
        }

        // Filter out ecosystem-specific products (AI, Courses, etc.)
        const ecosystemSlugs = ['education', 'ai', 'saas', 'robotics', 'games', 'templates'];
        const shopProducts = products.filter(p => !p.categories || !ecosystemSlugs.includes(p.categories.slug));

        if (shopProducts.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No general products found. Visit other sections for specialized tools.</div>';
            return;
        }

        this.renderProducts(shopProducts);
    },

    renderProducts(products) {
        const grid = document.getElementById('product-grid');
        if (products.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No products found in the ecosystem.</div>';
            return;
        }

        grid.innerHTML = products.map(p => {
            const icon = p.meta_data?.icon || 'bi-box';
            const price = p.price || 0;
            const detailUrl = `../product.html?id=${p.slug}`;

            return `
                <div class="col-md-3">
                    <div class="glass p-0 overflow-hidden rounded-4 h-100 border border-secondary interactive-card">
                        <a href="${detailUrl}" class="text-decoration-none">
                            <div style="height: 180px; background: rgba(30, 41, 59, 0.5); display: flex; align-items: center; justify-content: center;">
                                <i class="bi ${icon} display-1 text-info opacity-25"></i>
                            </div>
                        </a>
                        <div class="p-4">
                            <a href="${detailUrl}" class="text-decoration-none">
                                <h5 class="fw-bold text-white">${p.title}</h5>
                            </a>
                            <p class="small text-secondary text-truncate">${p.tagline || 'Expert ShardaHub Solution'}</p>
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <span class="fw-bold text-info">₹${price.toLocaleString()}</span>
                                <div class="d-flex gap-2">
                                    <button class="btn btn-sm btn-outline-info rounded-pill px-3"
                                        onclick="ShardaPayments.addToCart({id: '${p.id}', name: '${p.title}', price: ${price}, icon: '${icon}'})">
                                        <i class="bi bi-cart-plus"></i>
                                    </button>
                                    <button class="btn btn-sm btn-info rounded-pill px-3 fw-bold"
                                        onclick="ShardaPayments.addToCart({id: '${p.id}', name: '${p.title}', price: ${price}, icon: '${icon}'}); window.location.href='../checkout.html'">
                                        Buy
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => ShopModule.init());

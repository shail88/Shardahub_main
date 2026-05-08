/**
 * ShardaHub Robotics Module Logic
 */
const RoboticsModule = {
    init() {
        console.log("Robotics Module Initialized");
        this.loadRoboticsProducts();
    },

    async loadRoboticsProducts() {
        const grid = document.getElementById('robotics-grid');
        if (!grid) return;

        try {
            const { data: products } = await window.shardaHubData.fetchProducts();
            const robotics = products ? products.filter(p => p.categories?.slug === 'robotics') : [];

            if (robotics.length > 0) {
                grid.innerHTML = robotics.map(p => `
                    <div class="col-md-4">
                        <div class="glass p-4 rounded-4 h-100 text-center interactive-card">
                            <i class="bi ${p.icon || 'bi-cpu'} display-4 text-info mb-3 d-block"></i>
                            <h4 class="fw-bold text-white">${p.title}</h4>
                            <p class="text-secondary small">${p.tagline || 'Next-gen robotics'}</p>
                            <div class="h4 fw-bold text-info my-3">₹${(p.price_inr || 0).toLocaleString()}</div>
                            <button class="btn btn-outline-info w-100 rounded-pill" 
                                onclick="window.location.href='../product.html?id=${p.id}'">View Specs</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            console.error("Robotics load error:", e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => RoboticsModule.init());

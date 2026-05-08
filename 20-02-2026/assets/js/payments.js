/**
 * ShardaHub Razorpay & Cart Handler
 */
const ShardaPayments = {
    config: {
        key: 'rzp_test_placeholder', // User should replace with real key
        company_name: 'ShardaHub'
    },

    // Cart Management
    getCart() {
        return JSON.parse(localStorage.getItem('shardahub_cart') || '[]');
    },

    addToCart(product) {
        const cart = this.getCart();
        cart.push(product);
        localStorage.setItem('shardahub_cart', JSON.stringify(cart));
        console.log('Cart Updated:', cart);
        this.updateCartBadge();
        this.renderCartSidebar();

        // Automatically open the cart sidebar
        const cartSidebarEl = document.getElementById('cartSidebar');
        if (cartSidebarEl && typeof bootstrap !== 'undefined') {
            const bsOffcanvas = bootstrap.Offcanvas.getInstance(cartSidebarEl) || new bootstrap.Offcanvas(cartSidebarEl);
            bsOffcanvas.show();
        }

        // Optional Toast notification (keeping it subtle)
        /* ... toast logic ... */
    },

    clearCart() {
        localStorage.removeItem('shardahub_cart');
        this.updateCartBadge();
        this.renderCartSidebar();
    },

    removeFromCart(index) {
        const cart = this.getCart();
        cart.splice(index, 1);
        localStorage.setItem('shardahub_cart', JSON.stringify(cart));
        this.updateCartBadge();
        this.renderCartSidebar();

        // Dispatch event for UI updates (like Checkout page)
        window.dispatchEvent(new Event('cartUpdated'));
    },

    updateCartBadge() {
        const cart = this.getCart();
        const badges = document.querySelectorAll('#cartCount');
        badges.forEach(badge => {
            badge.innerText = cart.length;
            if (cart.length > 0) {
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        });
    },

    renderCartSidebar() {
        const cart = this.getCart();
        const container = document.getElementById('sidebarCartContents');
        const totalEl = document.getElementById('sidebarCartTotal');

        if (!container) return; // Not on a page with a sidebar (unlikely)

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-secondary">
                    <i class="bi bi-cart-x display-1 mb-3"></i>
                    <p>Your cart is empty</p>
                </div>
            `;
            if (totalEl) totalEl.innerText = '₹0.00';
            return;
        }

        container.innerHTML = cart.map((item, index) => `
            <div class="d-flex align-items-center justify-content-between mb-3 p-2 rounded-3 glass border border-secondary">
                <div class="d-flex align-items-center">
                    <div class="bg-dark rounded-3 p-2 me-3 border border-secondary shadow-sm">
                        <i class="bi ${item.icon || 'bi-box'} text-info"></i>
                    </div>
                    <div>
                        <div class="fw-bold small text-white text-truncate" style="max-width: 150px;">${item.name}</div>
                        <div class="fw-bold text-info small">₹${item.price}</div>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="ShardaPayments.removeFromCart(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');

        const total = cart.reduce((sum, item) => sum + item.price, 0);
        if (totalEl) totalEl.innerText = `₹${total.toLocaleString()}`;
    },

    async initiateCheckout(checkoutOptions) {
        const user = SubpassAuth.user;
        if (!user) {
            alert("Please Login to proceed with payment.");
            window.location.href = (window.ShardaBaseUrl || './') + 'login.html';
            return;
        }

        const cart = this.getCart();
        if (cart.length === 0) return;

        return new Promise((resolve, reject) => {
            console.log("ShardaPayments: Opening Razorpay Modal...");

            const options = {
                key: this.config.key === 'rzp_test_placeholder' ? 'rzp_test_placeholder' : this.config.key,
                amount: Math.round(checkoutOptions.amount * 100), // Amount in paise
                currency: "INR",
                name: this.config.company_name,
                description: checkoutOptions.description,
                image: "https://shardahub.com/logo.png",
                prefill: checkoutOptions.prefill,
                theme: { color: "#0ea5e9" },
                handler: async (response) => {
                    console.log("Razorpay Success Callback triggered", response);

                    try {
                        // Success! Now fulfill each item in the cart
                        for (const item of cart) {
                            // Determine Product Type for DB Logic
                            let productType = 'Shop';
                            const id = (item.id || '').toLowerCase();
                            const category = (item.category || '');

                            if (id.includes('ai-basic')) productType = 'AI_BASIC';
                            else if (id.includes('ai-advance')) productType = 'AI_ADVANCE';
                            else if (id.includes('saas-basic')) productType = 'SAAS_BASIC';
                            else if (id.includes('saas-advance')) productType = 'SAAS_ADVANCE';
                            else if (id.includes('game-basic')) productType = 'GAME_BASIC';
                            else if (id.includes('game-advance')) productType = 'GAME_ADVANCE';
                            else if (id === 'resume') productType = 'AI_PRO';
                            else if (category === 'AI Tools') productType = 'AI_CREDITS';
                            else if (category === 'SaaS Solutions') productType = 'SAAS';
                            else if (window.location.pathname.includes('/course/')) productType = 'COURSE';

                            await ShardaDB.recordPayment({
                                user_id: user.id,
                                razorpay_order_id: response.razorpay_order_id || 'order_ext_' + Date.now(),
                                razorpay_payment_id: response.razorpay_payment_id,
                                product_type: productType,
                                product_id: item.id,
                                amount: item.price
                            });
                        }
                        resolve(response);
                    } catch (err) {
                        console.error("Post-payment fulfillment failed", err);
                        reject(err);
                    }
                },
                modal: {
                    ondismiss: function () {
                        console.log("Payment Modal Dismissed");
                        reject(new Error("Payment cancelled by user"));
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        });
    },
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ShardaPayments.updateCartBadge();
    ShardaPayments.renderCartSidebar();
});
window.ShardaPayments = ShardaPayments;

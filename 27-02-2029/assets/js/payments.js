/**
 * ShardaHub Advanced Payment Engine v2.0
 * Supports multiple Razorpay accounts per section
 * Sections: course | ai | saas | game | template | robotic
 */

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
// Replace each key_id with your actual Razorpay Key ID for that section.
// You can use the same key for multiple sections if needed.
const RAZORPAY_CONFIGS = {
    course: { key_id: 'rzp_test_COURSE_KEY_HERE', name: 'ShardaHub Courses' },
    ai: { key_id: 'rzp_test_AI_KEY_HERE', name: 'ShardaHub AI Lab' },
    saas: { key_id: 'rzp_test_SAAS_KEY_HERE', name: 'ShardaHub SaaS' },
    game: { key_id: 'rzp_test_GAME_KEY_HERE', name: 'ShardaHub Games' },
    template: { key_id: 'rzp_test_TEMPLATE_KEY_HERE', name: 'ShardaHub Templates' },
    robotic: { key_id: 'rzp_test_ROBOTIC_KEY_HERE', name: 'ShardaHub Robotics' },
    default: { key_id: 'rzp_test_DEFAULT_KEY_HERE', name: 'ShardaHub' },
};

// ─── AUTO-DETECT SECTION FROM URL ────────────────────────────────────────────
function detectSection() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/course/')) return 'course';
    if (path.includes('/ai/')) return 'ai';
    if (path.includes('/saas/')) return 'saas';
    if (path.includes('/games/')) return 'game';
    if (path.includes('/templates/')) return 'template';
    if (path.includes('/robotics/')) return 'robotic';
    return 'default';
}

// ─── MAIN PAYMENT ENGINE ──────────────────────────────────────────────────────
const ShardaPayments = {

    // ── Cart Management ────────────────────────────────────────────────────────
    getCart() {
        return JSON.parse(localStorage.getItem('shardahub_cart') || '[]');
    },

    addToCart(product) {
        const cart = this.getCart();
        // Prevent duplicates for digital products
        const exists = cart.find(i => i.id === product.id && i.tierId === product.tierId);
        if (exists && !product.isPhysical) {
            this.showToast(`${product.name} is already in your cart`, 'warning');
            return;
        }
        cart.push({ ...product, addedAt: Date.now() });
        localStorage.setItem('shardahub_cart', JSON.stringify(cart));
        this.updateCartBadge();
        this.renderCartSidebar();

        // Open cart sidebar
        const cartSidebarEl = document.getElementById('cartSidebar');
        if (cartSidebarEl && typeof bootstrap !== 'undefined') {
            const bsOffcanvas = bootstrap.Offcanvas.getInstance(cartSidebarEl) || new bootstrap.Offcanvas(cartSidebarEl);
            bsOffcanvas.show();
        }
        this.showToast(`${product.name} added to cart!`, 'success');
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
        window.dispatchEvent(new Event('cartUpdated'));
    },

    updateQuantity(index, qty) {
        const cart = this.getCart();
        if (cart[index]) {
            cart[index].quantity = Math.max(1, qty);
            localStorage.setItem('shardahub_cart', JSON.stringify(cart));
            this.updateCartBadge();
            this.renderCartSidebar();
            window.dispatchEvent(new Event('cartUpdated'));
        }
    },

    getCartTotal() {
        return this.getCart().reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    },

    updateCartBadge() {
        const count = this.getCart().length;
        document.querySelectorAll('#cartCount, .cart-count').forEach(el => {
            el.innerText = count;
            el.classList.toggle('d-none', count === 0);
        });
    },

    renderCartSidebar() {
        const cart = this.getCart();
        const container = document.getElementById('sidebarCartContents');
        const totalEl = document.getElementById('sidebarCartTotal');
        if (!container) return;

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-secondary">
                    <i class="bi bi-cart-x display-1 mb-3 d-block"></i>
                    <p class="mb-0">Your cart is empty</p>
                </div>`;
            if (totalEl) totalEl.innerText = '₹0.00';
            return;
        }

        container.innerHTML = cart.map((item, index) => `
            <div class="d-flex align-items-center justify-content-between mb-3 p-2 rounded-3 glass border border-secondary">
                <div class="d-flex align-items-center gap-2">
                    <div class="bg-dark rounded-3 p-2 border border-secondary shadow-sm">
                        <i class="bi ${item.icon || 'bi-box'} text-info fs-5"></i>
                    </div>
                    <div>
                        <div class="fw-bold small text-white text-truncate" style="max-width:140px">${item.name}</div>
                        <div class="text-info small fw-bold">₹${(item.price * (item.quantity || 1)).toLocaleString()}</div>
                        ${item.tierName ? `<div class="text-secondary" style="font-size:0.7rem">${item.tierName}</div>` : ''}
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="ShardaPayments.removeFromCart(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `).join('');

        const total = this.getCartTotal();
        if (totalEl) totalEl.innerText = `₹${total.toLocaleString()}`;
    },

    // ── Coupon System ──────────────────────────────────────────────────────────
    appliedCoupon: null,

    async applyCoupon(code) {
        if (!code) return null;
        const { data: coupon } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (!coupon) {
            this.showToast('Invalid or expired coupon code', 'danger');
            return null;
        }
        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            this.showToast('Coupon has expired', 'danger');
            return null;
        }
        if (coupon.used_count >= coupon.max_uses) {
            this.showToast('Coupon usage limit reached', 'danger');
            return null;
        }

        this.appliedCoupon = coupon;
        const discount = Math.round((this.getCartTotal() * coupon.discount_percent) / 100);
        this.showToast(`Coupon applied! You save ₹${discount}`, 'success');
        return coupon;
    },

    getCouponDiscount(subtotal) {
        if (!this.appliedCoupon) return 0;
        return Math.round((subtotal * this.appliedCoupon.discount_percent) / 100);
    },

    // ── Core Checkout ──────────────────────────────────────────────────────────
    async initiateCheckout(options = {}) {
        // options: { section, amount, description, prefill, onSuccess, metadata }

        const user = window.SubpassAuth?.user;
        if (!user) {
            alert('Please login to proceed with payment.');
            const base = window.ShardaBaseUrl || './';
            window.location.href = base + 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        const section = options.section || detectSection();
        const rzpConfig = RAZORPAY_CONFIGS[section] || RAZORPAY_CONFIGS.default;

        // Calculate final amount after coupon
        let finalAmount = options.amount || this.getCartTotal();
        if (this.appliedCoupon) {
            finalAmount = Math.max(1, finalAmount - this.getCouponDiscount(finalAmount));
        }

        return new Promise((resolve, reject) => {
            const rzpOptions = {
                key: rzpConfig.key_id,
                amount: Math.round(finalAmount * 100), // paise
                currency: 'INR',
                name: rzpConfig.name,
                description: options.description || 'ShardaHub Purchase',
                image: 'https://shardahub.com/logo.png',
                prefill: options.prefill || {
                    name: user.full_name || '',
                    email: user.email || '',
                },
                notes: {
                    section: section,
                    user_id: user.id,
                    ...(options.metadata || {})
                },
                theme: { color: '#0ea5e9' },
                handler: async (response) => {
                    console.log('ShardaPayments: Success', response);
                    try {
                        const result = await this._fulfillPayment({
                            user,
                            response,
                            section,
                            finalAmount,
                            options,
                            cart: this.getCart()
                        });
                        if (options.onSuccess) options.onSuccess(result);
                        resolve(result);
                    } catch (err) {
                        console.error('Fulfillment failed:', err);
                        reject(err);
                    }
                },
                modal: {
                    ondismiss: () => {
                        console.log('ShardaPayments: Modal dismissed');
                        reject(new Error('Payment cancelled'));
                    }
                }
            };

            const rzp = new window.Razorpay(rzpOptions);
            rzp.on('payment.failed', (resp) => {
                console.error('Payment Failed:', resp.error);
                this.showToast('Payment failed: ' + resp.error.description, 'danger');
                reject(new Error(resp.error.description));
            });
            rzp.open();
        });
    },

    // ── Single Item Quick Buy (no cart) ────────────────────────────────────────
    async quickBuy(product, section) {
        const tempCart = this.getCart();
        const originalCart = [...tempCart];

        // Temporarily set cart to single item
        localStorage.setItem('shardahub_cart', JSON.stringify([product]));

        try {
            const result = await this.initiateCheckout({
                section,
                amount: product.price,
                description: product.name + (product.tierName ? ' — ' + product.tierName : ''),
            });
            return result;
        } finally {
            // Restore original cart
            localStorage.setItem('shardahub_cart', JSON.stringify(originalCart));
            this.updateCartBadge();
        }
    },

    // ── Payment Fulfillment ────────────────────────────────────────────────────
    async _fulfillPayment({ user, response, section, finalAmount, options, cart }) {
        const userId = user.id;

        // 1. Create master order in DB
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .insert([{
                user_id: userId,
                total_amount: finalAmount,
                order_status: 'completed',
                razorpay_order_id: response.razorpay_order_id || 'rzp_' + Date.now(),
                razorpay_payment_id: response.razorpay_payment_id,
                product_type: section,
                razorpay_section: section,
                invoice_number: 'INV-' + Date.now()
            }])
            .select()
            .single();

        if (orderErr) throw orderErr;

        // 2. Payment record
        await supabase.from('payments').insert([{
            order_id: order.id,
            razorpay_payment_id: response.razorpay_payment_id,
            status: 'paid',
            method: 'razorpay',
            razorpay_section: section,
            amount: finalAmount
        }]);

        // 3. Mark coupon used
        if (this.appliedCoupon) {
            await supabase.from('coupons')
                .update({ used_count: this.appliedCoupon.used_count + 1 })
                .eq('id', this.appliedCoupon.id);
            this.appliedCoupon = null;
        }

        // 4. Fulfill each cart item
        for (const item of cart) {
            // Order item
            await supabase.from('order_items').insert([{
                order_id: order.id,
                product_id: item.id,
                tier_id: item.tierId || null,
                quantity: item.quantity || 1,
                unit_price: item.price
            }]);

            // Section-specific fulfillment
            await this._fulfillItem(userId, item, section, order.id);
        }

        // 5. Update user's total spent
        await supabase.rpc('update_user_spend', {
            target_user_id: userId,
            amount_to_add: finalAmount
        }).catch(() => { });

        // 6. Clear cart after success
        this.clearCart();

        return { success: true, orderId: order.id, paymentId: response.razorpay_payment_id };
    },

    async _fulfillItem(userId, item, section, orderId) {
        switch (section) {
            case 'course':
                await supabase.from('enrollments').upsert([{
                    user_id: userId,
                    course_id: item.id
                }]);
                break;

            case 'ai':
                // Grant subscription
                if (item.tierId) {
                    await supabase.from('user_subscriptions').upsert([{
                        user_id: userId,
                        product_id: item.id,
                        tier_id: item.tierId,
                        status: 'active',
                        expires_at: item.durationDays
                            ? new Date(Date.now() + item.durationDays * 86400000).toISOString()
                            : null
                    }]);
                }
                // Legacy AI credits
                if (item.credits) {
                    await supabase.rpc('increment_ai_credits', {
                        target_user_id: userId,
                        amount_to_add: item.credits
                    }).catch(() => { });
                }
                break;

            case 'saas':
                await supabase.from('user_subscriptions').upsert([{
                    user_id: userId,
                    product_id: item.id,
                    tier_id: item.tierId || null,
                    status: 'active',
                    expires_at: item.durationDays
                        ? new Date(Date.now() + item.durationDays * 86400000).toISOString()
                        : null,
                    auto_renew: true
                }]);
                break;

            case 'game':
                await supabase.from('game_licenses').upsert([{
                    user_id: userId,
                    product_id: item.id,
                    tier_id: item.tierId || null,
                    max_downloads: item.maxDownloads || 3,
                    game_version: item.version || '1.0'
                }], { onConflict: 'user_id,product_id,tier_id' });
                break;

            case 'template':
                await supabase.from('template_downloads').upsert([{
                    user_id: userId,
                    product_id: item.id,
                    tier_id: item.tierId || null,
                    license_type: item.licenseType || 'personal',
                    max_downloads: item.maxDownloads || 5
                }], { onConflict: 'user_id,product_id' });
                break;

            case 'robotic':
                // Deduct inventory
                if (item.quantity) {
                    await supabase.rpc('deduct_inventory', {
                        p_product_id: item.id,
                        p_qty: item.quantity || 1
                    }).catch(() => { });
                }
                break;

            default:
                break;
        }
    },

    // ── Toast Notifications ────────────────────────────────────────────────────
    showToast(message, type = 'success') {
        const id = 'toast_' + Date.now();
        const colors = {
            success: 'bg-success',
            danger: 'bg-danger',
            warning: 'bg-warning text-dark',
            info: 'bg-info text-dark'
        };
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast align-items-center ${colors[type] || colors.success} border-0 show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body fw-medium">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>`;

        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    // ── Free Access Grant (register-only items) ────────────────────────────────
    async grantFreeAccess(product, section) {
        const user = window.SubpassAuth?.user;
        if (!user) {
            alert('Please login to access this free item.');
            window.location.href = (window.ShardaBaseUrl || './') + 'login.html';
            return false;
        }
        try {
            await this._fulfillItem(user.id, product, section, null);
            this.showToast(`Access granted to ${product.name}!`, 'success');
            return true;
        } catch (err) {
            console.error('Free grant failed:', err);
            this.showToast('Failed to grant access. Please try again.', 'danger');
            return false;
        }
    }
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    ShardaPayments.updateCartBadge();
    ShardaPayments.renderCartSidebar();
});

window.ShardaPayments = ShardaPayments;

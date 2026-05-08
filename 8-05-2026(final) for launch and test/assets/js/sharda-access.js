/**
 * ShardaAccess — Central Tier-Gating Service v1.0
 * Checks if a user has access to any product section/tier.
 * All modules import this and call the relevant check function.
 */

const ShardaAccess = {

    // ── COURSE ACCESS ──────────────────────────────────────────────────────────
    // Returns { allowed, reason, isFree, enrollment }
    async checkCourse(userId, courseId) {
        if (!userId) return { allowed: false, reason: 'login_required' };

        // Check if course is free (price = 0)
        const { data: product } = await supabase
            .from('products')
            .select('price_inr, product_tiers(*)')
            .eq('id', courseId)
            .single();

        const isFree = !product || product.price_inr === 0;

        // Check enrollment
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();

        if (enrollment) return { allowed: true, reason: 'enrolled', isFree, enrollment };
        if (isFree) return { allowed: true, reason: 'free_registered', isFree: true };

        return { allowed: false, reason: 'purchase_required', isFree: false };
    },

    // ── AI TOOL ACCESS ─────────────────────────────────────────────────────────
    // Returns { allowed, tier, quotaLeft, dailyUsed, monthlyUsed }
    async checkAI(userId, toolId) {
        if (!userId) return { allowed: false, reason: 'login_required' };

        // Get active subscription
        const { data: subs } = await supabase
            .from('user_subscriptions')
            .select('*, product_tiers(*)')
            .eq('user_id', userId)
            .eq('product_id', toolId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

        const sub = subs?.[0];
        const tier = sub?.product_tiers;

        // Get today's usage
        const { data: usage } = await supabase
            .from('ai_usage_tracking')
            .select('daily_count, monthly_count')
            .eq('user_id', userId)
            .eq('tool_id', toolId)
            .eq('usage_date', new Date().toISOString().split('T')[0])
            .single();

        const dailyUsed = usage?.daily_count || 0;
        const monthlyUsed = usage?.monthly_count || 0;
        const dailyLimit = tier?.daily_limit ?? 5;   // Free: 5/day
        const monthlyLimit = tier?.monthly_limit ?? 50;  // Free: 50/mo

        // -1 means unlimited
        if (dailyLimit !== -1 && dailyUsed >= dailyLimit)
            return { allowed: false, reason: 'daily_limit_reached', dailyUsed, dailyLimit, tier };
        if (monthlyLimit !== -1 && monthlyUsed >= monthlyLimit)
            return { allowed: false, reason: 'monthly_limit_reached', monthlyUsed, monthlyLimit, tier };

        return {
            allowed: true,
            tier: tier,
            quotaLeft: dailyLimit === -1 ? 999 : dailyLimit - dailyUsed,
            dailyUsed,
            dailyLimit,
            monthlyUsed,
            monthlyLimit
        };
    },

    // ── SAAS ACCESS ────────────────────────────────────────────────────────────
    // Returns { allowed, plan, daysLeft, expiresAt }
    async checkSaaS(userId, productId) {
        if (!userId) return { allowed: false, reason: 'login_required' };

        const { data: subs } = await supabase
            .from('user_subscriptions')
            .select('*, product_tiers(name, features)')
            .eq('user_id', userId)
            .eq('product_id', productId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

        const sub = subs?.[0];
        if (!sub) return { allowed: false, reason: 'no_subscription' };

        const daysLeft = sub.expires_at
            ? Math.max(0, Math.ceil((new Date(sub.expires_at) - new Date()) / 86400000))
            : null; // null = lifetime

        if (sub.expires_at && daysLeft === 0)
            return { allowed: false, reason: 'subscription_expired', plan: sub.product_tiers?.name };

        return {
            allowed: true,
            plan: sub.product_tiers?.name || 'Active',
            features: sub.product_tiers?.features || [],
            daysLeft,
            expiresAt: sub.expires_at
        };
    },

    // ── GAME ACCESS ────────────────────────────────────────────────────────────
    // Returns { allowed, license, downloadsLeft }
    async checkGame(userId, gameId, tierId = null) {
        if (!userId) return { allowed: false, reason: 'login_required' };

        let query = supabase
            .from('game_licenses')
            .select('*')
            .eq('user_id', userId)
            .eq('product_id', gameId);

        if (tierId) query = query.eq('tier_id', tierId);

        const { data: licenses } = await query.limit(1);
        const license = licenses?.[0];

        if (!license) return { allowed: false, reason: 'no_license' };

        const downloadsLeft = license.max_downloads - license.download_count;
        return {
            allowed: true,
            license,
            downloadsLeft: Math.max(0, downloadsLeft),
            licenseKey: license.license_key
        };
    },

    // ── TEMPLATE ACCESS ────────────────────────────────────────────────────────
    // Returns { allowed, downloadsLeft, licenseType }
    async checkTemplate(userId, templateId) {
        if (!userId) return { allowed: false, reason: 'login_required' };

        // Check if free (enrollment style) or paid
        const { data: product } = await supabase
            .from('products')
            .select('price_inr')
            .eq('id', templateId)
            .single();

        const isFree = !product || product.price_inr === 0;

        const { data: dl } = await supabase
            .from('template_downloads')
            .select('*')
            .eq('user_id', userId)
            .eq('product_id', templateId)
            .single();

        if (!dl && isFree) {
            // Grant free access on the fly
            await supabase.from('template_downloads').upsert([{
                user_id: userId,
                product_id: templateId,
                max_downloads: 5,
                license_type: 'personal'
            }]);
            return { allowed: true, downloadsLeft: 5, licenseType: 'personal', isFree: true };
        }

        if (!dl) return { allowed: false, reason: 'purchase_required' };

        const downloadsLeft = dl.max_downloads - dl.download_count;
        if (downloadsLeft <= 0) return { allowed: false, reason: 'download_limit_reached', dl };

        return { allowed: true, downloadsLeft, licenseType: dl.license_type, dl };
    },

    // ── ROBOTIC / PHYSICAL ────────────────────────────────────────────────────
    // Just check login; orders handle fulfillment
    checkRobotic(userId) {
        if (!userId) return { allowed: false, reason: 'login_required' };
        return { allowed: true };
    },

    // ── UI HELPERS ─────────────────────────────────────────────────────────────
    // Show standardized "upgrade required" modal
    showUpgradePrompt(reason, section) {
        const messages = {
            login_required: '🔒 Please login to access this content.',
            purchase_required: '🔒 This is a paid item. Purchase to get access.',
            no_subscription: '🔒 An active subscription is required.',
            subscription_expired: '⚠️ Your subscription has expired. Please renew.',
            daily_limit_reached: '⚡ Daily usage limit reached. Upgrade for more.',
            monthly_limit_reached: '📊 Monthly limit reached. Upgrade your plan.',
            no_license: '🎮 You don\'t have a license for this. Purchase to unlock.',
            download_limit_reached: '⬇️ Download limit reached for your license.'
        };
        const msg = messages[reason] || 'Access restricted. Please upgrade your plan.';

        // Create modal dynamically
        const existingModal = document.getElementById('accessModal');
        if (existingModal) existingModal.remove();

        const sectionLinks = {
            course: '/course/',
            ai: '/ai/',
            saas: '/saas/',
            game: '/games/',
            template: '/templates/',
            robotic: '/robotics/'
        };

        const modal = document.createElement('div');
        modal.id = 'accessModal';
        modal.innerHTML = `
          <div class="modal fade" id="accessModalInner" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content glass border border-info border-opacity-25 rounded-4">
                <div class="modal-body text-center p-5">
                  <div class="display-4 mb-3">🔐</div>
                  <h4 class="fw-bold text-white mb-3">Access Required</h4>
                  <p class="text-secondary mb-4">${msg}</p>
                  <div class="d-flex gap-3 justify-content-center">
                    <button class="btn btn-outline-secondary rounded-pill px-4"
                      onclick="bootstrap.Modal.getInstance(document.getElementById('accessModalInner'))?.hide()">
                      Cancel
                    </button>
                    <a href="${sectionLinks[section] || '/'}"
                       class="btn btn-gradient rounded-pill px-4 fw-bold">
                      <i class="bi bi-arrow-up-circle me-1"></i>Upgrade Now
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>`;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(document.getElementById('accessModalInner'));
        bsModal.show();
        document.getElementById('accessModalInner').addEventListener('hidden.bs.modal', () => modal.remove());
    },

    // Render a standard locked overlay on a card
    renderLockOverlay(container, message = 'Upgrade to unlock') {
        const overlay = document.createElement('div');
        overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-4';
        overlay.style.cssText = 'background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:10';
        overlay.innerHTML = `
            <div class="text-center">
                <i class="bi bi-lock-fill text-info fs-1 mb-2 d-block"></i>
                <div class="small text-white fw-medium">${message}</div>
            </div>`;
        if (container) {
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
        return overlay;
    }
};

window.ShardaAccess = ShardaAccess;

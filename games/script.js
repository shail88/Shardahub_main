/**
 * ShardaHub Game Hub — Subscription System v3.0
 * ================================================
 * Clean subscription model: Free / Pro / Enterprise
 * No tiers, no source code, no demo confusion.
 *
 * Tables used:
 *   - games              (game library)
 *   - game_plans         (Free, Pro, Enterprise definitions)
 *   - game_subscriptions (which user is on which plan)
 */

const GameHub = {
    // ── State ──────────────────────────────────────────
    allGames: [],
    plans: [],
    userPlan: 'free',       // default until we check Supabase
    currentUser: null,
    upgradeModal: null,
    gameModal: null,

    // Plan hierarchy for access checks
    PLAN_LEVEL: { free: 1, pro: 2, enterprise: 3 },

    // ── Entry Point ────────────────────────────────────
    async init() {
        console.log('🎮 GameHub v3.0 initialising...');

        // Initialise Bootstrap modals
        this.upgradeModal = new bootstrap.Modal(document.getElementById('upgradeModal'));
        this.gameModal = new bootstrap.Modal(document.getElementById('gameModal'));

        // Detect current user (non-blocking)
        await this.detectUser();

        // Load plans and games in parallel
        await Promise.all([this.loadPlans(), this.loadGames()]);
    },

    // ── Auth ───────────────────────────────────────────
    async detectUser() {
        const client = window.getSupabase();
        if (!client) return;

        const { data: { session } } = await client.auth.getSession();
        if (!session) return;

        this.currentUser = session.user;

        // Fetch active subscription
        const { data: sub } = await client
            .from('game_subscriptions')
            .select('plan_slug, expires_at, status')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (sub) {
            const expired = sub.expires_at && new Date(sub.expires_at) < new Date();
            if (!expired) {
                this.userPlan = sub.plan_slug;
            }
        }

        // Show current plan banner
        const banner = document.getElementById('currentPlanBanner');
        const label = document.getElementById('currentPlanLabel');
        if (banner && label) {
            const planColors = { free: '#10b981', pro: '#6366f1', enterprise: '#f59e0b' };
            const planNames = { free: '🆓 Free Plan', pro: '⚡ Pro Plan', enterprise: '🏆 Enterprise Plan' };
            label.innerHTML = `<span style="color:${planColors[this.userPlan]}">${planNames[this.userPlan]}</span>`;
            banner.classList.remove('d-none');
        }
    },

    // ── Plans ──────────────────────────────────────────
    async loadPlans() {
        const client = window.getSupabase();
        if (!client) return;

        const { data: plans, error } = await client
            .from('game_plans')
            .select('*')
            .eq('is_active', true)
            .order('price_monthly', { ascending: true });

        if (error) { console.error('Plans load error:', error); return; }
        this.plans = plans || [];
        this.renderPlans();
    },

    renderPlans() {
        const grid = document.getElementById('plansGrid');
        if (!grid || !this.plans.length) return;

        const planOrder = { free: 1, pro: 2, enterprise: 3 };
        const sorted = [...this.plans].sort((a, b) => (planOrder[a.slug] || 9) - (planOrder[b.slug] || 9));

        grid.innerHTML = sorted.map(plan => {
            const isCurrentPlan = this.userPlan === plan.slug;
            const features = Array.isArray(plan.features) ? plan.features : [];

            return `
            <div class="col-md-4">
                <div class="plan-card glass rounded-4 p-4 h-100 ${plan.slug === 'pro' ? 'plan-card-featured' : ''}" style="border:1px solid ${plan.color}22">
                    ${plan.slug === 'pro' ? '<div class="popular-badge">MOST POPULAR</div>' : ''}
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <span class="fs-3"><i class="bi ${plan.icon}" style="color:${plan.color}"></i></span>
                        <h5 class="fw-bold mb-0">${plan.name}</h5>
                        ${isCurrentPlan ? '<span class="badge ms-auto" style="background:rgba(16,185,129,.2);color:#10b981;border:1px solid rgba(16,185,129,.3)">Current</span>' : ''}
                    </div>
                    <div class="mb-4">
                        <span class="display-6 fw-black" style="color:${plan.color}">
                            ${plan.price_monthly === 0 ? 'Free' : '₹' + plan.price_monthly}
                        </span>
                        ${plan.price_monthly > 0 ? '<span class="text-secondary small">/month</span>' : ''}
                        ${plan.price_yearly > 0 ? `<div class="small text-secondary mt-1">₹${plan.price_yearly}/year — save ${Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%</div>` : ''}
                    </div>
                    <ul class="list-unstyled mb-4 flex-grow-1">
                        ${features.map(f => `
                            <li class="d-flex align-items-start gap-2 mb-2 small">
                                <i class="bi bi-check-circle-fill mt-1 flex-shrink-0" style="color:${plan.color}"></i>
                                ${f}
                            </li>`).join('')}
                    </ul>
                    <button class="btn w-100 rounded-pill fw-bold py-2"
                        style="background:${isCurrentPlan ? 'rgba(16,185,129,.15)' : plan.slug === 'pro' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : `rgba(${plan.color.slice(1).match(/.{2}/g).map(h => parseInt(h, 16)).join(',')},0.15)`};
                               color:${isCurrentPlan ? '#10b981' : plan.slug === 'pro' ? '#fff' : plan.color};
                               border:1px solid ${plan.color}44"
                        onclick="GameHub.handlePlanClick('${plan.slug}', '${plan.name}', ${plan.price_monthly})"
                        ${isCurrentPlan ? 'disabled' : ''}>
                        ${isCurrentPlan ? '<i class="bi bi-check me-2"></i>Active Plan' : plan.price_monthly === 0 ? '<i class="bi bi-play-fill me-2"></i>Start Free' : '<i class="bi bi-lightning-fill me-2"></i>Subscribe Now'}
                    </button>
                </div>
            </div>`;
        }).join('');

        // Also load upgrade modal plans
        document.getElementById('upgradeModalPlans').innerHTML = grid.innerHTML;
    },

    // ── Games ──────────────────────────────────────────
    async loadGames() {
        const client = window.getSupabase();
        const grid = document.getElementById('gamesGrid');
        if (!client || !grid) return;

        try {
            const { data: games, error } = await client
                .from('games')
                .select('*')
                .eq('is_active', true)
                .order('is_featured', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.allGames = games || [];

            const label = document.getElementById('gameCountLabel');
            if (label) label.textContent = `${this.allGames.length} games available`;

            this.renderGames(this.allGames);
        } catch (err) {
            console.error('Games load error:', err);
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-triangle-fill text-warning fs-1 d-block mb-3"></i>
                    <h5 class="text-white">Could not load games</h5>
                    <p class="text-secondary small">${err.message}</p>
                    <button class="btn btn-outline-info rounded-pill px-4" onclick="GameHub.loadGames()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Retry
                    </button>
                </div>`;
        }
    },

    renderGames(games) {
        const grid = document.getElementById('gamesGrid');
        if (!grid) return;

        if (!games || !games.length) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-controller display-1 d-block mb-3 opacity-25"></i>
                    <h5 class="text-white">No games found</h5>
                    <p class="text-secondary small">Run the SQL migration or add games in the Admin panel.</p>
                    <a href="../admin/games.html" class="btn btn-outline-info rounded-pill px-4">
                        <i class="bi bi-plus-lg me-2"></i>Add Games
                    </a>
                </div>`;
            return;
        }

        grid.innerHTML = games.map(g => this.buildGameCard(g)).join('');
    },

    buildGameCard(game) {
        const planLevel = this.PLAN_LEVEL;
        const userLevel = planLevel[this.userPlan] || 1;
        const reqLevel = planLevel[game.required_plan] || 1;
        const hasAccess = userLevel >= reqLevel;

        const planMeta = {
            free: { label: 'Free', color: '#10b981', icon: 'bi-play-circle' },
            pro: { label: 'Pro', color: '#6366f1', icon: 'bi-controller' },
            enterprise: { label: 'Enterprise', color: '#f59e0b', icon: 'bi-trophy' }
        };
        const plan = planMeta[game.required_plan] || planMeta.free;

        const imgSrc = sanitizeImg(game.image_url);

        const stars = game.rating > 0
            ? '⭐'.repeat(Math.round(game.rating)) + `  ${game.rating.toFixed(1)}`
            : 'Not rated yet';

        return `
        <div class="col-sm-6 col-lg-4" data-plan="${game.required_plan}">
            <div class="game-card glass rounded-4 overflow-hidden h-100 ${!hasAccess ? 'game-locked' : ''}">

                <!-- Thumbnail -->
                <div class="game-thumb-wrap position-relative" style="cursor:pointer" onclick="GameHub.showGameDetail('${game.id}')">
                    <img src="${imgSrc}" alt="${game.title}" class="game-thumb" onerror="this.onerror=null; this.src=window.SHARDA_PLACEHOLDER;">
                    ${game.is_featured ? '<span class="featured-badge">⭐ FEATURED</span>' : ''}
                    <span class="plan-badge-overlay" style="background:${plan.color}22;color:${plan.color};border:1px solid ${plan.color}44">
                        <i class="bi ${plan.icon} me-1"></i>${plan.label}
                    </span>
                    ${!hasAccess ? `
                    <div class="lock-overlay d-flex flex-column align-items-center justify-content-center">
                        <i class="bi bi-lock-fill fs-1 mb-2"></i>
                        <span class="fw-bold small">Requires ${plan.label} Plan</span>
                    </div>` : ''}
                </div>

                <!-- Info -->
                <div class="p-4 d-flex flex-column">
                    <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                        <h5 class="fw-bold mb-0">${game.title}</h5>
                        <span class="badge rounded-pill small flex-shrink-0" style="background:rgba(255,255,255,.07);color:#94a3b8">${game.genre}</span>
                    </div>
                    <p class="text-secondary small mb-3" style="min-height:2.5em;overflow:hidden">${game.tagline || ''}</p>
                    <div class="d-flex gap-3 text-secondary small mb-4">
                        <span><i class="bi bi-people me-1"></i>${(game.total_players || 0).toLocaleString()}</span>
                        <span title="${stars}"><i class="bi bi-star-fill text-warning me-1"></i>${game.rating > 0 ? game.rating.toFixed(1) : '—'}</span>
                    </div>

                    <!-- Action Button -->
                    <div class="mt-auto">
                        ${hasAccess
                ? (game.play_store_url
                    ? `<a href="${game.play_store_url}" target="_blank" rel="noopener"
                                      class="btn btn-gradient w-100 rounded-pill fw-bold py-2">
                                      <i class="bi bi-google-play me-2"></i>Play on Google Play
                                   </a>`
                    : `<button class="btn btn-gradient w-100 rounded-pill fw-bold py-2" disabled>
                                      <i class="bi bi-controller me-2"></i>Coming Soon
                                   </button>`)
                : `<button class="btn w-100 rounded-pill fw-bold py-2"
                                    style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);color:#f59e0b"
                                    onclick="GameHub.promptUpgrade('${game.id}','${game.title.replace(/'/g, "\\'")}','${game.required_plan}')">
                                  <i class="bi bi-arrow-up-circle me-2"></i>Upgrade to ${plan.label}
                               </button>`
            }
                        <button class="btn btn-sm btn-link text-secondary w-100 mt-2 p-0"
                                style="font-size:.8rem"
                                onclick="GameHub.showGameDetail('${game.id}')">
                            <i class="bi bi-info-circle me-1"></i>Game Details
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    },

    // ── Filters ────────────────────────────────────────
    filterByPlan(plan) {
        const filtered = plan === 'all'
            ? this.allGames
            : this.allGames.filter(g => g.required_plan === plan);
        this.renderGames(filtered);
    },

    // ── Plan Subscription Flow ─────────────────────────
    handlePlanClick(planSlug, planName, priceMonthly) {
        if (!this.currentUser) {
            sessionStorage.setItem('sharda_redirect_after_login', window.location.href);
            window.location.href = '../login.html';
            return;
        }
        if (planSlug === 'free') {
            this.activateFreePlan();
            return;
        }
        // Redirect to checkout with plan details
        window.location.href = `../checkout.html?type=gameplan&plan=${planSlug}&name=${encodeURIComponent(planName)}&price=${priceMonthly}`;
    },

    async activateFreePlan() {
        const client = window.getSupabase();
        if (!this.currentUser || !client) return;

        const { error } = await client.from('game_subscriptions').insert({
            user_id: this.currentUser.id,
            plan_slug: 'free',
            status: 'active',
            amount_paid: 0,
            started_at: new Date().toISOString()
        });

        if (!error) {
            this.userPlan = 'free';
            this.showToast('✅ Free plan activated! Enjoy your games.', 'success');
            setTimeout(() => location.reload(), 1200);
        } else {
            // Already on free (uniqueness error is fine)
            this.showToast('You are already on the Free plan.', 'info');
        }
    },

    // ── Upgrade Prompt ─────────────────────────────────
    promptUpgrade(gameId, gameTitle, requiredPlan) {
        if (!this.currentUser) {
            sessionStorage.setItem('sharda_redirect_after_login', window.location.href);
            window.location.href = '../login.html';
            return;
        }

        const planNames = { pro: '⚡ Pro', enterprise: '🏆 Enterprise' };
        document.getElementById('upgradeGameTitle').textContent = gameTitle;
        document.getElementById('upgradePlanRequired').textContent = planNames[requiredPlan] || requiredPlan;

        // Show only eligible upgrade plans
        const planLevel = this.PLAN_LEVEL;
        const reqLevel = planLevel[requiredPlan] || 1;
        const eligible = this.plans.filter(p => (planLevel[p.slug] || 0) >= reqLevel && p.slug !== 'free');

        document.getElementById('upgradeModalPlans').innerHTML = eligible.map(plan => `
            <div class="col-md-6">
                <div class="glass rounded-3 p-3 h-100" style="border:1px solid ${plan.color}33">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="bi ${plan.icon}" style="color:${plan.color};font-size:1.3rem"></i>
                        <h6 class="fw-bold mb-0">${plan.name}</h6>
                    </div>
                    <div class="fw-black mb-3" style="color:${plan.color}">₹${plan.price_monthly}<span class="text-secondary fw-normal small">/mo</span></div>
                    <button class="btn w-100 rounded-pill fw-bold"
                        style="background:linear-gradient(135deg,${plan.color},${plan.color}99);color:#fff;border:none"
                        onclick="GameHub.handlePlanClick('${plan.slug}','${plan.name}',${plan.price_monthly})">
                        Get ${plan.name}
                    </button>
                </div>
            </div>`).join('');

        this.upgradeModal.show();
    },

    // ── Game Detail Modal ──────────────────────────────
    showGameDetail(gameId) {
        const game = this.allGames.find(g => g.id === gameId);
        if (!game) return;

        const planLevel = this.PLAN_LEVEL;
        const hasAccess = (planLevel[this.userPlan] || 0) >= (planLevel[game.required_plan] || 1);

        document.getElementById('gameModalTitle').textContent = game.title;
        document.getElementById('gameModalDesc').textContent = game.description || game.tagline || '';
        document.getElementById('gameModalGenre').textContent = game.genre;
        document.getElementById('gameModalPlayers').textContent = (game.total_players || 0).toLocaleString();
        document.getElementById('gameModalRating').textContent = game.rating > 0 ? game.rating.toFixed(1) + '/5' : 'Not rated';

        const img = document.getElementById('gameModalImage');
        img.src = sanitizeImg(game.image_url);
        img.alt = game.title;
        img.onerror = () => { img.onerror = null; img.src = window.SHARDA_PLACEHOLDER; };

        const actions = document.getElementById('gameModalActions');
        actions.innerHTML = hasAccess
            ? (game.play_store_url ? `
                <a href="${game.play_store_url}" target="_blank" rel="noopener"
                   class="btn btn-gradient rounded-pill px-4 fw-bold">
                   <i class="bi bi-google-play me-2"></i>Open in Play Store
                </a>` : '<p class="text-secondary small">No Play Store link yet.</p>')
            : `<button class="btn rounded-pill px-4 fw-bold" style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3)"
                   onclick="GameHub.upgradeModal.show()">
                   <i class="bi bi-arrow-up-circle me-2"></i>Upgrade to Play
               </button>`;

        this.gameModal.show();
    },

    // ── Toast ──────────────────────────────────────────
    showToast(msg, type = 'info') {
        const colors = { success: '#10b981', info: '#0ea5e9', warning: '#f59e0b', danger: '#ef4444' };
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:rgba(15,23,42,.95);border:1px solid ${colors[type] || colors.info}44;color:#e2e8f0;padding:14px 20px;border-radius:12px;font-size:.875rem;box-shadow:0 8px 32px rgba(0,0,0,.4);max-width:320px;animation:slideUpFade .3s ease`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }
};

// ── Global filter function (called from HTML onclick) ─
function filterByPlan(plan, btn) {
    document.querySelectorAll('#filterBar button').forEach(b => {
        b.classList.remove('active');
        b.style.fontWeight = '';
    });
    btn.classList.add('active');
    btn.style.fontWeight = '700';
    GameHub.filterByPlan(plan);
}

// ── Boot ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth system if available, then init
    new Promise(resolve => {
        if (window.SubpassAuth?.ready) window.SubpassAuth.ready.then(resolve);
        else setTimeout(resolve, 600);
    }).then(() => GameHub.init());
});

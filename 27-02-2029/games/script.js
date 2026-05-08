/**
 * ShardaHub Games Module Logic
 */
const GameModule = {
    init() {
        console.log("Game Module Initialized");
        this.loadGames();
    },

    async loadGames() {
        const grid = document.getElementById('games-grid');
        if (!grid) return;

        try {
            const { data: products } = await window.shardaHubData.fetchProducts();
            const games = products ? products.filter(p => p.categories?.slug === 'games') : [];

            if (games.length > 0) {
                grid.innerHTML = games.map(p => `
                    <div class="col-md-3">
                        <div class="glass p-4 rounded-4 text-center h-100 interactive-card">
                            <div class="bg-info bg-opacity-10 p-4 rounded-4 mb-3">
                                <i class="bi ${p.icon || 'bi-joystick'} display-1 text-info"></i>
                            </div>
                            <h4 class="fw-bold text-white">${p.title}</h4>
                            <p class="small text-secondary">${p.tagline || 'Expert Game'}</p>
                            <div class="d-flex flex-column gap-2">
                                ${this.renderGameButtons(p)}
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                grid.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No games available currently. Check back soon!</div>';
            }
        } catch (e) {
            console.error("Games load error:", e);
        }
    },

    renderGameButtons(product) {
        // Find tiers
        const tiers = product.product_tiers || [];
        const freeTier = tiers.find(t => t.name.toLowerCase() === 'free');
        const paidTier = tiers.find(t => t.name.toLowerCase() !== 'free'); // Grab the first paid one for simplicity in card

        let buttons = '';

        // Free Tier Button
        if (freeTier) {
            buttons += `<button class="btn btn-info w-100 rounded-pill fw-bold mb-2" 
                onclick="GameModule.openGame('${product.id}', '${freeTier.id}', '${freeTier.action_url}', true)">
                <i class="bi bi-google-play me-2"></i>Play Free
            </button>`;
        }

        // Paid/Detail Button
        if (paidTier) {
            buttons += `<button class="btn btn-sm btn-outline-info w-100 rounded-pill" 
                onclick="window.location.href='../product.html?id=${product.slug || product.id}'">
                Upgrade / Details
            </button>`;
        } else if (!freeTier) {
            // Fallback if no tiers defined yet
            buttons += `<button class="btn btn-info w-100 rounded-pill fw-bold" 
                onclick="window.location.href='../product.html?id=${product.slug || product.id}'">
                View Details
            </button>`;
        }

        return buttons;
    },

    async openGame(productId, tierId, actionUrl, isFree) {
        const user = window.SubpassAuth?.user;
        if (!user) {
            alert("Please login to play.");
            window.location.href = '../login.html';
            return;
        }

        if (isFree) {
            if (actionUrl) {
                window.open(actionUrl, '_blank');
            } else {
                alert("Launching demo play...");
            }
            return;
        }

        // Verify access via ShardaAccess
        const access = await ShardaAccess.checkGame(user.id, productId, tierId);
        if (access.allowed) {
            if (actionUrl) {
                window.open(actionUrl, '_blank');
            } else {
                alert("Premium Access Granted! Loading full game...");
            }
        } else {
            alert("This game requires Full Access license.");
            window.location.href = `../product.html?id=${productId}`;
        }
    },

    playGame(gameId) {
        if (!SubpassAuth.user) {
            alert("Login required to save your scores!");
            window.location.href = '../login.html';
            return;
        }
        alert(`Launching ${gameId}... Enjoy!`);
    }
};

document.addEventListener('DOMContentLoaded', () => GameModule.init());

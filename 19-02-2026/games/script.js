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
                                <button class="btn btn-info w-100 rounded-pill fw-bold" 
                                    onclick="GameModule.playGame('${p.id}')">Play Now</button>
                                <button class="btn btn-sm btn-outline-info w-100 rounded-pill" 
                                    onclick="window.location.href='../product.html?id=${p.id}'">
                                    Upgrade / Details
                                </button>
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

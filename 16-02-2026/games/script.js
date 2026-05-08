/**
 * ShardaHub Games Module Logic
 */
const GameModule = {
    init() {
        console.log("Game Module Initialized");
    },

    playGame(gameId) {
        if (!SubpassAuth.user) {
            alert("Login required to save your scores!");
            SubpassAuth.showLogin();
            return;
        }
        alert(`Launching ${gameId}... Enjoy!`);
    }
};

document.addEventListener('DOMContentLoaded', () => GameModule.init());

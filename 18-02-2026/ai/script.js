const AIModule = {
    init() {
        console.log("AI Module Initialized");
        this.updateCreditDisplay();
    },

    async updateCreditDisplay() {
        if (SubpassAuth.user) {
            const meta = await ShardaDB.getUserMetadata(SubpassAuth.user.id);
            const container = document.getElementById('ai-credit-count');
            if (container) container.innerText = `${meta.ai_credits} Credits remaining`;
        }
    },

    async useTool(toolId, isPro = false) {
        if (!SubpassAuth.user) {
            alert("Login required to use ShardaAI tools.");
            window.location.href = '../login.html';
            return;
        }

        if (isPro && !SubpassAuth.hasRole('Pro')) {
            alert("This is a Pro Tool. Upgrade to ShardaHub Pro to unlock.");
            return;
        }

        const success = await ShardaDB.deductAICredit(SubpassAuth.user.id);
        if (success) {
            alert(`Using tool: ${toolId}. 1 Credit deducted.`);
            this.updateCreditDisplay();
        } else {
            alert("Insufficient credits. Please purchase more AI credits at the shop.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AIModule.init());
document.addEventListener('sharda-auth-updated', () => AIModule.updateCreditDisplay());

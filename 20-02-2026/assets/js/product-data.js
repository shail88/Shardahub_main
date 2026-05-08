/**
 * ShardaHub Product Data Engine
 * Contains expert-level copy, technical requirements, and media metadata for the ecosystem.
 */

const ShardaProducts = {
    // --- AI HUB ---
    'resume': {
        id: 'resume',
        title: 'Resume AI Builder Pro',
        category: 'AI Tools',
        tagline: 'Stop Being Filtered. Start Getting Hired with ATS-Dominating AI.',
        price: 499, // Starting price
        ogPrice: 4999,
        rating: 4.9,
        reviews: '2,341',
        students: '12,450',
        author: 'ShardaHub AI Labs',
        lastUpdated: '02/2026',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        icon: 'bi-file-earmark-person',
        plans: [
            { id: 'ai-free', name: 'Free Starter', price: 0, credits: 5, features: ['5 AI Generations/mo', 'Standard ATS Templates', 'Community Support'] },
            { id: 'ai-basic', name: 'Professional', price: 499, credits: 500, features: ['500 AI Credits', 'Premium Layouts', 'Priority Email Support'] },
            { id: 'ai-advance', name: 'Expert Advance', price: 1499, credits: 'Unlimited*', features: ['Unlimited AI Credits', 'Direct Expert Review', 'White-label Export'] }
        ],
        whyChoose: "In today's market, 75% of resumes are rejected by robots before a human ever sees them. Our Resume AI is built on the same LLM architecture used by top recruiters. We don't just 'write' resumes; we engineer profiles that trigger high-relevance scores in modern Applicant Tracking Systems (ATS).",
        businessImpact: ["3x higher interview callback rate on average.", "Instant keyword-optimization based on real-time job descriptions.", "Professional formatting that passes through any parsing engine.", "Strategic content placement that emphasizes ROI, not just tasks."],
        howItWorks: [
            { step: 1, title: "Data Ingestion", desc: "Upload your raw experience or link your LinkedIn profile." },
            { step: 2, title: "Target Analysis", desc: "Paste the job description of your dream role." },
            { step: 3, title: "AI Optimization", desc: "Generate a perfectly tailored, ATS-ready resume in 30 seconds." }
        ],
        requirements: ["Desktop or Mobile browser access.", "Active ShardaHub account.", "Internet connection for LLM processing."],
        similar: ['image', 'code']
    },

    // --- SAAS HUB ---
    'saas-sync': {
        id: 'saas-sync',
        title: 'E-Commerce Sync Master',
        category: 'SaaS Solutions',
        tagline: 'The Backbone of Modern Commerce. Real-Time Multi-Platform Inventory Sync.',
        price: 2999,
        ogPrice: 15999,
        rating: 4.7,
        reviews: '856',
        students: '3,200',
        author: 'ShardaHub Enterprise',
        lastUpdated: '01/2026',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        icon: 'bi-cloud-check',
        plans: [
            { id: 'saas-free', name: 'Community', price: 0, features: ['Sync 1 Store', 'Up to 50 SKUs', 'Daily Sync Speed'] },
            { id: 'saas-basic', name: 'Growth Basic', price: 2999, features: ['Sync 3 Stores', 'Up to 1000 SKUs', 'Hourly Sync Speed', 'Basic Analytics'] },
            { id: 'saas-advance', name: 'Enterprise Advance', price: 9999, features: ['Unlimited Stores', 'Unlimited SKUs', 'Instant Sync (0.5s)', 'Dedicated Account Manager'] }
        ],
        whyChoose: "Managing inventory across Shopify, Amazon, and eBay is a logistical nightmare. Master Sync provides a unified 'Brain' for your business. When you sell one item on Amazon, your Shopify stock updates in 0.5 seconds. No more overselling, no more manual updates, just pure automation.",
        businessImpact: ["Eliminate human error in inventory management.", "Unified dashboard for all sales channels.", "Real-time low-stock alerts and automated reordering.", "End-to-end encryption for all customer and sales data."],
        howItWorks: [
            { step: 1, title: "Connect Stores", desc: "Link your API keys for Shopify, Amazon, and eBay." },
            { step: 2, title: "Global Map", desc: "Map your SKUs across all platforms in our visual mapper." },
            { step: 3, title: "Go Live", desc: "Watch your inventory sync globally in real-time." }
        ],
        requirements: ["Active store accounts (Shopify/Amazon/eBay).", "API Access credentials.", "Minimum 10 SKUs recommended for full utility."],
        similar: ['analytics', 'crm']
    },

    // --- GAMES ---
    'cyber-pulse': {
        id: 'cyber-pulse',
        title: 'Cyber Pulse Arena',
        category: 'Gaming',
        tagline: 'Fueled by Adrenaline. Powered by ShardaHub AI.',
        price: 0,
        ogPrice: 999,
        rating: 4.9,
        reviews: '12,000',
        students: '25,000',
        author: 'Sharda Games',
        lastUpdated: '01/2026',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        icon: 'bi-joystick',
        plans: [
            { id: 'game-free', name: 'Recruit', price: 0, features: ['Access to Basic Arenas', 'Standard Avatar', 'Daily 10 Credits'] },
            { id: 'game-basic', name: 'Elite Basic', price: 199, features: ['Access to All Arenas', 'Tier-2 Weapon Skins', 'Daily 500 Credits'] },
            { id: 'game-advance', name: 'Legend Advance', price: 999, features: ['VIP Tournament Access', 'Exclusive AI Abilities', 'Daily 5000 Credits', 'No Adverts'] }
        ],
        whyChoose: "Don't just play; dominate. Cyber Pulse credits unlock the most advanced AI-driven skins, power-ups, and special abilities in the ShardaHub gaming ecosystem. Our credits are instant, secure, and globally recognized across all Cyber Pulse arenas.",
        businessImpact: ["Unlocks exclusive Tier-1 AI weapon skins.", "Instant access to high-stakes tournament servers.", "Double XP boost for the first 24 hours of use.", "Cross-platform compatibility (Mobile, PC, Web)."],
        howItWorks: [
            { step: 1, title: "Purchase", desc: "Select your tier and checkout via Razorpay." },
            { step: 2, title: "Sync", desc: "Access is instantly added to your ShardaHub ID." },
            { step: 3, title: "Play", desc: "Equip your new assets and enter the Cyber Pulse arena." }
        ],
        requirements: ["Active Cyber Pulse account.", "Stable internet connection.", "Compatible GPU for 60FPS gaming."],
        similar: ['agribot', 'drone-kit']
    },

    // --- OTHER CORE PRODUCTS ---
    'image': {
        id: 'image',
        title: 'PixelGen AI Master',
        category: 'AI Tools',
        tagline: 'From Imagination to 4K Reality. The Ultimate Generative Art Suite.',
        price: 899,
        ogPrice: 3499,
        rating: 4.8,
        reviews: '1,850',
        students: '8,200',
        author: 'ShardaHub Creative AI',
        lastUpdated: '02/2026',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        icon: 'bi-image',
        plans: [
            { id: 'img-free', name: 'Artist Free', price: 0, features: ['10 Images/mo', 'SDXL Model'] },
            { id: 'img-basic', name: 'Pro Artist', price: 899, features: ['500 Images/mo', '4K Upscaling', 'Custom LoRAs'] },
            { id: 'img-advance', name: 'Creative Advance', price: 2999, features: ['Unlimited Generations', '商業ライセンス', 'Dedicated GPU Node'] }
        ],
        whyChoose: "Stock photos are generic. Our PixelGen AI uses custom-trained models to generate unique, high-fidelity assets tailored to your brand. Whether it's hyper-realistic photography or futuristic concept art, we provide the tools to visualize any concept instantly.",
        businessImpact: ["Zero royalties—you own everything you generate.", "10x faster design workflow for marketing teams.", "Batch generation for consistent social media branding.", "Upscaling tech for print-ready 300DPI quality."],
        howItWorks: [
            { step: 1, title: "Prompt Engineering", desc: "Describe your vision in natural language." },
            { step: 2, title: "Style Selection", desc: "Choose from 50+ artistic presets and lighting profiles." },
            { step: 3, title: "Render & Refine", desc: "Genereate and upscale your masterpiece in seconds." }
        ],
        requirements: ["Modern browser.", "Credit-based or Pro subscription.", "Stable internet for GPU processing."],
        similar: ['resume', 'code']
    }
};

window.ShardaProducts = ShardaProducts;

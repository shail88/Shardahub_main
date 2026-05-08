/**
 * ShardaHub Database Seeder
 * Use this to populate your Supabase database with initial expert content.
 */

async function seedDatabase() {
    console.log("Starting ShardaHub Seeding...");

    const sampleProducts = [
        {
            id: 'resume',
            title: 'Resume AI Builder Pro',
            product_type: 'ai',
            tagline: 'Stop Being Filtered. Start Getting Hired with ATS-Dominating AI.',
            description: "In today's market, 75% of resumes are rejected by robots before a human ever sees them. Our Resume AI is built on the same LLM architecture used by top recruiters. We don't just 'write' resumes; we engineer profiles that trigger high-relevance scores in modern Applicant Tracking Systems (ATS).",
            price_inr: 499,
            image_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800',
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            is_active: true,
            meta_data: {
                business_impact: ["3x higher interview callback rate.", "Real-time keyword optimization.", "Professional formatting."],
                requirements: ["Desktop Browser", "Active Account", "Internet Connection"],
                workflow: [
                    { step: 1, title: "Data Ingestion", desc: "Upload experience or link LinkedIn." },
                    { step: 2, title: "Target Analysis", desc: "Paste the job description." },
                    { step: 3, title: "AI Optimization", desc: "Generate ATS-ready resume." }
                ]
            }
        },
        {
            id: 'saas-sync',
            title: 'E-Commerce Sync Master',
            product_type: 'saas',
            tagline: 'Real-Time Multi-Platform Inventory Sync.',
            description: "Managing inventory across Shopify, Amazon, and eBay is a logistical nightmare. Master Sync provides a unified 'Brain' for your business.",
            price_inr: 2999,
            image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800',
            is_active: true,
            meta_data: {
                business_impact: ["Eliminate overselling.", "Unified dashboard.", "Instant sync (0.5s)."],
                requirements: ["Store API Keys", "Active Inventory"],
                workflow: [
                    { step: 1, title: "Connect", desc: "Link store API keys." },
                    { step: 2, title: "Map", desc: "Map SKUs across platforms." },
                    { step: 3, title: "Sync", desc: "Go live globally." }
                ]
            }
        }
    ];

    const sampleTiers = [
        { product_id: 'resume', name: 'Free Starter', price_inr: 0, action_url: 'dashboard.html' },
        { product_id: 'resume', name: 'Professional', price_inr: 499, action_url: 'dashboard.html' },
        { product_id: 'resume', name: 'Expert Advance', price_inr: 1499, action_url: 'dashboard.html' },
        { product_id: 'saas-sync', name: 'Community', price_inr: 0, action_url: 'saas/index.html' },
        { product_id: 'saas-sync', name: 'Growth Basic', price_inr: 2999, action_url: 'saas/index.html' },
        { product_id: 'saas-sync', name: 'Enterprise Advance', price_inr: 9999, action_url: 'saas/index.html' }
    ];

    try {
        // 1. Seed Products
        const { error: pErr } = await supabase.from('products').upsert(sampleProducts);
        if (pErr) throw pErr;
        console.log("✅ Products Seeded");

        // 2. Seed Tiers
        const { error: tErr } = await supabase.from('product_tiers').upsert(sampleTiers);
        if (tErr) throw tErr;
        console.log("✅ Tiers Seeded");

        alert("Database seeded successfully! Refresh your pages.");
    } catch (err) {
        console.error("Seeding failed:", err);
        alert("Seed failed: " + err.message);
    }
}

// Make globally accessible
window.seedDatabase = seedDatabase;

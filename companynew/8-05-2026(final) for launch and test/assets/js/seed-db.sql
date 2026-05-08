-- 1. FIX SCHEMA
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_inr NUMERIC DEFAULT 0;

-- 2. SEED CORE PRODUCTS
INSERT INTO products (id, title, product_type, tagline, description, price_inr, image_url, video_url, is_active, meta_data)
VALUES 
(
  'resume', 
  'Resume AI Builder Pro', 
  'ai', 
  'Stop Being Filtered. Start Getting Hired with ATS-Dominating AI.', 
  'Our Resume AI is built on the same LLM architecture used by top recruiters. We don''t just write resumes; we engineer profiles that trigger high-relevance scores.', 
  499, 
  'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800', 
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
  true, 
  '{
    "business_impact": ["3x higher interview callback rate.", "Real-time keyword optimization.", "Professional formatting."],
    "requirements": ["Desktop Browser", "Active Account", "Internet Connection"],
    "workflow": [
        {"step": 1, "title": "Data Ingestion", "desc": "Upload experience or link LinkedIn."},
        {"step": 2, "title": "Target Analysis", "desc": "Paste the job description of your dream role."},
        {"step": 3, "title": "AI Optimization", "desc": "Generate a perfectly tailored resume."}
    ]
  }'::jsonb
),
(
  'saas-sync', 
  'E-Commerce Sync Master', 
  'saas', 
  'Real-Time Multi-Platform Inventory Sync.', 
  'Managing inventory across Shopify, Amazon, and eBay is a logistical nightmare. Master Sync provides a unified Brain for your business.', 
  2999, 
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800', 
  NULL, 
  true, 
  '{
    "business_impact": ["Eliminate human error in inventory.", "Unified dashboard for all channels.", "Instant sync (0.5s)."],
    "requirements": ["Store API Keys", "Active Inventory"],
    "workflow": [
        {"step": 1, "title": "Connect Stores", "desc": "Link your API keys for Shopify/Amazon."},
        {"step": 2, "title": "Global Map", "desc": "Map your SKUs across platforms."},
        {"step": 3, "title": "Go Live", "desc": "Watch inventory sync globally."}
    ]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title, 
  price_inr = EXCLUDED.price_inr,
  meta_data = EXCLUDED.meta_data,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description;

-- 3. SEED TIERS
INSERT INTO product_tiers (product_id, name, price_inr, action_url, features)
VALUES 
('resume', 'Free Starter', 0, 'dashboard.html', '["5 AI Credits", "Standard ATS Templates", "Community Support"]'::jsonb),
('resume', 'Professional', 499, 'dashboard.html', '["500 AI Credits", "Premium Layouts", "Priority Support"]'::jsonb),
('resume', 'Expert Advance', 1499, 'dashboard.html', '["Unlimited AI Credits", "Direct Expert Review", "White-label Export"]'::jsonb),
('saas-sync', 'Community', 0, 'saas/index.html', '["Sync 1 Store", "Daily Sync Speed", "Up to 50 SKUs"]'::jsonb),
('saas-sync', 'Growth Basic', 2999, 'saas/index.html', '["Sync 3 Stores", "Hourly Sync Speed", "Basic Analytics"]'::jsonb),
('saas-sync', 'Enterprise Advance', 9999, 'saas/index.html', '["Unlimited Stores", "Instant Sync (0.5s)", "Dedicated Manager"]'::jsonb)
ON CONFLICT DO NOTHING;

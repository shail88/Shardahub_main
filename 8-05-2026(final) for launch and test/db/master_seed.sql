-- ============================================================
-- SHARDAHUB MASTER SEED v5.0
-- Run this ENTIRE script in Supabase SQL Editor
-- Creates: schema extras + categories + all products + tiers
-- ============================================================

-- ── STEP 0: EXTRA COLUMNS (safe to re-run) ─────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_section TEXT DEFAULT 'course';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_section TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id UUID;

-- Extra tables referenced by code but not in original schema
CREATE TABLE IF NOT EXISTS public.razorpay_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_key TEXT UNIQUE NOT NULL,
    key_id TEXT NOT NULL,
    label TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 3,
    game_version TEXT DEFAULT '1.0',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, product_id, tier_id)
);

CREATE TABLE IF NOT EXISTS public.template_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 5,
    license_type TEXT DEFAULT 'personal',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.robotic_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
    stock_qty INTEGER DEFAULT 100,
    reserved_qty INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipping_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    zip_code TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','expired','cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_game_licenses_user ON public.game_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_template_downloads_user ON public.template_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_user ON public.shipping_addresses(user_id);

-- ── STEP 1: RPC FUNCTIONS ──────────────────────────────────

CREATE OR REPLACE FUNCTION update_user_spend(target_user_id UUID, amount_to_add NUMERIC)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.user_profiles SET total_spent = total_spent + amount_to_add WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_ai_credits(target_user_id UUID, amount_to_add INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.user_profiles SET ai_credits = ai_credits + amount_to_add WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_inventory(p_product_id TEXT, p_qty INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.robotic_inventory SET stock_qty = stock_qty - p_qty WHERE product_id = p_product_id AND stock_qty >= p_qty;
END;
$$;

-- ── STEP 2: CATEGORIES ─────────────────────────────────────

INSERT INTO public.categories (name, slug, icon, description) VALUES
('AI Tools',        'ai',        'bi-robot',           'Artificial Intelligence products and tools'),
('SaaS Solutions',  'saas',      'bi-cloud-check-fill','Enterprise software as a service'),
('Education',       'education', 'bi-mortarboard-fill','Online courses and learning'),
('Games',           'games',     'bi-controller',      'Games, licensing, and source code'),
('Robotics & IoT',  'robotics',  'bi-cpu-fill',        'Hardware kits and IoT products'),
('Templates',       'templates', 'bi-columns-gap',     'Digital design and code templates'),
('Shop',            'shop',      'bi-bag-check-fill',  'Physical and general digital goods')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, icon=EXCLUDED.icon, description=EXCLUDED.description;

-- ── STEP 3: PRODUCTS ──────────────────────────────────────

-- === AI PRODUCTS ===
INSERT INTO public.products (id, title, tagline, description, price_inr, og_price_inr, icon, image_url, video_url, product_type, razorpay_section, slug, rating, rating_count, enrollment_count, is_active, is_featured, meta_data, category_id)
SELECT
    p.id, p.title, p.tagline, p.description, p.price_inr, p.og_price_inr, p.icon, p.image_url, p.video_url, p.product_type, p.razorpay_section, p.slug, p.rating, p.rating_count, p.enrollment_count, p.is_active, p.is_featured, p.meta_data::jsonb, c.id
FROM (VALUES
    ('resume-ai', 'Resume AI Builder Pro', 'Stop Being Filtered. Start Getting Hired.', 'In today''s market, 75% of resumes are rejected by robots before a human sees them. Our Resume AI engineers profiles that trigger high-relevance scores in modern Applicant Tracking Systems (ATS).', 499, 1999, 'bi-file-earmark-person', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'ai', 'ai', 'resume-ai', 4.9, 1247, 8432, true, true,
    '{"business_impact":["3x higher interview callback rate","Real-time ATS keyword optimization","Professional formatting in 60 seconds"],"requirements":["Desktop Browser","Active Account","Internet Connection"],"workflow":[{"step":1,"title":"Data Ingestion","desc":"Upload your experience or link your LinkedIn profile."},{"step":2,"title":"Target Analysis","desc":"Paste the job description of your dream role."},{"step":3,"title":"AI Optimization","desc":"Generate a perfectly tailored ATS-ready resume instantly."}]}'),
    ('image-ai', 'Image AI Generator', 'Text to Stunning Visuals in Seconds.', 'Transform text prompts into professional images. Powered by state-of-the-art diffusion models with 4K output support.', 299, 999, 'bi-image', 'https://images.unsplash.com/photo-1547954575-855750c57bd3?w=800', NULL, 'ai', 'ai', 'image-ai', 4.7, 892, 5200, true, true,
    '{"business_impact":["1000+ art styles","4K resolution export","Commercial usage rights"],"requirements":["Modern Browser","Active Account"],"workflow":[{"step":1,"title":"Describe","desc":"Type your creative prompt."},{"step":2,"title":"Style Select","desc":"Choose from 50+ art styles."},{"step":3,"title":"Generate & Download","desc":"Get your image in seconds."}]}'),
    ('code-ai', 'Code AI Assistant', 'Your AI Pair Programmer — Available 24/7.', 'Debug, generate, and refactor code with enterprise-grade AI. Supports 40+ programming languages with context-aware suggestions.', 699, 1999, 'bi-code-slash', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800', NULL, 'ai', 'ai', 'code-ai', 4.8, 2100, 12300, true, false,
    '{"business_impact":["40+ programming languages","Context-aware debugging","Code review & security scan"],"requirements":["Browser / VS Code Extension","Internet Connection"],"workflow":[{"step":1,"title":"Paste Code","desc":"Input your code or describe what you need."},{"step":2,"title":"AI Analysis","desc":"Our model analyzes context and intent."},{"step":3,"title":"Get Solution","desc":"Receive corrected or generated code immediately."}]}'),
    ('chat-ai', 'ShardaChat AI', 'Enterprise Conversational AI.', 'Deploy a GPT-4 class chatbot on your website in minutes. Train on your own data, brand with your logo, and handle thousands of queries.', 1499, 4999, 'bi-chat-dots', 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=800', NULL, 'ai', 'ai', 'chat-ai', 4.6, 445, 3100, true, false,
    '{"business_impact":["Custom knowledge base","Unlimited conversations","Multi-language support"],"requirements":["API Access","Business Account"],"workflow":[{"step":1,"title":"Train","desc":"Upload your FAQs, docs, and product data."},{"step":2,"title":"Brand","desc":"Customize with your logo and colors."},{"step":3,"title":"Deploy","desc":"Embed 1 line of code on your website."}]}')
) AS p(id, title, tagline, description, price_inr, og_price_inr, icon, image_url, video_url, product_type, razorpay_section, slug, rating, rating_count, enrollment_count, is_active, is_featured, meta_data)
JOIN public.categories c ON c.slug = 'ai'
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, tagline=EXCLUDED.tagline, description=EXCLUDED.description, price_inr=EXCLUDED.price_inr, is_active=EXCLUDED.is_active, category_id=EXCLUDED.category_id, meta_data=EXCLUDED.meta_data;

-- === SAAS PRODUCTS ===
INSERT INTO public.products (id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data, category_id)
SELECT
    p.id, p.title, p.tagline, p.description, p.price_inr, p.og_price_inr, p.icon, p.image_url, p.product_type, p.razorpay_section, p.slug, p.rating, p.rating_count, p.is_active, p.is_featured, p.meta_data::jsonb, c.id
FROM (VALUES
    ('saas-sync', 'E-Commerce Sync Master', 'Real-Time Multi-Platform Inventory Sync.', 'Managing inventory across Shopify, Amazon, and eBay is a logistical nightmare. Master Sync provides a unified Brain for your business — eliminating overselling, saving hours, and boosting profits.', 2999, 7999, 'bi-arrow-repeat', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800', 'saas', 'saas', 'saas-sync', 4.8, 320, true, true,
    '{"business_impact":["Eliminate overselling errors","Unified multi-channel dashboard","Real-time sync in under 0.5s"],"requirements":["Shopify/Amazon/eBay Store","API Credentials"],"workflow":[{"step":1,"title":"Connect Stores","desc":"Link your API keys for all platforms."},{"step":2,"title":"Map SKUs","desc":"Map products across all channels."},{"step":3,"title":"Go Live","desc":"Watch inventory sync globally in real-time."}]}'),
    ('saas-crm', 'ShardaCRM Pro', 'Close More Deals. Manage Every Lead.', 'A blazing-fast CRM built for high-growth teams. Manage leads, track pipelines, automate follow-ups, and close more deals with built-in AI scoring.', 1999, 5999, 'bi-people-fill', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800', 'saas', 'saas', 'saas-crm', 4.7, 215, true, false,
    '{"business_impact":["Pipeline management","AI lead scoring","Automated follow-up sequences"],"requirements":["Business Email","Team of 1-500 users"],"workflow":[{"step":1,"title":"Import Leads","desc":"Upload CSV or connect your existing tools."},{"step":2,"title":"Score & Segment","desc":"AI scores leads by conversion probability."},{"step":3,"title":"Close Deals","desc":"Follow guided deal workflows and close faster."}]}'),
    ('saas-analytics', 'HubAnalytics', 'Enterprise Analytics Without the Enterprise Price.', 'Real-time dashboards, custom reports, and predictive analytics for your entire business. Build in minutes, not months.', 999, 3999, 'bi-bar-chart-line-fill', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800', 'saas', 'saas', 'saas-analytics', 4.5, 180, true, false,
    '{"business_impact":["Real-time KPI dashboards","30+ chart types","Export to PDF/Excel"],"requirements":["Data Source (DB, API, CSV)","Modern Browser"],"workflow":[{"step":1,"title":"Connect Data","desc":"Link your databases, APIs, or upload CSV."},{"step":2,"title":"Build Dashboards","desc":"Drag-and-drop chart builder."},{"step":3,"title":"Share & Monitor","desc":"Share with team or embed in your app."}]}')
) AS p(id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data)
JOIN public.categories c ON c.slug = 'saas'
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, tagline=EXCLUDED.tagline, price_inr=EXCLUDED.price_inr, is_active=EXCLUDED.is_active, category_id=EXCLUDED.category_id, meta_data=EXCLUDED.meta_data;

-- === COURSE PRODUCTS ===
INSERT INTO public.products (id, title, tagline, description, price_inr, og_price_inr, icon, image_url, video_url, product_type, razorpay_section, slug, rating, rating_count, enrollment_count, is_active, is_featured, meta_data, category_id)
SELECT
    p.id, p.title, p.tagline, p.description, p.price_inr, p.og_price_inr, p.icon, p.image_url, p.video_url, p.product_type, p.razorpay_section, p.slug, p.rating, p.rating_count, p.enrollment_count, p.is_active, p.is_featured, p.meta_data::jsonb, c.id
FROM (VALUES
    ('course-fullstack', 'Full Stack Web Development Bootcamp', 'From Zero to Full Stack Developer in 6 Months.', 'The most comprehensive web development course. Learn HTML, CSS, JavaScript, React, Node.js, PostgreSQL, and deploy real projects to production.', 4999, 14999, 'bi-code-slash', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'course', 'course', 'course-fullstack', 4.9, 4200, 25400, true, true,
    '{"business_impact":["Job-ready in 6 months","Build 15+ real projects","Certificate of completion"],"requirements":["No prior experience needed","A computer with internet"],"workflow":[{"step":1,"title":"Foundation","desc":"HTML, CSS, and JavaScript fundamentals."},{"step":2,"title":"Frontend","desc":"React, state management, and UI/UX."},{"step":3,"title":"Backend & Deploy","desc":"Node.js, databases, and cloud deployment."}]}'),
    ('course-python-ai', 'Python & AI/ML Masterclass', 'Master Python, Data Science & Machine Learning.', 'From Python basics to deploying real ML models. Covers Pandas, NumPy, Scikit-Learn, TensorFlow, and real-world AI projects.', 3999, 11999, 'bi-robot', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800', NULL, 'course', 'course', 'course-python-ai', 4.8, 3100, 18200, true, true,
    '{"business_impact":["12 real AI/ML projects","Industry-standard libraries","Data science career path"],"requirements":["Basic math knowledge","Python installation"],"workflow":[{"step":1,"title":"Python Fundamentals","desc":"Core Python programming and data structures."},{"step":2,"title":"Data Science","desc":"Pandas, NumPy, and visualization."},{"step":3,"title":"Machine Learning","desc":"Build and deploy real ML models."}]}'),
    ('course-ui-ux', 'UI/UX Design Pro', 'Design Apps That Users Love.', 'Master Figma, design systems, user research, and prototyping. Create stunning, user-centered digital products from scratch.', 2999, 8999, 'bi-palette-fill', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', NULL, 'course', 'course', 'course-ui-ux', 4.7, 1800, 9300, true, false,
    '{"business_impact":["Figma expertise","Portfolio of 10+ designs","Freelance-ready skills"],"requirements":["Figma (free)","Design curiosity"],"workflow":[{"step":1,"title":"Design Principles","desc":"Color, typography, and layout fundamentals."},{"step":2,"title":"Figma Mastery","desc":"Components, auto-layout, and prototyping."},{"step":3,"title":"Portfolio Projects","desc":"Build and present 10+ real-world designs."}]}'),
    ('course-digital-marketing', 'Digital Marketing Expert', 'Drive Traffic. Convert Leads. Build Brands.', 'Complete digital marketing: SEO, Google Ads, Meta Ads, Email Marketing, and Analytics. Real campaigns, real results.', 1999, 5999, 'bi-megaphone-fill', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', NULL, 'course', 'course', 'course-digital-marketing', 4.6, 2200, 14500, true, false,
    '{"business_impact":["Run live ad campaigns","SEO & content strategy","ROI-focused mindset"],"requirements":["Google/Meta account","Small ad budget (optional)"],"workflow":[{"step":1,"title":"Strategy","desc":"Build your marketing plan and set objectives."},{"step":2,"title":"Execute","desc":"Run SEO, ads, and email campaigns."},{"step":3,"title":"Analyze & Scale","desc":"Measure, optimize, and scale what works."}]}')
) AS p(id, title, tagline, description, price_inr, og_price_inr, icon, image_url, video_url, product_type, razorpay_section, slug, rating, rating_count, enrollment_count, is_active, is_featured, meta_data)
JOIN public.categories c ON c.slug = 'education'
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, tagline=EXCLUDED.tagline, price_inr=EXCLUDED.price_inr, is_active=EXCLUDED.is_active, category_id=EXCLUDED.category_id;

-- Link courses to courses table
INSERT INTO public.courses (id, instructor_name, level, duration_hours, total_lessons)
VALUES
    ('course-fullstack',        'Sharda Kumar',  'Beginner',     180, 240),
    ('course-python-ai',        'Dr. Priya Shah', 'Intermediate', 120, 180),
    ('course-ui-ux',            'Arjun Mehta',   'Beginner',     60,  90),
    ('course-digital-marketing','Rohan Verma',   'All Levels',   45,  75)
ON CONFLICT (id) DO UPDATE SET instructor_name=EXCLUDED.instructor_name, level=EXCLUDED.level, duration_hours=EXCLUDED.duration_hours;

-- === GAME PRODUCTS ===
INSERT INTO public.products (id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data, category_id)
SELECT
    p.id, p.title, p.tagline, p.description, p.price_inr, p.og_price_inr, p.icon, p.image_url, p.product_type, p.razorpay_section, p.slug, p.rating, p.rating_count, p.is_active, p.is_featured, p.meta_data::jsonb, c.id
FROM (VALUES
    ('game-space-runner', 'Space Runner X', 'Infinite Runner in the Cosmos.', 'High-octane sci-fi endless runner with procedurally generated levels, 4K assets, and cross-platform support. Available for Android, PC desktop, and Web browser.', 299, 999, 'bi-rocket', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800', 'game', 'game', 'game-space-runner', 4.8, 560, true, true,
    '{"platforms":["android","pc","web"],"genre":"Runner","engine":"Unity","business_impact":["60fps on all platforms","Leaderboard system","In-app achievements"],"requirements":["Android 7.0+ / Windows 10+","1GB RAM","Internet for leaderboards"],"workflow":[{"step":1,"title":"Choose Tier","desc":"Pick Demo, Full, or Source Code license."},{"step":2,"title":"Download","desc":"Instant download on purchase."},{"step":3,"title":"Play or Build","desc":"Launch the game or open source to modify."}]}'),
    ('game-puzzle-forge', 'Puzzle Forge', 'Mind-Bending Logic Puzzles.', 'Over 200 handcrafted puzzle levels with an integrated level editor. Perfect for solo players and developers wanting a white-label puzzle engine.', 199, 799, 'bi-puzzle', 'https://images.unsplash.com/photo-1580327344181-c1163234e5a0?w=800', 'game', 'game', 'game-puzzle-forge', 4.6, 340, true, false,
    '{"platforms":["web","android"],"genre":"Puzzle","engine":"HTML5","business_impact":["200+ unique levels","Built-in level editor","White-label ready"],"requirements":["Any Modern Browser","No Installation Required"],"workflow":[{"step":1,"title":"Pick Your License","desc":"Free demo or paid full version."},{"step":2,"title":"Play Immediately","desc":"Web-based — no download needed."},{"step":3,"title":"Build & Publish","desc":"Source code buyers can rebrand and publish."}]}'),
    ('game-battle-arena', 'Battle Arena Online', 'Real-Time Multiplayer Combat.', 'Fast-paced 2D multiplayer battle arena with real-time websocket gameplay. Supports up to 10 players per room. Full source code license available.', 0, 499, 'bi-shield-fill-exclamation', 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800', 'game', 'game', 'game-battle-arena', 4.5, 890, true, true,
    '{"platforms":["web","pc"],"genre":"Action","engine":"Phaser.js","business_impact":["Real-time multiplayer","WebSocket backend included","10 players per room"],"requirements":["Modern Browser","Node.js (for self-hosting)"],"workflow":[{"step":1,"title":"Get Access","desc":"Free play or purchase source license."},{"step":2,"title":"Play Online","desc":"Join or create a room instantly."},{"step":3,"title":"Host Yourself","desc":"Deploy on your own server with source code."}]}')
) AS p(id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data)
JOIN public.categories c ON c.slug = 'games'
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, tagline=EXCLUDED.tagline, price_inr=EXCLUDED.price_inr, is_active=EXCLUDED.is_active, category_id=EXCLUDED.category_id, meta_data=EXCLUDED.meta_data;

-- === ROBOTICS PRODUCTS ===
INSERT INTO public.products (id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data, category_id)
SELECT
    p.id, p.title, p.tagline, p.description, p.price_inr, p.og_price_inr, p.icon, p.image_url, p.product_type, p.razorpay_section, p.slug, p.rating, p.rating_count, p.is_active, p.is_featured, p.meta_data::jsonb, c.id
FROM (VALUES
    ('robot-starter-kit', 'ShardaBot Starter Kit', 'Build Your First Robot in a Weekend.', 'Complete beginner robotics kit with Arduino Uno, servo motors, ultrasonic sensor, chassis, and step-by-step video tutorials. No prior experience needed.', 3499, 5999, 'bi-robot', 'https://images.unsplash.com/photo-1563207153-f403bf289096?w=800', 'robotic', 'robotic', 'robot-starter-kit', 4.9, 420, true, true,
    '{"business_impact":["All components included","Video tutorial series","Community support forum"],"requirements":["No prior experience","Windows/Mac/Linux PC","USB Type-B cable"],"workflow":[{"step":1,"title":"Assemble","desc":"Follow illustrated guide to build chassis."},{"step":2,"title":"Program","desc":"Upload beginner sketches via Arduino IDE."},{"step":3,"title":"Deploy & Learn","desc":"Test sensors and add custom behaviors."}]}'),
    ('robot-arm-pro', 'RoboArm Pro 6-DOF', '6-Axis Programmable Robot Arm.', 'Professional-grade 6-DOF robotic arm with 500g payload capacity. Industrial-quality servos with Arduino + Raspberry Pi compatibility.', 12999, 19999, 'bi-cpu-fill', 'https://images.unsplash.com/photo-1487611459768-bd414656ea10?w=800', 'robotic', 'robotic', 'robot-arm-pro', 4.7, 180, true, false,
    '{"business_impact":["500g payload","6 degrees of freedom","Inverse kinematics library"],"requirements":["Intermediate programming","12V Power Supply","Linux/Windows PC"],"workflow":[{"step":1,"title":"Calibrate","desc":"Run calibration wizard to set servo limits."},{"step":2,"title":"Program Paths","desc":"Use Python SDK or visual interface."},{"step":3,"title":"Automate","desc":"Run automated pick-and-place sequences."}]}'),
    ('iot-home-hub', 'SmartHome IoT Hub', 'Control Everything. Automate Anything.', 'ESP32-based IoT hub to automate your home. 16-device control, voice command ready, works with Google Home and Alexa out of the box.', 1999, 3999, 'bi-house-gear-fill', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'robotic', 'robotic', 'iot-home-hub', 4.6, 290, true, false,
    '{"business_impact":["16-device control","Google Home & Alexa","Mobile app included"],"requirements":["WiFi Network","Android/iOS phone","Basic wiring knowledge"],"workflow":[{"step":1,"title":"Set Up Hub","desc":"Power on and connect to your WiFi."},{"step":2,"title":"Add Devices","desc":"Pair smart plugs, sensors, and lights."},{"step":3,"title":"Automate","desc":"Create routines via app or voice commands."}]}')
) AS p(id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data)
JOIN public.categories c ON c.slug = 'robotics'
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, tagline=EXCLUDED.tagline, price_inr=EXCLUDED.price_inr, is_active=EXCLUDED.is_active, category_id=EXCLUDED.category_id, meta_data=EXCLUDED.meta_data;

-- Add robotics inventory
INSERT INTO public.robotic_inventory (product_id, stock_qty) VALUES
('robot-starter-kit', 50),
('robot-arm-pro', 20),
('iot-home-hub', 100)
ON CONFLICT (product_id) DO UPDATE SET stock_qty=EXCLUDED.stock_qty;

-- === TEMPLATE PRODUCTS ===
INSERT INTO public.products (id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data, category_id)
SELECT
    p.id, p.title, p.tagline, p.description, p.price_inr, p.og_price_inr, p.icon, p.image_url, p.product_type, p.razorpay_section, p.slug, p.rating, p.rating_count, p.is_active, p.is_featured, p.meta_data::jsonb, c.id
FROM (VALUES
    ('template-saas', 'SaaS Landing Page Kit', 'Launch Your SaaS in Hours, Not Weeks.', 'Premium Next.js + Tailwind SaaS template. Includes pricing, auth flows, dashboard shell, blog, and 50+ reusable components.', 1499, 4999, 'bi-window-stack', 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800', 'template', 'template', 'template-saas', 4.9, 680, true, true,
    '{"business_impact":["Next.js 14 App Router","Stripe/Razorpay ready","Dark & Light mode"],"requirements":["Node.js 18+","Basic React knowledge"],"workflow":[{"step":1,"title":"Download","desc":"Get source code with one click."},{"step":2,"title":"Customize","desc":"Edit config, colors, and copy."},{"step":3,"title":"Deploy","desc":"Push to Vercel in minutes."}]}'),
    ('template-portfolio', 'Developer Portfolio Pro', 'Stand Out From 1000 Generic Portfolios.', 'Award-winning animated portfolio template. Built with React, GSAP animations, and 3D elements. Used by 2,000+ developers to land jobs.', 699, 1999, 'bi-person-badge-fill', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800', 'template', 'template', 'template-portfolio', 4.8, 1200, true, false,
    '{"business_impact":["GSAP animations","3D card effects","Mobile-first responsive"],"requirements":["Node.js 16+","Basic HTML/CSS"],"workflow":[{"step":1,"title":"Pick Style","desc":"Choose from 5 included themes."},{"step":2,"title":"Add Content","desc":"Fill in your data in a single JSON file."},{"step":3,"title":"Deploy Free","desc":"Host free on GitHub Pages or Netlify."}]}'),
    ('template-ecommerce', 'E-Commerce Starter Kit', 'Full eCommerce Store in 1 Day.', 'Complete React + Node.js e-commerce template with Razorpay payments, product catalog, cart, admin panel, and order management.', 2499, 7999, 'bi-cart-check-fill', 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=800', 'template', 'template', 'template-ecommerce', 4.7, 430, true, true,
    '{"business_impact":["Razorpay payment integration","Admin dashboard","Product management"],"requirements":["Node.js 18+","PostgreSQL/MongoDB"],"workflow":[{"step":1,"title":"Configure","desc":"Set your DB and Razorpay keys."},{"step":2,"title":"Add Products","desc":"Upload products via admin panel."},{"step":3,"title":"Launch","desc":"Deploy to your server and start selling."}]}')
) AS p(id, title, tagline, description, price_inr, og_price_inr, icon, image_url, product_type, razorpay_section, slug, rating, rating_count, is_active, is_featured, meta_data)
JOIN public.categories c ON c.slug = 'templates'
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, tagline=EXCLUDED.tagline, price_inr=EXCLUDED.price_inr, is_active=EXCLUDED.is_active, category_id=EXCLUDED.category_id, meta_data=EXCLUDED.meta_data;

-- ── STEP 4: PRODUCT TIERS ─────────────────────────────────

-- AI Tiers
INSERT INTO public.product_tiers (product_id, name, price_inr, features, daily_limit, monthly_limit, is_free, is_popular, tier_level)
VALUES
-- Resume AI
('resume-ai','Free Starter',0,'["5 AI generations/day","Standard ATS templates","Community support","Watermarked export"]'::jsonb,5,-1,true,false,1),
('resume-ai','Professional',499,'["100 AI generations/day","Premium ATS templates","Priority support","Clean PDF export","ATS score checker"]'::jsonb,100,-1,false,true,2),
('resume-ai','Expert Advance',1499,'["Unlimited generations","Direct expert review","White-label export","LinkedIn optimizer","Interview prep AI"]'::jsonb,-1,-1,false,false,3),
-- Image AI
('image-ai','Free Starter',0,'["3 images/day","512x512 resolution","Standard styles","Watermarked"]'::jsonb,3,-1,true,false,1),
('image-ai','Basic',299,'["50 images/day","2048x2048 resolution","50+ art styles","No watermark"]'::jsonb,50,-1,false,true,2),
('image-ai','Advance Pro',999,'["Unlimited images","4K resolution","Custom fine-tuning","Commercial license","API access"]'::jsonb,-1,-1,false,false,3),
-- Code AI
('code-ai','Free Starter',0,'["10 queries/day","Standard responses","6 languages","Community help"]'::jsonb,10,-1,true,false,1),
('code-ai','Developer',699,'["200 queries/day","Extended context","40+ languages","Code review"]'::jsonb,200,-1,false,true,2),
('code-ai','Team Advance',1999,'["Unlimited queries","Team workspace","Security scanning","CI/CD integration"]'::jsonb,-1,-1,false,false,3),
-- Chat AI
('chat-ai','Starter',0,'["1 chatbot","100 conversations/month","Basic customization","ShardaHub branding"]'::jsonb,-1,100,true,false,1),
('chat-ai','Business',1499,'["3 chatbots","10,000 conversations/month","Custom branding","Analytics dashboard"]'::jsonb,-1,10000,false,true,2),
('chat-ai','Enterprise',4999,'["Unlimited chatbots","Unlimited conversations","White-label","Dedicated support","Custom training"]'::jsonb,-1,-1,false,false,3)
ON CONFLICT DO NOTHING;

-- SaaS Tiers
INSERT INTO public.product_tiers (product_id, name, price_inr, features, is_free, is_popular, is_subscription, duration_days, tier_level)
VALUES
-- E-Commerce Sync
('saas-sync','Community',0,'["Sync 1 store","Daily sync speed","Up to 50 SKUs","Basic reports"]'::jsonb,true,false,false,0,1),
('saas-sync','Growth Basic',2999,'["Sync 3 stores","Hourly sync","Up to 5000 SKUs","Analytics","Email alerts"]'::jsonb,false,true,true,30,2),
('saas-sync','Enterprise Advance',9999,'["Unlimited stores","Real-time sync (0.5s)","Unlimited SKUs","Dedicated manager","API access"]'::jsonb,false,false,true,30,3),
-- ShardaCRM
('saas-crm','Starter',0,'["Up to 100 contacts","Basic pipeline","Email integration","Mobile app"]'::jsonb,true,false,false,0,1),
('saas-crm','Pro',1999,'["Unlimited contacts","AI lead scoring","Automation workflows","Priority support"]'::jsonb,false,true,true,30,2),
('saas-crm','Enterprise',5999,'["Everything in Pro","Custom integrations","Dedicated account manager","White-label"]'::jsonb,false,false,true,30,3),
-- HubAnalytics
('saas-analytics','Free',0,'["3 dashboards","7-day data history","Basic charts","CSV export"]'::jsonb,true,false,false,0,1),
('saas-analytics','Business',999,'["Unlimited dashboards","1-year data history","30+ chart types","Team sharing","PDF reports"]'::jsonb,false,true,true,30,2),
('saas-analytics','Enterprise',3999,'["Everything in Business","Predictive analytics","Custom SQL queries","Dedicated infra"]'::jsonb,false,false,true,30,3)
ON CONFLICT DO NOTHING;

-- Course Tiers
INSERT INTO public.product_tiers (product_id, name, price_inr, features, is_free, is_popular, tier_level)
VALUES
-- Full Stack Bootcamp
('course-fullstack','Free Preview',0,'["First 5 lessons free","Community access","Certificate not included"]'::jsonb,true,false,1),
('course-fullstack','Full Access',4999,'["240 video lessons","Lifetime access","Certificate","Project reviews","Job board access"]'::jsonb,false,true,2),
('course-fullstack','Mentorship',12999,'["Everything in Full","1-on-1 weekly mentoring","Resume review","Interview prep","Job guarantee"]'::jsonb,false,false,3),
-- Python & AI
('course-python-ai','Free Preview',0,'["First 5 lessons free","Community forum","No certificate"]'::jsonb,true,false,1),
('course-python-ai','Full Access',3999,'["180 lessons","Lifetime access","Projects + datasets","Certificate"]'::jsonb,false,true,2),
('course-python-ai','Pro Bundle',9999,'["Everything in Full","Live sessions","Portfolio review","LinkedIn optimization"]'::jsonb,false,false,3),
-- UI/UX
('course-ui-ux','Free Preview',0,'["5 free lessons","Figma basics","Community"]'::jsonb,true,false,1),
('course-ui-ux','Full Access',2999,'["90 lessons","Figma files included","Certificate","Portfolio projects"]'::jsonb,false,true,2),
-- Digital Marketing
('course-digital-marketing','Free Preview',0,'["Intro modules","Marketing templates","Community"]'::jsonb,true,false,1),
('course-digital-marketing','Full Access',1999,'["75 lessons","Ad campaign practice","Certificate"]'::jsonb,false,true,2)
ON CONFLICT DO NOTHING;

-- Game Tiers
INSERT INTO public.product_tiers (product_id, name, price_inr, features, is_free, is_popular, tier_level, license_type)
VALUES
-- Space Runner X
('game-space-runner','Demo',0,'["Play 5 levels","Leaderboard access","Ad-supported"]'::jsonb,true,false,1,'personal'),
('game-space-runner','Full Game',299,'["All 50 levels","No ads","Offline play","Cloud saves","All characters"]'::jsonb,false,true,2,'personal'),
('game-space-runner','Source Code',2999,'["Full game + source","Unity project files","Modify & republish","Commercial license"]'::jsonb,false,false,3,'commercial'),
('game-space-runner','Enterprise',9999,'["Source + art assets","White-label rights","Dedicated support","Custom branding"]'::jsonb,false,false,4,'enterprise'),
-- Puzzle Forge
('game-puzzle-forge','Demo',0,'["First 30 levels","Basic puzzles","Web play only"]'::jsonb,true,false,1,'personal'),
('game-puzzle-forge','Full Game',199,'["All 200 levels","Level editor","Android APK","No ads"]'::jsonb,false,true,2,'personal'),
('game-puzzle-forge','Source + Resell',1999,'["Full source code","Level editor source","Commercial license","Resell rights"]'::jsonb,false,false,3,'commercial'),
-- Battle Arena
('game-battle-arena','Free Play',0,'["Play online free","5 maps","Community match","Limited customization"]'::jsonb,true,false,1,'personal'),
('game-battle-arena','Full License',999,'["All 15 maps","Custom characters","Replay system","Private rooms"]'::jsonb,false,true,2,'personal'),
('game-battle-arena','Source Code',4999,'["Full WebSocket source","Node.js backend","Self-host rights","Commercial license"]'::jsonb,false,false,3,'commercial')
ON CONFLICT DO NOTHING;

-- Robotics Tiers
INSERT INTO public.product_tiers (product_id, name, price_inr, features, is_free, is_popular, tier_level)
VALUES
-- Starter Kit
('robot-starter-kit','Basic Kit',3499,'["Arduino Uno","4 servo motors","Ultrasonic sensor","Chassis + wheels","Setup guide"]'::jsonb,false,true,1),
('robot-starter-kit','Pro Kit',5499,'["Everything in Basic","Bluetooth module","IR sensors","LCD display","10 project tutorials"]'::jsonb,false,false,2),
-- RoboArm Pro
('robot-arm-pro','Arm Only',12999,'["6-DOF arm","Industrial servos","Python SDK","Documentation"]'::jsonb,false,true,1),
('robot-arm-pro','Arm + Controller',17999,'["Everything in Arm Only","Raspberry Pi 4","Pre-loaded software","Camera module"]'::jsonb,false,false,2),
-- IoT Hub
('iot-home-hub','Hub Basic',1999,'["ESP32 hub","16-device control","Mobile app","Google/Alexa"]'::jsonb,false,true,1),
('iot-home-hub','Smart Home Bundle',4999,'["Hub Basic","8 smart plugs","4 sensors","1 year cloud subscription"]'::jsonb,false,false,2)
ON CONFLICT DO NOTHING;

-- Template Tiers
INSERT INTO public.product_tiers (product_id, name, price_inr, features, is_free, is_popular, tier_level, license_type)
VALUES
-- SaaS Template
('template-saas','Personal',1499,'["Full source code","Personal use license","1 year updates","Community support"]'::jsonb,false,true,1,'personal'),
('template-saas','Commercial',3999,'["Everything in Personal","Commercial license","Client use allowed","Priority support","Figma files"]'::jsonb,false,false,2,'commercial'),
-- Portfolio
('template-portfolio','Personal',699,'["Full source code","Personal use","1 year updates"]'::jsonb,false,true,1,'personal'),
('template-portfolio','Extended',1999,'["Everything in Personal","Commercial use","Remove attribution","Priority support"]'::jsonb,false,false,2,'commercial'),
-- E-Commerce
('template-ecommerce','Starter',2499,'["Full source code","Personal/1 store use","6 months updates","Setup guide"]'::jsonb,false,true,1,'personal'),
('template-ecommerce','Agency',7999,'["Everything in Starter","Unlimited client use","Lifetime updates","White-label","Priority support"]'::jsonb,false,false,2,'commercial')
ON CONFLICT DO NOTHING;

-- ── STEP 5: RAZORPAY ACCOUNTS ─────────────────────────────

INSERT INTO public.razorpay_accounts (section_key, key_id, label) VALUES
('course',   'rzp_test_YOUR_COURSE_KEY',   'ShardaHub Courses'),
('ai',       'rzp_test_YOUR_AI_KEY',       'ShardaHub AI Lab'),
('saas',     'rzp_test_YOUR_SAAS_KEY',     'ShardaHub SaaS'),
('game',     'rzp_test_YOUR_GAME_KEY',     'ShardaHub Games'),
('template', 'rzp_test_YOUR_TEMPLATE_KEY', 'ShardaHub Templates'),
('robotic',  'rzp_test_YOUR_ROBOTIC_KEY',  'ShardaHub Robotics')
ON CONFLICT (section_key) DO UPDATE SET label=EXCLUDED.label;

-- ── STEP 6: COURSE CURRICULUM SAMPLES ─────────────────────

-- Full Stack Course Modules
INSERT INTO public.course_modules (id, course_id, title, order_index) VALUES
(uuid_generate_v4(),'course-fullstack','Module 1: HTML & CSS Foundations',1),
(uuid_generate_v4(),'course-fullstack','Module 2: JavaScript Essentials',2),
(uuid_generate_v4(),'course-fullstack','Module 3: React & Frontend',3),
(uuid_generate_v4(),'course-fullstack','Module 4: Node.js & Backend',4),
(uuid_generate_v4(),'course-fullstack','Module 5: Database & Deployment',5)
ON CONFLICT DO NOTHING;

-- ── DONE ──────────────────────────────────────────────────
-- All tables, categories, products, tiers, and curriculum are now seeded.
-- Next step: Update your Razorpay key IDs in the razorpay_accounts table.
SELECT 'ShardaHub Master Seed Complete!' AS status,
    (SELECT COUNT(*) FROM public.products WHERE is_active=true) AS active_products,
    (SELECT COUNT(*) FROM public.product_tiers) AS total_tiers,
    (SELECT COUNT(*) FROM public.categories) AS total_categories;

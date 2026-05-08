-- ==============================================================================
-- SHARDAHUB ULTIMATE ENTERPRISE SCHEMA (CLEAN RESET)
-- Version: 4.0 (Master Relational Blueprint)
-- Target Platform: PostgreSQL / Supabase
-- Description: Absolute final database structure with 30+ tables.
-- ==============================================================================

-- 1. FORCE RESET (Uncomment the next line to wipe existing tables and start 100% fresh)
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. IDENTITY & AUTHENTICATION
-- ==============================================================================

DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Optional, handled by Supabase Auth
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'Guest' CHECK (role IN ('Guest', 'Registered', 'Pro', 'Student', 'Subscriber', 'Admin')),
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TABLE IF EXISTS public.user_profiles CASCADE;
CREATE TABLE public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    bio TEXT,
    phone_number TEXT,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    zip_code TEXT,
    ai_credits INTEGER DEFAULT 5,
    game_credits INTEGER DEFAULT 10,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'expired')),
    subscription_plan TEXT DEFAULT 'Free',
    game_pass BOOLEAN DEFAULT FALSE,
    total_spent NUMERIC(15, 2) DEFAULT 0.00,
    last_login_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- ==============================================================================
-- 2. PRODUCTS, TIERS & CATEGORIES
-- ==============================================================================

DROP TABLE IF EXISTS public.categories CASCADE;
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT
);

DROP TABLE IF EXISTS public.products CASCADE;
CREATE TABLE public.products (
    id TEXT PRIMARY KEY, -- Anchor ID (e.g., 'resume-ai', 'saas-sync')
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    price_inr NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    og_price_inr NUMERIC(15, 2),
    icon TEXT,
    image_url TEXT,
    video_url TEXT,
    product_type TEXT DEFAULT 'generic' CHECK (product_type IN ('course','ai','saas','game','template','robotic','generic')),
    razorpay_section TEXT DEFAULT 'course',
    slug TEXT UNIQUE,
    rating NUMERIC(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    enrollment_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TABLE IF EXISTS public.product_tiers CASCADE;
CREATE TABLE public.product_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Free, Basic, Advance
    price_inr NUMERIC(15, 2) NOT NULL,
    burst_credits INTEGER DEFAULT 0,
    features JSONB NOT NULL,
    action_url TEXT, -- URL to redirect to (PlayStore, Subdomain, etc.)
    tier_level INTEGER DEFAULT 1,
    is_free BOOLEAN DEFAULT FALSE,
    is_subscription BOOLEAN DEFAULT FALSE,
    duration_days INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT -1,
    monthly_limit INTEGER DEFAULT -1,
    download_limit INTEGER DEFAULT -1,
    license_type TEXT DEFAULT 'personal' CHECK (license_type IN ('personal','commercial','enterprise','open-source')),
    is_popular BOOLEAN DEFAULT FALSE
);

-- ==============================================================================
-- 3. COURSE MANAGEMENT SYSTEM (CMS)
-- ==============================================================================

DROP TABLE IF EXISTS public.courses CASCADE;
CREATE TABLE public.courses (
    id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE, -- Standardized naming: id = product_id
    instructor_name TEXT,
    level TEXT CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
    duration_hours NUMERIC(5, 2),
    total_lessons INTEGER DEFAULT 0
);

DROP TABLE IF EXISTS public.course_modules CASCADE;
CREATE TABLE public.course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE, -- references courses.id
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

DROP TABLE IF EXISTS public.course_lessons CASCADE;
CREATE TABLE public.course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT CHECK (content_type IN ('video', 'article', 'quiz', 'resource')),
    content_url TEXT,
    duration_mins INTEGER,
    order_index INTEGER NOT NULL,
    is_preview BOOLEAN DEFAULT FALSE,
    thumbnail_url TEXT,
    description TEXT
);

DROP TABLE IF EXISTS public.lesson_progress CASCADE;
CREATE TABLE public.lesson_progress (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    last_watched_pos INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, lesson_id)
);

-- ==============================================================================
-- 4. ACCESS CONTROL (SUBSCRIPTIONS & ENROLLMENTS)
-- ==============================================================================

DROP TABLE IF EXISTS public.subscriptions CASCADE;
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expiry_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT FALSE
);

DROP TABLE IF EXISTS public.enrollments CASCADE;
CREATE TABLE public.enrollments (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, course_id)
);

-- ==============================================================================
-- 5. AI LAB & GENERATION HISTORY
-- ==============================================================================

DROP TABLE IF EXISTS public.ai_generations CASCADE;
CREATE TABLE public.ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tool_id TEXT NOT NULL, -- 'resume', 'image', 'code'
    prompt_input TEXT,
    result_output TEXT,
    credits_spent INTEGER DEFAULT 1,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. SAAS & ENTERPRISE (TEAM MANAGEMENT)
-- ==============================================================================

DROP TABLE IF EXISTS public.organizations CASCADE;
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.users(id),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TABLE IF EXISTS public.org_members CASCADE;
CREATE TABLE public.org_members (
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (org_id, user_id)
);

-- ==============================================================================
-- 7. GAMING HUB
-- ==============================================================================

DROP TABLE IF EXISTS public.game_stats CASCADE;
CREATE TABLE public.game_stats (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    total_games_played INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    highest_score BIGINT DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    exp_points BIGINT DEFAULT 0
);

DROP TABLE IF EXISTS public.game_match_history CASCADE;
CREATE TABLE public.game_match_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    game_id TEXT REFERENCES public.products(id),
    score BIGINT,
    result TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. COMMERCE ENGINE (CARTS & ORDERS)
-- ==============================================================================

DROP TABLE IF EXISTS public.carts CASCADE;
CREATE TABLE public.carts (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

DROP TABLE IF EXISTS public.cart_items CASCADE;
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.carts(user_id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1
);

DROP TABLE IF EXISTS public.wishlists CASCADE;
CREATE TABLE public.wishlists (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, product_id)
);

DROP TABLE IF EXISTS public.orders CASCADE;
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'completed', 'cancelled')),
    razorpay_order_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TABLE IF EXISTS public.order_items CASCADE;
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id),
    tier_id UUID REFERENCES public.product_tiers(id),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(15, 2) NOT NULL
);

DROP TABLE IF EXISTS public.payments CASCADE;
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT UNIQUE,
    method TEXT,
    status TEXT NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

DROP TABLE IF EXISTS public.coupons CASCADE;
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER CHECK (discount_percent > 0 AND discount_percent <= 100),
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expiry_date TIMESTAMP WITH TIME ZONE
);

-- ==============================================================================
-- 9. AFFILIATE & BLOG
-- ==============================================================================

DROP TABLE IF EXISTS public.affiliate_accounts CASCADE;
CREATE TABLE public.affiliate_accounts (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    referral_code TEXT UNIQUE NOT NULL,
    commission_rate NUMERIC(5, 2) DEFAULT 10.00,
    total_earnings NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended'))
);

DROP TABLE IF EXISTS public.referrals CASCADE;
CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES public.affiliate_accounts(user_id),
    referred_user_id UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

DROP TABLE IF EXISTS public.posts CASCADE;
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

DROP TABLE IF EXISTS public.reviews CASCADE;
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. NOTIFICATIONS & SUPPORT
-- ==============================================================================

DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

DROP TABLE IF EXISTS public.support_tickets CASCADE;
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

DROP TABLE IF EXISTS public.activity_logs CASCADE;
CREATE TABLE public.activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indices for Optimized Performance
CREATE INDEX idx_products_cat ON public.products(category_id);
CREATE INDEX idx_tiers_prod ON public.product_tiers(product_id);
CREATE INDEX idx_lessons_module ON public.course_lessons(module_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_ai_history_user ON public.ai_generations(user_id);

-- TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

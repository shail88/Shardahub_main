-- ==============================================================================
-- SHARDAHUB MISSING TABLES MIGRATION
-- File: db/migrations/002_missing_tables.sql
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- =====================================================
-- TABLE 1: PLANS (central billing plan definitions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                        -- 'Free', 'Pro', 'Premium'
    slug TEXT UNIQUE NOT NULL,                 -- 'free', 'pro', 'premium'
    subdomain TEXT,                            -- 'saas', 'learn', 'game', NULL=global
    price_monthly NUMERIC(10, 2) DEFAULT 0,
    price_yearly NUMERIC(10, 2) DEFAULT 0,
    razorpay_plan_id TEXT,                     -- Razorpay subscription plan ID
    features JSONB DEFAULT '[]',               -- ["AI Credits: 100", "All courses", ...]
    ai_credits_monthly INTEGER DEFAULT 0,
    game_credits_monthly INTEGER DEFAULT 0,
    download_limit INTEGER DEFAULT 0,          -- -1 = unlimited
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial plans
INSERT INTO public.plans (name, slug, subdomain, price_monthly, price_yearly, ai_credits_monthly, features) VALUES
('Free', 'free', NULL, 0, 0, 5, '["5 AI credits/month", "Free courses only", "Basic game access"]'::jsonb),
('Pro', 'pro', NULL, 499, 4999, 100, '["100 AI credits/month", "All courses", "Premium games", "Template downloads"]'::jsonb),
('Premium', 'premium', NULL, 999, 9999, -1, '["Unlimited AI credits", "All courses + certificates", "All games", "Commercial templates", "Priority support"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- TABLE 2: TOOLS_USAGE (AI tool usage tracking per user)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tools_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,                   -- 'resume-ai', 'image-gen', 'code-helper'
    subdomain TEXT DEFAULT 'saas',
    credits_consumed INTEGER DEFAULT 1,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    session_id TEXT,
    metadata JSONB DEFAULT '{}',
    used_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast per-user daily queries
CREATE INDEX IF NOT EXISTS idx_tools_usage_user_date ON public.tools_usage(user_id, used_at);

-- =====================================================
-- TABLE 3: GAME_ACCESS (which users can access which games)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    game_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    access_type TEXT DEFAULT 'free' CHECK (access_type IN ('free', 'paid', 'subscription', 'trial')),
    granted_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,                    -- NULL = lifetime access
    play_store_order_id TEXT,                  -- from Google Play verification
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_access_user ON public.game_access(user_id);

-- =====================================================
-- TABLE 4: TEMPLATE_PURCHASES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.template_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    template_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    license_type TEXT DEFAULT 'personal' CHECK (license_type IN ('personal', 'commercial', 'enterprise')),
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 5,           -- -1 = unlimited
    purchased_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, template_id)
);

-- =====================================================
-- TABLE 5: WEBHOOK_EVENTS (Razorpay/PlayStore audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,                    -- 'razorpay', 'playstore'
    event_type TEXT NOT NULL,                  -- 'payment.captured', 'subscription.activated'
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.webhook_events(provider, event_type);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- (Enable RLS + add base policies)
-- =====================================================

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Plans: public read
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans
    FOR SELECT USING (is_active = true);

-- Tools usage: users see own records
DROP POLICY IF EXISTS "tools_usage_own" ON public.tools_usage;
CREATE POLICY "tools_usage_own" ON public.tools_usage
    FOR ALL USING (auth.uid() = user_id);

-- Game access: users see own records
DROP POLICY IF EXISTS "game_access_own" ON public.game_access;
CREATE POLICY "game_access_own" ON public.game_access
    FOR SELECT USING (auth.uid() = user_id);

-- Template purchases: users see own records
DROP POLICY IF EXISTS "template_purchases_own" ON public.template_purchases;
CREATE POLICY "template_purchases_own" ON public.template_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Webhook events: only admins (service role bypasses this)
DROP POLICY IF EXISTS "webhook_events_admin" ON public.webhook_events;
CREATE POLICY "webhook_events_admin" ON public.webhook_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- =====================================================
-- ALSO: Add RLS to existing tables (if not already done)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row
DROP POLICY IF EXISTS "users_own_data" ON public.users;
CREATE POLICY "users_own_data" ON public.users
    FOR ALL USING (auth.uid() = id);

-- Profile: own access
DROP POLICY IF EXISTS "profiles_own_data" ON public.user_profiles;
CREATE POLICY "profiles_own_data" ON public.user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Subscriptions: own access
DROP POLICY IF EXISTS "subscriptions_own_data" ON public.subscriptions;
CREATE POLICY "subscriptions_own_data" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Orders: own access
DROP POLICY IF EXISTS "orders_own_data" ON public.orders;
CREATE POLICY "orders_own_data" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- Products: public read (no auth required)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
    FOR SELECT USING (is_active = true);

-- Enrollments: own access
DROP POLICY IF EXISTS "enrollments_own_data" ON public.enrollments;
CREATE POLICY "enrollments_own_data" ON public.enrollments
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- STORED PROCEDURE: Update game stats safely
-- =====================================================
CREATE OR REPLACE FUNCTION update_game_stats(p_user_id UUID, p_score BIGINT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.game_stats (user_id, total_games_played, highest_score, exp_points)
    VALUES (p_user_id, 1, p_score, p_score / 10)
    ON CONFLICT (user_id) DO UPDATE SET
        total_games_played = game_stats.total_games_played + 1,
        highest_score = GREATEST(game_stats.highest_score, EXCLUDED.highest_score),
        exp_points = game_stats.exp_points + (p_score / 10);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE!
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query → Paste → Run
-- =====================================================

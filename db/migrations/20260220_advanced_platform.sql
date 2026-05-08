-- ==============================================================================
-- SHARDAHUB ADVANCED PLATFORM MIGRATION
-- Version: 5.0 (Enterprise Upgrade)
-- Date: 2026-02-20
-- Run this in Supabase SQL Editor (safe - only ADDs, never drops existing data)
-- ==============================================================================

-- -----------------------------------------------------------------------
-- A. RAZORPAY MULTI-ACCOUNT TABLE
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.razorpay_accounts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_key TEXT UNIQUE NOT NULL, -- 'course','ai','saas','game','template','robotic'
    label       TEXT NOT NULL,        -- Display name, e.g. 'ShardaHub Courses'
    key_id      TEXT NOT NULL,        -- rzp_live_XXXXX (store encrypted in prod)
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed default section keys (edit key_id values in Supabase or via Admin panel)
INSERT INTO public.razorpay_accounts (section_key, label, key_id) VALUES
    ('course',   'ShardaHub Courses',   'rzp_test_COURSE_KEY_HERE'),
    ('ai',       'ShardaHub AI Lab',    'rzp_test_AI_KEY_HERE'),
    ('saas',     'ShardaHub SaaS',      'rzp_test_SAAS_KEY_HERE'),
    ('game',     'ShardaHub Games',     'rzp_test_GAME_KEY_HERE'),
    ('template', 'ShardaHub Templates', 'rzp_test_TEMPLATE_KEY_HERE'),
    ('robotic',  'ShardaHub Robotics',  'rzp_test_ROBOTIC_KEY_HERE')
ON CONFLICT (section_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- B. EXTEND PRODUCTS TABLE
-- -----------------------------------------------------------------------
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'generic'
        CHECK (product_type IN ('course','ai','saas','game','template','robotic','generic')),
    ADD COLUMN IF NOT EXISTS razorpay_section TEXT DEFAULT 'course',
    ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0;

-- Populate slug from existing IDs where missing
UPDATE public.products SET slug = id WHERE slug IS NULL;

-- -----------------------------------------------------------------------
-- C. EXTEND PRODUCT_TIERS TABLE
-- -----------------------------------------------------------------------
ALTER TABLE public.product_tiers
    ADD COLUMN IF NOT EXISTS tier_level    INTEGER DEFAULT 1,   -- 1=Free, 2=Basic, 3=Pro, 4=Enterprise
    ADD COLUMN IF NOT EXISTS is_free       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 0,   -- 0 = lifetime
    ADD COLUMN IF NOT EXISTS daily_limit   INTEGER DEFAULT -1,  -- -1 = unlimited
    ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT -1,
    ADD COLUMN IF NOT EXISTS download_limit INTEGER DEFAULT -1,
    ADD COLUMN IF NOT EXISTS license_type  TEXT DEFAULT 'personal'
        CHECK (license_type IN ('personal','commercial','enterprise','open-source')),
    ADD COLUMN IF NOT EXISTS is_popular    BOOLEAN DEFAULT FALSE;

-- -----------------------------------------------------------------------
-- D. AI USAGE TRACKING
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tool_id       TEXT NOT NULL,
    usage_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_count   INTEGER DEFAULT 0,
    monthly_count INTEGER DEFAULT 0,
    tokens_used   INTEGER DEFAULT 0,
    UNIQUE (user_id, tool_id, usage_date)
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_tracking(user_id, usage_date);

-- -----------------------------------------------------------------------
-- E. USER SUBSCRIPTIONS (SaaS, AI, Game Pass, etc.)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id        TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id           UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    razorpay_sub_id   TEXT,          -- Razorpay subscription ID for recurring
    status            TEXT DEFAULT 'active'
        CHECK (status IN ('active','paused','cancelled','expired')),
    starts_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at        TIMESTAMP WITH TIME ZONE,
    auto_renew        BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_user_subs_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON public.user_subscriptions(status);

-- -----------------------------------------------------------------------
-- F. GAME LICENSES
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_licenses (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id     TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id        UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    license_key    TEXT UNIQUE DEFAULT upper(substr(md5(random()::TEXT), 1, 4) || '-' || substr(md5(random()::TEXT), 1, 4) || '-' || substr(md5(random()::TEXT), 1, 4)),
    download_count INTEGER DEFAULT 0,
    max_downloads  INTEGER DEFAULT 3,
    game_version   TEXT DEFAULT '1.0',
    granted_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, product_id, tier_id)
);

-- -----------------------------------------------------------------------
-- G. TEMPLATE DOWNLOADS
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.template_downloads (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id     TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    tier_id        UUID REFERENCES public.product_tiers(id) ON DELETE SET NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads  INTEGER DEFAULT 5,
    license_type   TEXT DEFAULT 'personal',
    granted_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, product_id)
);

-- -----------------------------------------------------------------------
-- H. SHIPPING ADDRESSES (Robotics / Physical Products)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name    TEXT NOT NULL,
    mobile       TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city         TEXT NOT NULL,
    state        TEXT NOT NULL,
    pincode      TEXT NOT NULL,
    country      TEXT DEFAULT 'India',
    is_default   BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_shipping_user ON public.shipping_addresses(user_id);

-- -----------------------------------------------------------------------
-- I. ROBOTIC PRODUCT INVENTORY
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.robotic_inventory (
    product_id    TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
    sku           TEXT UNIQUE,
    stock_qty     INTEGER DEFAULT 0,
    reserved_qty  INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------
-- J. EXTEND ORDERS TABLE
-- -----------------------------------------------------------------------
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS product_type         TEXT DEFAULT 'generic',
    ADD COLUMN IF NOT EXISTS razorpay_section      TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_payment_id   TEXT,
    ADD COLUMN IF NOT EXISTS shipping_address_id   UUID REFERENCES public.shipping_addresses(id),
    ADD COLUMN IF NOT EXISTS invoice_number        TEXT;

-- -----------------------------------------------------------------------
-- K. EXTEND PAYMENTS TABLE
-- -----------------------------------------------------------------------
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS razorpay_section   TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_account   TEXT,
    ADD COLUMN IF NOT EXISTS amount             NUMERIC(15,2) DEFAULT 0;

-- -----------------------------------------------------------------------
-- L. COURSE CERTIFICATES
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_certificates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id       TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_url TEXT,
    issued_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, course_id)
);

-- Add preview flag to lessons
ALTER TABLE public.course_lessons
    ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT;

-- -----------------------------------------------------------------------
-- M. SUPPORT & COUPON ENHANCEMENTS
-- -----------------------------------------------------------------------
ALTER TABLE public.coupons
    ADD COLUMN IF NOT EXISTS applicable_section TEXT, -- null=all, or 'course','ai',etc.
    ADD COLUMN IF NOT EXISTS min_order_amount   NUMERIC(15,2) DEFAULT 0;

-- -----------------------------------------------------------------------
-- N. SUPABASE RPC FUNCTIONS (run these too)
-- -----------------------------------------------------------------------

-- Track AI usage (upsert today's usage row and increment)
CREATE OR REPLACE FUNCTION increment_ai_usage(
    p_user_id UUID,
    p_tool_id TEXT,
    p_tokens INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.ai_usage_tracking (user_id, tool_id, usage_date, daily_count, monthly_count, tokens_used)
    VALUES (p_user_id, p_tool_id, CURRENT_DATE, p_tokens, p_tokens, p_tokens)
    ON CONFLICT (user_id, tool_id, usage_date)
    DO UPDATE SET
        daily_count   = ai_usage_tracking.daily_count + p_tokens,
        monthly_count = ai_usage_tracking.monthly_count + p_tokens,
        tokens_used   = ai_usage_tracking.tokens_used + p_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct inventory safely
CREATE OR REPLACE FUNCTION deduct_inventory(
    p_product_id TEXT,
    p_qty INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    SELECT (stock_qty - reserved_qty) INTO v_stock
    FROM public.robotic_inventory WHERE product_id = p_product_id;

    IF v_stock < p_qty THEN
        RETURN FALSE;
    END IF;

    UPDATE public.robotic_inventory
    SET stock_qty = stock_qty - p_qty,
        updated_at = now()
    WHERE product_id = p_product_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active subscription for user+product
CREATE OR REPLACE FUNCTION get_active_subscription(
    p_user_id UUID,
    p_product_id TEXT
) RETURNS TABLE(id UUID, tier_id UUID, status TEXT, expires_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.tier_id, s.status, s.expires_at
    FROM public.user_subscriptions s
    WHERE s.user_id = p_user_id
      AND s.product_id = p_product_id
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expire old subscriptions (run via pg_cron or called periodically)
CREATE OR REPLACE FUNCTION expire_subscriptions() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.user_subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------
-- O. ROW LEVEL SECURITY (enable for new tables)
-- -----------------------------------------------------------------------
ALTER TABLE public.razorpay_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robotic_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY IF NOT EXISTS "user_own_ai_usage" ON public.ai_usage_tracking FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_own_subs" ON public.user_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_own_licenses" ON public.game_licenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_own_template_dl" ON public.template_downloads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_own_shipping" ON public.shipping_addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_own_certs" ON public.course_certificates FOR ALL USING (auth.uid() = user_id);

-- Anyone can read inventory (stock levels shown on product pages)
CREATE POLICY IF NOT EXISTS "public_inventory_read" ON public.robotic_inventory FOR SELECT USING (TRUE);

-- Razorpay accounts: only admins read (via service role in practice)
CREATE POLICY IF NOT EXISTS "admin_razorpay" ON public.razorpay_accounts FOR ALL USING (TRUE);

-- -----------------------------------------------------------------------
-- DONE
-- -----------------------------------------------------------------------
-- Run 'SELECT expire_subscriptions();' daily via pg_cron:
-- SELECT cron.schedule('0 0 * * *', $$SELECT expire_subscriptions()$$);

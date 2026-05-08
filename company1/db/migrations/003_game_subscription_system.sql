-- ==============================================================================
-- SHARDAHUB GAME SUBSCRIPTION SYSTEM
-- Migration: 003_game_subscription_system.sql
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Description: Removes old tier/demo/source-code model.
--              Introduces clean subscription-based game access.
-- ==============================================================================

-- =====================================================
-- STEP 1: GAME PLANS
-- Defines Free, Pro, Enterprise subscription levels
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                        -- 'Free', 'Pro', 'Enterprise'
    slug TEXT UNIQUE NOT NULL,                 -- 'free', 'pro', 'enterprise'
    price_monthly NUMERIC(10,2) DEFAULT 0,
    price_yearly  NUMERIC(10,2) DEFAULT 0,
    razorpay_plan_id TEXT,                     -- set after creating plan in Razorpay
    color TEXT DEFAULT '#6b7280',              -- badge colour for UI
    icon  TEXT DEFAULT 'bi-controller',        -- bootstrap icon
    features JSONB DEFAULT '[]',               -- ["All free games", "No ads", ...]
    game_limit INTEGER DEFAULT 3,              -- how many games user can access (-1 = all)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the 3 plans
INSERT INTO public.game_plans (name, slug, price_monthly, price_yearly, color, icon, game_limit, features) VALUES
(
  'Free',
  'free',
  0, 0,
  '#10b981',
  'bi-play-circle',
  3,
  '["Access to 3 free games","Basic game stats","Community support"]'::jsonb
),
(
  'Pro',
  'pro',
  199, 1999,
  '#6366f1',
  'bi-controller',
  -1,
  '["All Pro + Free games","Priority support","Download game apps","Play Store access links","Detailed stats & leaderboard"]'::jsonb
),
(
  'Enterprise',
  'enterprise',
  499, 4999,
  '#f59e0b',
  'bi-trophy',
  -1,
  '["All games (Free + Pro + Enterprise)","Team dashboard","Bulk access management","Dedicated support","Early access to new games","No source code sharing — premium access only"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- STEP 2: GAMES TABLE
-- Clean game model — no tiers, no source code fields
-- =====================================================
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,              -- URL-friendly identifier
    description TEXT,
    tagline TEXT,
    image_url TEXT,
    trailer_url TEXT,                       -- YouTube embed URL for preview
    play_store_url TEXT,                    -- Google Play Store link
    app_store_url TEXT,                     -- Apple App Store (optional)
    genre TEXT DEFAULT 'Action',           -- Action, Puzzle, Strategy, etc.
    required_plan TEXT NOT NULL DEFAULT 'free'
        REFERENCES public.game_plans(slug) ON UPDATE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    total_players INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_games_plan   ON public.games(required_plan);
CREATE INDEX IF NOT EXISTS idx_games_active ON public.games(is_active);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION touch_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_games_updated_at ON public.games;
CREATE TRIGGER trg_games_updated_at
    BEFORE UPDATE ON public.games
    FOR EACH ROW EXECUTE FUNCTION touch_games_updated_at();

-- =====================================================
-- STEP 3: GAME SUBSCRIPTIONS
-- Tracks which user is on which plan, and when it expires
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_slug TEXT NOT NULL REFERENCES public.game_plans(slug) ON UPDATE CASCADE,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active','expired','cancelled','paused')),
    razorpay_subscription_id TEXT,
    razorpay_payment_id TEXT,
    amount_paid NUMERIC(10,2),
    started_at  TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ,               -- NULL = lifetime (rare edge case)
    cancelled_at TIMESTAMPTZ,
    auto_renew  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gamesub_user   ON public.game_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_gamesub_expires ON public.game_subscriptions(expires_at);

-- =====================================================
-- STEP 4: ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.game_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_subscriptions  ENABLE ROW LEVEL SECURITY;

-- game_plans: anyone can read active plans
DROP POLICY IF EXISTS "game_plans_public_read" ON public.game_plans;
CREATE POLICY "game_plans_public_read" ON public.game_plans
    FOR SELECT USING (is_active = true);

-- games: anyone can read active games (plan check is done in JS, not DB)
DROP POLICY IF EXISTS "games_public_read" ON public.games;
CREATE POLICY "games_public_read" ON public.games
    FOR SELECT USING (is_active = true);

-- games: only admins can write
DROP POLICY IF EXISTS "games_admin_write" ON public.games;
CREATE POLICY "games_admin_write" ON public.games
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    );

-- game_subscriptions: users see only their own
DROP POLICY IF EXISTS "gamesub_own_read" ON public.game_subscriptions;
CREATE POLICY "gamesub_own_read" ON public.game_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- game_subscriptions: admins see all
DROP POLICY IF EXISTS "gamesub_admin_all" ON public.game_subscriptions;
CREATE POLICY "gamesub_admin_all" ON public.game_subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    );

-- =====================================================
-- STEP 5: HELPER FUNCTION
-- Returns the active plan slug for a given user
-- (used in Edge Functions and backend checks)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_game_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_plan TEXT;
BEGIN
    SELECT plan_slug INTO v_plan
    FROM public.game_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY
        CASE plan_slug
            WHEN 'enterprise' THEN 3
            WHEN 'pro'        THEN 2
            WHEN 'free'       THEN 1
            ELSE 0
        END DESC
    LIMIT 1;

    RETURN COALESCE(v_plan, 'free');  -- default = free
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: SEED SAMPLE GAMES (remove in production)
-- =====================================================
INSERT INTO public.games (title, slug, tagline, description, genre, required_plan, is_featured, play_store_url)
VALUES
  ('Space Runner',       'space-runner',     'Race through the cosmos',   'An endless runner across the galaxy. Dodge asteroids and collect stars.', 'Runner',   'free',       TRUE,  'https://play.google.com/store/apps/details?id=com.sharda.spacerunner'),
  ('Pixel Quest',        'pixel-quest',      'Classic pixel adventure',   'Retro-style RPG with hand-crafted levels and epic boss battles.',          'RPG',      'free',       FALSE, 'https://play.google.com/store/apps/details?id=com.sharda.pixelquest'),
  ('Tower Defense 3D',   'tower-defense-3d', 'Build. Defend. Conquer.',   'Strategic tower defense game with realistic 3D graphics.',                'Strategy', 'free',       FALSE, 'https://play.google.com/store/apps/details?id=com.sharda.td3d'),
  ('Shadow Strike',      'shadow-strike',    'Elite tactical combat',     'High-octane action game with stealth mechanics and stunning visuals.',    'Action',   'pro',        TRUE,  'https://play.google.com/store/apps/details?id=com.sharda.shadowstrike'),
  ('City Builder Pro',   'city-builder-pro', 'Build your dream city',     'Full-featured city simulation with real-world economics and disasters.',   'Simulation','pro',       FALSE, 'https://play.google.com/store/apps/details?id=com.sharda.citybuilder'),
  ('Mech Wars',          'mech-wars',        'Giant robots. Epic battles.','Multiplayer mech combat arena. Team up or fight solo.',                   'Action',   'pro',        FALSE, 'https://play.google.com/store/apps/details?id=com.sharda.mechwars'),
  ('Legend of Kingdoms', 'legend-kingdoms',  'Command armies. Rule empires.','Strategy MMO. Build alliances and conquer rival kingdoms.',             'Strategy', 'enterprise', TRUE,  'https://play.google.com/store/apps/details?id=com.sharda.legendofkingdoms'),
  ('VR Combat Zone',     'vr-combat-zone',   'Premium VR experience',     'Immersive VR combat with enterprise-exclusive arenas and tournaments.',    'VR',       'enterprise', FALSE, 'https://play.google.com/store/apps/details?id=com.sharda.vrcombat')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================================================
-- DONE! Verify with:
--   SELECT * FROM public.game_plans;
--   SELECT title, required_plan FROM public.games;
-- ==============================================================================

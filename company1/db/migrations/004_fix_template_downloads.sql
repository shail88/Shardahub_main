-- ==============================================================================
-- FIX TEMPLATE DOWNLOADS TABLE
-- Migration: 004_fix_template_downloads.sql
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Description: The frontend Javascript relies on `template_downloads` table, 
-- but earlier migrations accidentally created `template_purchases`. 
-- This script fixes the schema disconnect.
-- ==============================================================================

-- 1. Remove the incorrect table created by migration 002 (if it exists)
DROP TABLE IF EXISTS public.template_purchases CASCADE;

-- 2. Create the correct table that matches the Javascript code
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

-- 3. Enable RLS
ALTER TABLE public.template_downloads ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies mimicking the usual setup for user records
DROP POLICY IF EXISTS "user_own_template_downloads" ON public.template_downloads;
CREATE POLICY "user_own_template_downloads" 
    ON public.template_downloads 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Optional: Allow Admins Full Access
DROP POLICY IF EXISTS "admin_all_template_downloads" ON public.template_downloads;
CREATE POLICY "admin_all_template_downloads" 
    ON public.template_downloads 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- 5. Add custom RPC function to track downloads correctly (used in frontend)
CREATE OR REPLACE FUNCTION increment_template_downloads(p_user_id UUID, p_product_id TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.template_downloads 
    SET download_count = download_count + 1 
    WHERE user_id = p_user_id AND product_id = p_product_id AND download_count < max_downloads;
END;
$$;

-- Migration: Add action_url to product_tiers
-- Description: Adds a column to store redirect URLs for tiered access (e.g., PlayStore link).

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_tiers' AND column_name = 'action_url') THEN
        ALTER TABLE public.product_tiers ADD COLUMN action_url TEXT;
    END IF;
END $$;

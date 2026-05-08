-- Add role to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    message text,
    subject text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view contacts
CREATE POLICY "Admins can view contacts" ON public.contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Policy: Anyone can insert contacts (public inquiries)
CREATE POLICY "Anyone can insert contacts" ON public.contacts
    FOR INSERT WITH CHECK (true);

-- Update RLS for courses to allow admins to manage them
CREATE POLICY "Admins can manage courses" ON public.courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

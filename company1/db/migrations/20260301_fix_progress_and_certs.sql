-- Fix lesson_progress table
ALTER TABLE public.lesson_progress 
    ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Rename last_watched_pos to last_position if needed, or keep it. 
-- ShardaDB uses last_position, schema uses last_watched_pos.
-- Let's standardize on last_position for simplicity in JS.
ALTER TABLE public.lesson_progress RENAME COLUMN last_watched_pos TO last_position;

-- Ensure course_certificates table exists
CREATE TABLE IF NOT EXISTS public.course_certificates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id       TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_url TEXT,
    issued_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, course_id)
);

-- Fix existing records if course_id is still NULL
UPDATE public.lesson_progress lp
SET course_id = cm.course_id
FROM public.course_lessons cl
JOIN public.course_modules cm ON cl.module_id = cm.id
WHERE lp.lesson_id = cl.id AND (lp.course_id IS NULL OR lp.course_id = '');

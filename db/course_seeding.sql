-- ==============================================================================
-- SHARDAHUB COURSE SEEDING SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Ensure Education Category Exists
INSERT INTO public.categories (name, slug, icon, description)
VALUES ('Education', 'education', 'bi-mortarboard', 'Premium courses and digital learning materials.')
ON CONFLICT (slug) DO NOTHING;

-- 2. Variables for Category ID (Run this manually if needed, or use subqueries)
-- We will use subqueries to keep it simple.

-- 3. Seed Courses
-- Full Stack Web Development
INSERT INTO public.products (id, category_id, title, tagline, description, price_inr, og_price_inr, image_url, is_active)
VALUES (
    '101', 
    (SELECT id FROM public.categories WHERE slug = 'education'), 
    'Full Stack Web Development Bootcamp',
    'Become a full-stack web developer with just one course.',
    'HTML, CSS, Javascript, Node, React, MongoDB, Web3 and DApps.',
    499.00,
    3499.00,
    'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?q=80&w=2670&auto=format&fit=crop',
    TRUE
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price_inr = EXCLUDED.price_inr;

INSERT INTO public.courses (id, instructor_name, level, duration_hours, total_lessons)
VALUES ('101', 'Dr. Angela Yu', 'Beginner', 45.00, 50)
ON CONFLICT (id) DO NOTHING;

-- Python Mega Course
INSERT INTO public.products (id, category_id, title, tagline, description, price_inr, og_price_inr, image_url, is_active)
VALUES (
    '102', 
    (SELECT id FROM public.categories WHERE slug = 'education'), 
    'The Python Mega Course',
    'Build 10 Real World Apps.',
    'Become a Python programmer by learning how to build real-world applications.',
    399.00,
    2999.00,
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2664&auto=format&fit=crop',
    TRUE
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.courses (id, instructor_name, level, duration_hours, total_lessons)
VALUES ('102', 'Ardit Sulce', 'Intermediate', 33.00, 30)
ON CONFLICT (id) DO NOTHING;

-- Atomic Habits
INSERT INTO public.products (id, category_id, title, tagline, description, price_inr, og_price_inr, image_url, is_active)
VALUES (
    '105', 
    (SELECT id FROM public.categories WHERE slug = 'education'), 
    'Atomic Habits',
    'A proven framework for improving every day.',
    'No matter your goals, Atomic Habits offers a proven framework for improving--every day.',
    249.00,
    1299.00,
    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2612&auto=format&fit=crop',
    TRUE
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.courses (id, instructor_name, level, duration_hours, total_lessons)
VALUES ('105', 'James Clear', 'All Levels', 0.00, 0)
ON CONFLICT (id) DO NOTHING;

-- Resume AI Builder (Linked as a Course for Dashboard access)
INSERT INTO public.products (id, category_id, title, tagline, description, price_inr, og_price_inr, image_url, is_active)
VALUES (
    'resume', 
    (SELECT id FROM public.categories WHERE slug = 'education'), 
    'Resume AI Pro',
    'ATS-optimized resumes in seconds.',
    'Advanced AI-driven resume builder for modern career growth.',
    0.00,
    1299.00,
    'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400',
    TRUE
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.courses (id, instructor_name, level, duration_hours, total_lessons)
VALUES ('resume', 'ShardaHub AI', 'All Levels', 1.00, 5)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 4. Verify
-- ==============================================================================
SELECT p.title, c.instructor_name, p.price_inr 
FROM public.products p 
JOIN public.courses c ON p.id = c.id;


const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lkgqzieviqtrsoeffbnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZ3F6aWV2aXF0cnNvZWZmYm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Mzc0NDMsImV4cCI6MjA4NjIxMzQ0M30.GCRZALURGsMl3mX94JpCV7v-zr2Yl70zzLBWK_-JmH8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const categories = [
    { name: 'Games', slug: 'games', icon: 'bi-joystick' },
    { name: 'Templates', slug: 'templates', icon: 'bi-layout-text-window-reverse' },
    { name: 'Courses', slug: 'education', icon: 'bi-journal-bookmark' },
    { name: 'AI Tools', slug: 'ai', icon: 'bi-robot' },
    { name: 'SaaS Plans', slug: 'saas', icon: 'bi-cloud-check' },
    { name: 'Robotics', slug: 'robotics', icon: 'bi-cpu' }
];

async function seed() {
    console.log("Seeding categories...");
    for (const cat of categories) {
        const { data, error } = await supabase.from('categories').upsert([cat], { onConflict: 'slug' });
        if (error) console.error(`Error seeding ${cat.slug}:`, error.message);
        else console.log(`Seeded category: ${cat.slug}`);
    }
    console.log("Done.");
}

seed();

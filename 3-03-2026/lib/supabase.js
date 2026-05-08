
// ShardaHub Centralized Supabase Client
// This file handles all authentication and database interactions for the ShardaHub ecosystem.

// Configuration - Use var for idempotent loading
window.SUPABASE_URL = 'https://lkgqzieviqtrsoeffbnq.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZ3F6aWV2aXF0cnNvZWZmYm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Mzc0NDMsImV4cCI6MjA4NjIxMzQ0M30.GCRZALURGsMl3mX94JpCV7v-zr2Yl70zzLBWK_-JmH8';

// Initialize Supabase Client
window.getSupabase = function () {
    if (window.supabaseClientInstance) return window.supabaseClientInstance;

    // Check if the library is loaded
    if (!window.supabase || !window.supabase.createClient) {
        console.warn("Supabase library not found. Ensure the CDN script is loaded before this file.");
        return null;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase URL or Anon Key missing.");
        return null;
    }

    try {
        window.supabaseClientInstance = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        console.log("Supabase Client Initialized Successfully");
        return window.supabaseClientInstance;
    } catch (err) {
        console.error("Failed to create Supabase client:", err);
        return null;
    }
};

// Global accessor for other scripts (ensures it's initialized)
window.supabase = window.getSupabase();

/**
 * AUTHENTICATION HELPERS
 */

// Sign up a new user
async function signUp(email, password, fullName) {
    const client = window.getSupabase();
    if (!client) return { error: { message: "Supabase not initialized" } };

    console.log("Starting ShardaHub Registration...");
    const { data, error: authError } = await client.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName, role: 'Registered' } }
    });

    if (authError) return { data, error: authError };

    if (data.user) {
        try {
            console.log("Creating Identity record...");
            const { error: userError } = await client.from('users').insert([{
                id: data.user.id,
                email: email,
                full_name: fullName,
                role: 'Registered'
            }]);
            if (userError) console.warn("Users table insert failed (Check if table exists):", userError);

            console.log("Creating Profile record...");
            const { error: profileError } = await client.from('user_profiles').insert([{
                user_id: data.user.id,
                bio: '',
                ai_credits: 5,
                game_credits: 10
            }]);
            if (profileError) console.warn("Profiles table insert failed:", profileError);
        } catch (dbErr) {
            console.error("Database initialization failed:", dbErr);
        }
    }

    return { data, error: null };
}

async function signIn(email, password) {
    const client = window.getSupabase();
    if (!client) return { error: { message: "Supabase not initialized" } };
    return await client.auth.signInWithPassword({ email, password });
}

// Sign out current user
async function signOut() {
    const client = window.getSupabase();
    if (!client) return { error: { message: "Supabase not initialized" } };

    const { error } = await client.auth.signOut();
    if (!error) {
        window.location.href = (window.ShardaBaseUrl || './') + 'login.html';
    }
    return { error };
}

// Get current session/user with profile data
async function getCurrentUser() {
    const client = window.getSupabase();
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    // Attach profile data
    const { data: profile } = await client
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    user.profile = profile;
    return user;
}

/**
 * DATA HELPERS (GENERIC)
 */

async function getFromTable(tableName, query = '*') {
    const client = window.getSupabase();
    if (!client) return { error: { message: "Supabase not initialized" } };
    const { data, error } = await client.from(tableName).select(query);
    return { data, error };
}

async function insertIntoTable(tableName, record) {
    const client = window.getSupabase();
    if (!client) return { error: { message: "Supabase not initialized" } };
    const { data, error } = await client.from(tableName).insert([record]);
    return { data, error };
}

/**
 * SPECIFIC DOMAIN HELPERS
 */

// Fetch all active products
async function fetchProducts() {
    const client = window.getSupabase();
    if (!client) return { data: [], error: { message: "Supabase not initialized" } };

    return await client
        .from('products')
        .select(`
            *,
            categories(name, slug),
            product_tiers(*)
        `)
        .eq('is_active', true);
}

// Fetch single product with full expert details
async function fetchProductById(id) {
    const client = window.getSupabase();
    if (!client) return { data: null, error: { message: "Supabase not initialized" } };

    return await client
        .from('products')
        .select(`
            *,
            categories(name, slug),
            product_tiers(*)
        `)
        .eq('id', id)
        .single();
}

// Enroll user in a course
async function enrollInCourse(courseId) {
    const client = window.getSupabase();
    const user = await getCurrentUser();
    if (!user) return { error: 'Login required' };

    return await client
        .from('enrollments')
        .insert([{ user_id: user.id, course_id: courseId }]);
}

// Fetch user dashboard data (enrolled courses, stats)
async function getDashboardData() {
    const client = window.getSupabase();
    const user = await getCurrentUser();
    if (!user) return { error: 'Login required' };

    const enrollments = await client
        .from('enrollments')
        .select('*, courses(*)')
        .eq('user_id', user.id);

    const stats = await client
        .from('game_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

    return {
        enrollments: enrollments.data,
        stats: stats.data,
        error: enrollments.error || stats.error
    };
}

// Export for use in other scripts
window.shardaHubAuth = {
    signUp,
    signIn,
    signOut,
    getCurrentUser
};

window.shardaHubData = {
    fetchProducts,
    fetchProductById,
    enrollInCourse,
    getDashboardData,
    getFromTable,
    insertIntoTable
};


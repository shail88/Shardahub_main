/**
 * ShardaHub Central Data Proxy (ShardaDB)
 * Bridges the UI components to Supabase.
 * No local storage mock data—full live backend.
 */

var ShardaDB = window.ShardaDB || {
    init() {
        console.log("ShardaDB: Supabase Live Layer Active");
    },

    // --- USERS & PROFILES ---
    async getProfile(userId) {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        return data;
    },

    // --- COURSES & PRODUCTS ---
    async getCourses() {
        const { data } = await supabase
            .from('courses')
            .select('*, products(*)');
        // Flatten for older components expecting product-like objects
        return data ? data.map(d => ({ ...d.products, ...d })) : [];
    },

    async getCourseById(id) {
        const { data } = await supabase
            .from('courses')
            .select('*, products(*)')
            .eq('id', id)
            .single();
        return data ? { ...data.products, ...data } : null;
    },

    async getProductBySlug(slug) {
        return await window.shardaHubData.fetchProductById(slug);
    },

    // --- ADMIN CRUD (Products & Courses) ---
    async addCourse(courseData) {
        const product_id = courseData.slug || courseData.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

        // 1. Insert into Products
        const { error: pError } = await supabase.from('products').insert([{
            id: product_id,
            title: courseData.title,
            description: courseData.description,
            price_inr: courseData.price,
            image_url: courseData.thumbnail_url,
            category_id: (await supabase.from('categories').select('id').eq('slug', 'education').single()).data?.id,
            is_active: true
        }]);

        if (pError) return { error: pError.message };

        // 2. Insert into Courses
        const { error: cError } = await supabase.from('courses').insert([{
            id: product_id,
            instructor_name: courseData.instructor || 'ShardaHub Expert',
            level: courseData.level || 'Beginner',
            duration_hours: courseData.duration || 0
        }]);

        return { error: cError ? cError.message : null };
    },

    async updateCourse(id, courseData) {
        // 1. Update Products
        const { error: pError } = await supabase.from('products').update({
            title: courseData.title,
            description: courseData.description,
            price_inr: courseData.price,
            image_url: courseData.thumbnail_url
        }).eq('id', id);

        if (pError) return { error: pError.message };

        // 2. Update Courses
        const { error: cError } = await supabase.from('courses').update({
            instructor_name: courseData.instructor,
            level: courseData.level,
            duration_hours: courseData.duration
        }).eq('id', id);

        return { error: cError ? cError.message : null };
    },

    async deleteCourse(id) {
        // Cascades from products in schema
        const { error } = await supabase.from('products').delete().eq('id', id);
        return { error: error ? error.message : null };
    },

    // --- COMMERCE & ENROLLMENTS ---
    async getEnrollments(userId) {
        const { data } = await supabase
            .from('enrollments')
            .select('*, courses(*)')
            .eq('user_id', userId);
        return data || [];
    },

    async checkEnrollment(userId, courseId) {
        const { data } = await supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();
        return !!data;
    },

    // --- AI & CREDITS ---
    async deductAICredit(userId, amount = 1) {
        // Triggers RPC 'deduct_credits' in Supabase
        const { data, error } = await supabase.rpc('deduct_credits', {
            target_user_id: userId,
            amount_to_deduct: amount
        });
        return !error;
    }
};

window.ShardaDB = ShardaDB;
ShardaDB.init();

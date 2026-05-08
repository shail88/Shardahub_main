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
            .select('*, products(*, categories(name, slug))');
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

    // --- ADMIN CRUD (Master Hub) ---
    async upsertProduct(productData) {
        // Standardized ID generation if not provided
        const id = productData.id || productData.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

        // 1. Get Category ID if slug provided
        let categoryId = productData.category_id;
        if (productData.category_slug) {
            const { data: cat } = await supabase.from('categories').select('id').eq('slug', productData.category_slug).single();
            categoryId = cat?.id;
        }

        // 2. Insert/Update Products table
        const productPayload = {
            id: id,
            category_id: categoryId,
            title: productData.title,
            tagline: productData.tagline || '',
            description: productData.description || '',
            price_inr: productData.price || 0,
            image_url: productData.thumbnail_url || productData.image_url || '',
            video_url: productData.video_url || '',
            is_active: true,
            is_featured: false
        };

        const { error: pError } = await supabase.from('products').upsert([productPayload]);
        if (pError) {
            console.error("ShardaDB: Product Upsert Error", pError);
            return { error: pError.message };
        }

        // 3. Category-Specific Extensions (only for education/courses)
        if (productData.category_slug === 'education') {
            const coursePayload = {
                id: id,
                instructor_name: productData.instructor || 'ShardaHub Expert',
                level: productData.level || 'Beginner',
                duration_hours: productData.duration || 0,
                total_lessons: 0
            };
            const { error: cError } = await supabase.from('courses').upsert([coursePayload]);
            if (cError) {
                console.error("ShardaDB: Course Extension Upsert Error", cError);
                return { error: cError.message };
            }
        }

        return { success: true, id: id };
    },

    async deleteProduct(id) {
        // Cascades to courses/tiers in schema
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

    // --- CURRICULUM & PROGRESS ---
    async getCourseCurriculum(courseId) {
        // Fetch modules and lessons in one go if possible, or sequential
        const { data: modules, error: mErr } = await supabase
            .from('course_modules')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true });

        if (mErr) return [];

        // Fetch all lessons for these modules
        const moduleIds = modules.map(m => m.id);
        const { data: lessons, error: lErr } = await supabase
            .from('course_lessons')
            .select('*')
            .in('module_id', moduleIds)
            .order('order_index', { ascending: true });

        if (lErr) return modules.map(m => ({ ...m, lessons: [] }));

        // Group lessons into modules
        return modules.map(module => ({
            ...module,
            lessons: lessons.filter(lesson => lesson.module_id === module.id)
        }));
    },

    async getLessonProgress(userId, courseId) {
        // Fetch progress for all lessons in a course for a user
        const { data, error } = await supabase
            .from('lesson_progress')
            .select(`
                *,
                course_lessons!inner(
                    module_id,
                    course_modules!inner(course_id)
                )
            `)
            .eq('user_id', userId)
            .eq('course_lessons.course_modules.course_id', courseId);

        return data || [];
    },

    async updateLessonProgress(userId, lessonId, isCompleted = true) {
        const { error } = await supabase
            .from('lesson_progress')
            .upsert([{
                user_id: userId,
                lesson_id: lessonId,
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null
            }]);
        return !error;
    },

    // --- AI & CREDITS ---
    async deductAICredit(userId, amount = 1) {
        // Triggers RPC 'deduct_credits' in Supabase
        const { data, error } = await supabase.rpc('deduct_credits', {
            target_user_id: userId,
            amount_to_deduct: amount
        });
        return !error;
    },

    // --- PAYMENTS & CHECKOUT ---
    async recordPayment(paymentData) {
        console.log("ShardaDB: Recording Payment...", paymentData);
        const { user_id, razorpay_order_id, razorpay_payment_id, product_type, product_id, amount } = paymentData;

        try {
            // 1. Create Order
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert([{
                    user_id: user_id,
                    total_amount: amount,
                    order_status: 'completed',
                    razorpay_order_id: razorpay_order_id
                }])
                .select()
                .single();

            if (orderErr) throw orderErr;

            // 2. Create Order Item
            await supabase.from('order_items').insert([{
                order_id: order.id,
                product_id: product_id,
                unit_price: amount,
                quantity: 1
            }]);

            // 3. Create Payment Record
            await supabase.from('payments').insert([{
                order_id: order.id,
                razorpay_payment_id: razorpay_payment_id,
                status: 'paid',
                method: 'razorpay'
            }]);

            // 4. Fulfillment Logic
            if (product_type === 'COURSE') {
                console.log("Fulfilling Course Enrollment...");
                await supabase.from('enrollments').upsert([{
                    user_id: user_id,
                    course_id: product_id
                }]);
            } else if (product_type === 'AI_CREDITS' || product_type.includes('AI_')) {
                console.log("Fulfilling AI Credits...");
                // Determine credit amount based on type
                let credits = 50; // Default
                if (product_type === 'AI_PRO') credits = 100;

                // Using RPC to safely increment credits
                await supabase.rpc('increment_ai_credits', {
                    target_user_id: user_id,
                    amount_to_add: credits
                });
            }

            // 5. Update Total Spent in Profile
            await supabase.rpc('update_user_spend', {
                target_user_id: user_id,
                amount_to_add: amount
            });

            return { success: true };
        } catch (err) {
            console.error("ShardaDB: Payment recording failed", err);
            return { success: false, error: err.message };
        }
    }
};

window.ShardaDB = ShardaDB;
ShardaDB.init();

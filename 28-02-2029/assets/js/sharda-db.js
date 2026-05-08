/**
 * ShardaDB v2.0 — Upgraded Data Access Layer
 * Full Supabase proxy for: courses, AI, SaaS, games, templates, robotics, user mgmt
 */

const ShardaDB = {

    // ═══════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════
    async getProducts(type = null, limit = 50) {
        let q = supabase.from('products').select('*, categories(name,slug), product_tiers(*)').eq('is_active', true).limit(limit).order('created_at', { ascending: false });
        if (type) q = q.eq('product_type', type);
        const { data, error } = await q;
        return data || [];
    },

    async getProduct(id) {
        const { data } = await supabase.from('products').select('*, categories(name,slug), product_tiers(*), courses(*)').eq('id', id).single();
        return data;
    },

    async ensureUserRecord(userId, email, fullName = 'Sharda User') {
        // Check if user exists in public.users
        const { data: existing } = await supabase.from('users').select('id').eq('id', userId).limit(1);
        if (existing && existing.length > 0) return true;

        // Otherwise create it
        const { error } = await supabase.from('users').insert([{
            id: userId,
            email: email,
            full_name: fullName,
            role: 'Registered',
            created_at: new Date().toISOString()
        }]);
        return !error;
    },

    // ═══════════════════════════════════════════════
    // COURSES
    // ═══════════════════════════════════════════════
    async getCourseById(id) {
        const { data } = await supabase.from('courses').select('*, products(*)').eq('id', id).single();
        if (!data) return null;
        return {
            ...data,
            ...data.products,
            thumbnail_url: data.products?.image_url,
            price: data.products?.price_inr,
            instructor: data.instructor_name,
            duration: data.duration_hours ? data.duration_hours + ' Hours' : null,
            is_free: data.products?.price_inr === 0
        };
    },

    async getCourses(limit = 50) {
        const { data } = await supabase.from('courses').select('*, products(title, image_url, price_inr, rating, rating_count)').limit(limit).order('created_at', { ascending: false });
        return (data || []).map(c => ({ ...c, ...c.products }));
    },

    async getCourseCurriculum(courseId) {
        const { data: modules } = await supabase.from('course_modules').select('*, lessons(*)').eq('course_id', courseId).order('order_index', { ascending: true });
        if (!modules) return [];
        return modules.map(m => ({
            ...m,
            lessons: (m.lessons || []).sort((a, b) => a.order_index - b.order_index)
        }));
    },

    async getLessonProgress(userId, courseId) {
        const { data } = await supabase.from('lesson_progress').select('lesson_id, is_completed, last_position').eq('user_id', userId).eq('course_id', courseId);
        return data || [];
    },

    async updateLessonProgress(userId, lessonId, isCompleted, position = 0) {
        const { error } = await supabase.from('lesson_progress').upsert([{
            user_id: userId,
            lesson_id: lessonId,
            is_completed: isCompleted,
            last_position: position,
            updated_at: new Date().toISOString()
        }], { onConflict: 'user_id,lesson_id' });
        return !error;
    },

    async getEnrollments(userId) {
        const { data } = await supabase.from('enrollments').select('*, courses(*, products(*))').eq('user_id', userId).order('enrolled_at', { ascending: false });
        return data || [];
    },

    async enrollUser(userId, courseId) {
        const { data, error } = await supabase.from('enrollments').upsert([{
            user_id: userId,
            course_id: courseId,
            progress_percent: 0,
            enrolled_at: new Date().toISOString()
        }], { onConflict: 'user_id,course_id' }).select().single();
        return { data, error };
    },

    async issueCertificate(userId, courseId) {
        const { data, error } = await supabase.from('course_certificates').upsert([{
            user_id: userId,
            course_id: courseId,
            issued_at: new Date().toISOString()
        }], { onConflict: 'user_id,course_id' }).select().single();
        return { data, error };
    },

    // ═══════════════════════════════════════════════
    // AI USAGE
    // ═══════════════════════════════════════════════
    async trackAIUsage(userId, toolId, tokensUsed = 1) {
        const { data, error } = await supabase.rpc('increment_ai_usage', {
            p_user_id: userId,
            p_tool_id: toolId,
            p_tokens: tokensUsed
        });
        return { data, error };
    },

    async getAIUsage(userId, toolId = null, date = null) {
        const today = date || new Date().toISOString().split('T')[0];
        let q = supabase.from('ai_usage_tracking').select('*').eq('user_id', userId).eq('usage_date', today);
        if (toolId) q = q.eq('tool_id', toolId);
        const { data } = await q;
        return data || [];
    },

    async getAIHistory(userId, limit = 30) {
        const { data } = await supabase.from('ai_generations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
        return data || [];
    },

    async logAIGeneration(userId, toolId, prompt, creditsSpent = 1, status = 'success') {
        await supabase.from('ai_generations').insert([{
            user_id: userId,
            tool_id: toolId,
            prompt_preview: prompt?.substring(0, 120),
            credits_spent: creditsSpent,
            status,
            created_at: new Date().toISOString()
        }]);
    },

    // ═══════════════════════════════════════════════
    // SUBSCRIPTIONS (SaaS / AI)
    // ═══════════════════════════════════════════════
    async createSubscription(userId, productId, tierId, durationDays, razorpaySubId = null) {
        const expiresAt = durationDays
            ? new Date(Date.now() + durationDays * 86400000).toISOString()
            : null;
        const { data, error } = await supabase.from('user_subscriptions').upsert([{
            user_id: userId,
            product_id: productId,
            tier_id: tierId,
            razorpay_sub_id: razorpaySubId,
            status: 'active',
            starts_at: new Date().toISOString(),
            expires_at: expiresAt,
            auto_renew: !!razorpaySubId
        }], { onConflict: 'user_id,product_id' }).select().single();
        return { data, error };
    },

    async getActiveSubscription(userId, productId) {
        const { data } = await supabase.from('user_subscriptions').select('*, product_tiers(name,features,daily_limit,monthly_limit)').eq('user_id', userId).eq('product_id', productId).eq('status', 'active').order('created_at', { ascending: false }).limit(1);
        return data?.[0] || null;
    },

    async cancelSubscription(userId, productId) {
        const { error } = await supabase.from('user_subscriptions').update({ status: 'cancelled' }).eq('user_id', userId).eq('product_id', productId).eq('status', 'active');
        return !error;
    },

    async getUserSubscriptions(userId) {
        const { data } = await supabase.from('user_subscriptions').select('*, products(id,title,image_url,product_type), product_tiers(name)').eq('user_id', userId).order('created_at', { ascending: false });
        return data || [];
    },

    // ═══════════════════════════════════════════════
    // GAME LICENSES
    // ═══════════════════════════════════════════════
    async grantGameLicense(userId, productId, tierId, maxDownloads = 3, gameVersion = '1.0') {
        const { data, error } = await supabase.from('game_licenses').upsert([{
            user_id: userId,
            product_id: productId,
            tier_id: tierId,
            max_downloads: maxDownloads,
            game_version: gameVersion,
            granted_at: new Date().toISOString()
        }], { onConflict: 'user_id,product_id,tier_id' }).select().single();
        return { data, error };
    },

    async getGameLicenses(userId) {
        const { data } = await supabase.from('game_licenses').select('*, products(id,title,image_url)').eq('user_id', userId).order('granted_at', { ascending: false });
        return data || [];
    },

    async incrementGameDownload(userId, productId, tierId) {
        const { data: license } = await supabase.from('game_licenses').select('download_count,max_downloads').eq('user_id', userId).eq('product_id', productId).eq('tier_id', tierId).single();
        if (!license || license.download_count >= license.max_downloads) return false;
        await supabase.from('game_licenses').update({ download_count: license.download_count + 1 }).eq('user_id', userId).eq('product_id', productId).eq('tier_id', tierId);
        return true;
    },

    // ═══════════════════════════════════════════════
    // TEMPLATE DOWNLOADS
    // ═══════════════════════════════════════════════
    async grantTemplateAccess(userId, productId, tierId, maxDownloads = 5, licenseType = 'personal') {
        const { data, error } = await supabase.from('template_downloads').upsert([{
            user_id: userId,
            product_id: productId,
            tier_id: tierId,
            max_downloads: maxDownloads,
            license_type: licenseType,
            granted_at: new Date().toISOString()
        }], { onConflict: 'user_id,product_id' }).select().single();
        return { data, error };
    },

    async getTemplateDownloads(userId) {
        const { data } = await supabase.from('template_downloads').select('*, products(id,title,image_url,download_url)').eq('user_id', userId).order('granted_at', { ascending: false });
        return data || [];
    },

    async incrementTemplateDownload(userId, productId) {
        const { data, error } = await supabase.rpc('increment_template_downloads', { p_user_id: userId, p_product_id: productId });
        return !error;
    },

    // ═══════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════
    async createOrder(userId, totalAmount, section, rzpOrderId, shippingAddressId = null) {
        const { data, error } = await supabase.from('orders').insert([{
            user_id: userId,
            total_amount: totalAmount,
            razorpay_section: section,
            razorpay_order_id: rzpOrderId,
            shipping_address_id: shippingAddressId,
            status: 'pending',
            created_at: new Date().toISOString()
        }]).select().single();
        return { data, error };
    },

    async updateOrderStatus(orderId, status, rzpPaymentId = null) {
        const obj = { status };
        if (rzpPaymentId) obj.razorpay_payment_id = rzpPaymentId;
        await supabase.from('orders').update(obj).eq('id', orderId);
    },

    async getUserOrders(userId, section = null) {
        let q = supabase.from('orders').select('*, order_items(*, products(title,image_url)), shipping_addresses(*)').eq('user_id', userId).order('created_at', { ascending: false });
        if (section) q = q.eq('razorpay_section', section);
        const { data } = await q;
        return data || [];
    },

    // ═══════════════════════════════════════════════
    // ROBOTIC INVENTORY
    // ═══════════════════════════════════════════════
    async getInventory(productId) {
        const { data } = await supabase.from('robotic_inventory').select('*').eq('product_id', productId).single();
        return data;
    },

    async deductInventory(productId, qty = 1) {
        const { data, error } = await supabase.rpc('deduct_robotic_inventory', { p_product_id: productId, p_qty: qty });
        return !error;
    },

    async getAllInventory() {
        const { data } = await supabase.from('robotic_inventory').select('*, products(id,title)').order('stock_qty', { ascending: true });
        return data || [];
    },

    // ═══════════════════════════════════════════════
    // SHIPPING ADDRESSES
    // ═══════════════════════════════════════════════
    async getAddresses(userId) {
        const { data } = await supabase.from('shipping_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
        return data || [];
    },

    async addAddress(userId, addrObj) {
        const { data, error } = await supabase.from('shipping_addresses').insert([{ user_id: userId, ...addrObj }]).select().single();
        return { data, error };
    },

    async setDefaultAddress(userId, addressId) {
        await supabase.from('shipping_addresses').update({ is_default: false }).eq('user_id', userId);
        await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', addressId);
    },

    // ═══════════════════════════════════════════════
    // USER PROFILE
    // ═══════════════════════════════════════════════
    async getProfile(userId) {
        const { data } = await supabase.from('users').select('*').eq('id', userId).single();
        return data;
    },

    async updateProfile(userId, updates) {
        const { data, error } = await supabase.from('users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId).select().single();
        return { data, error };
    },

    async getDashboardStats(userId) {
        const [enrollRes, orderRes, subRes, licRes] = await Promise.all([
            supabase.from('enrollments').select('course_id, progress_percent', { count: 'exact' }).eq('user_id', userId),
            supabase.from('orders').select('total_amount', { count: 'exact' }).eq('user_id', userId).eq('status', 'paid'),
            supabase.from('user_subscriptions').select('id', { count: 'exact' }).eq('user_id', userId).eq('status', 'active'),
            supabase.from('game_licenses').select('id', { count: 'exact' }).eq('user_id', userId),
        ]);
        const totalSpend = (orderRes.data || []).reduce((a, o) => a + (o.total_amount || 0), 0);
        const avgProgress = enrollRes.data?.length ? Math.round(enrollRes.data.reduce((a, e) => a + (e.progress_percent || 0), 0) / enrollRes.data.length) : 0;
        return {
            enrollments: enrollRes.count || 0,
            totalOrders: orderRes.count || 0,
            totalSpend,
            activeSubscriptions: subRes.count || 0,
            gameLicenses: licRes.count || 0,
            avgCourseProgress: avgProgress
        };
    },

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════
    async getAdminStats() {
        const [userRes, orderRes, productRes, enrollRes] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('total_amount').eq('status', 'paid'),
            supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        ]);
        const totalRevenue = (orderRes.data || []).reduce((a, o) => a + (o.total_amount || 0), 0);
        return {
            totalUsers: userRes.count || 0,
            totalRevenue,
            activeProducts: productRes.count || 0,
            totalEnrollments: enrollRes.count || 0
        };
    },

    async getRecentOrders(limit = 20) {
        const { data } = await supabase.from('orders').select('*, users(email,full_name)').order('created_at', { ascending: false }).limit(limit);
        return data || [];
    },

    async getRecentUsers(limit = 10) {
        const { data } = await supabase.from('users').select('id,email,full_name,created_at,role').order('created_at', { ascending: false }).limit(limit);
        return data || [];
    },

    async getRevenueBySection() {
        const { data } = await supabase.from('orders').select('razorpay_section, total_amount').eq('status', 'paid');
        const map = {};
        (data || []).forEach(o => {
            const s = o.razorpay_section || 'other';
            map[s] = (map[s] || 0) + (o.total_amount || 0);
        });
        return map;
    },

    async getRazorpayAccounts() {
        const { data } = await supabase.from('razorpay_accounts').select('*').eq('is_active', true).order('section_key');
        return data || [];
    },

    async upsertRazorpayAccount(sectionKey, keyId, label) {
        const { data, error } = await supabase.from('razorpay_accounts').upsert([{ section_key: sectionKey, key_id: keyId, label, is_active: true }], { onConflict: 'section_key' }).select().single();
        return { data, error };
    },

    async getCoupons() {
        const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        return data || [];
    },

    async createCoupon(couponData) {
        const { data, error } = await supabase.from('coupons').insert([couponData]).select().single();
        return { data, error };
    },

    async toggleCoupon(couponId, isActive) {
        await supabase.from('coupons').update({ is_active: isActive }).eq('id', couponId);
    },

    // ═══════════════════════════════════════════════
    // PAYMENTS
    // ═══════════════════════════════════════════════
    async recordPayment(userId, orderId, amount, rzpPaymentId, rzpOrderId, section) {
        const { data, error } = await supabase.from('payments').insert([{
            user_id: userId,
            order_id: orderId,
            amount,
            razorpay_payment_id: rzpPaymentId,
            razorpay_order_id: rzpOrderId,
            razorpay_section: section,
            status: 'paid',
            paid_at: new Date().toISOString()
        }]).select().single();
        return { data, error };
    },

    async updateUserSpend(userId, amt) {
        await supabase.rpc('increment_user_spend', { p_user_id: userId, p_amount: amt });
    },

    // ═══════════════════════════════════════════════
    // PRODUCT CRUD (used by admin/script.js)
    // ═══════════════════════════════════════════════
    async upsertProduct(pData) {
        // Build the products row — map form fields → DB columns
        const productRow = {
            title: pData.title,
            tagline: pData.tagline || null,
            description: pData.description || null,
            price_inr: parseFloat(pData.price) || parseFloat(pData.price_inr) || 0,
            image_url: pData.thumbnail_url || pData.image_url || null,
            video_url: pData.video_url || null,
            is_active: true,
        };

        // Only include id when editing an existing product (non-empty string).
        // For new products, let Supabase auto-generate the UUID.
        if (pData.id && typeof pData.id === 'string' && pData.id.trim() !== '') {
            productRow.id = pData.id.trim();
        }

        // Resolve category_id and types from slug
        if (pData.category_slug) {
            const { data: cat } = await supabase
                .from('categories')
                .select('id')
                .eq('slug', pData.category_slug)
                .single();
            if (cat) productRow.category_id = cat.id;

            // Map category slug to DB product_type and razorpay_section
            const typeMap = {
                'education': 'course',
                'ai': 'ai',
                'saas': 'saas',
                'robotics': 'robotic',
                'games': 'game',
                'templates': 'template'
            };
            productRow.product_type = typeMap[pData.category_slug] || 'generic';
            productRow.razorpay_section = typeMap[pData.category_slug] || 'course';
        }

        const { data: product, error } = await supabase
            .from('products')
            .upsert([productRow], { onConflict: 'id' })
            .select()
            .single();

        if (error) return { error: error.message };

        // If it's a course (education category), upsert the courses row too
        if (pData.category_slug === 'education' || pData.instructor) {
            await supabase.from('courses').upsert([{
                id: product.id,
                instructor_name: pData.instructor || null,
                level: pData.level || 'Beginner',
                duration_hours: parseFloat(pData.duration) || 0,
            }], { onConflict: 'id' });
        }

        return { id: product.id, error: null };
    },

    async deleteProduct(id) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        return !error;
    },

    // ═══════════════════════════════════════════════
    // TIER CRUD (used by admin/script.js)
    // ═══════════════════════════════════════════════
    async addTier(tierData) {
        const { data, error } = await supabase
            .from('product_tiers')
            .insert([tierData])
            .select()
            .single();
        return { data, error };
    },

    async deleteTier(tierId) {
        const { error } = await supabase.from('product_tiers').delete().eq('id', tierId);
        return !error;
    },

    // ═══════════════════════════════════════════════
    // CONTACTS (used by admin/script.js)
    // ═══════════════════════════════════════════════
    async getContacts() {
        const { data } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });
        return data || [];
    }

};

window.ShardaDB = ShardaDB;

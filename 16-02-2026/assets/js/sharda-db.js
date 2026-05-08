/**
 * ShardaHub Production-Grade Mock Database Provider
 * Aligned with specified SQL schema requirements.
 * Manages state across all subdomains via LocalStorage.
 */

const ShardaDB = {
    // --- INITIALIZATION ---
    init() {
        const tables = [
            'sharda_users',
            'sharda_user_metadata',
            'sharda_enrollments',
            'sharda_payments',
            'sharda_subscriptions',
            'sharda_courses'
        ];

        tables.forEach(table => {
            if (!localStorage.getItem(table)) {
                localStorage.setItem(table, JSON.stringify([]));
            }
        });

        // Seed Courses if empty
        if (this.getTable('sharda_courses').length === 0) {
            this.setTable('sharda_courses', [
                { id: 'resume', title: 'Resume AI Builder Pro', category: 'AI Tools', price: 1299, thumbnail_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400', description: 'ATS-optimized resumes in seconds.', is_free: false },
                { id: 'saas-sync', title: 'E-Commerce Sync Master', category: 'SaaS Solutions', price: 4999, thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400', description: 'Real-time multi-platform inventory sync.', is_free: false },
                { id: 'python-free', title: 'Python for Beginners', category: 'Education', price: 0, thumbnail_url: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=400', description: 'Master Python fundamentals.', is_free: true }
            ]);
        }

        console.log("ShardaDB Production Layer Initialized");
    },

    // --- GENERIC TABLE HELPERS ---
    getTable(name) {
        return JSON.parse(localStorage.getItem(name) || '[]');
    },

    setTable(name, data) {
        localStorage.setItem(name, JSON.stringify(data));
    },

    // --- USERS & AUTH ---
    async getUserById(id) {
        return this.getTable('sharda_users').find(u => u.id === id);
    },

    async getUserByEmail(email) {
        return this.getTable('sharda_users').find(u => u.email === email);
    },

    async getUserMetadata(userId) {
        return this.getTable('sharda_user_metadata').find(m => m.user_id === userId) || {
            user_id: userId,
            ai_credits: 0,
            total_ai_usage: 0,
            subscription_status: 'inactive',
            subscription_plan: null
        };
    },

    async saveUser(user, metadata) {
        const users = this.getTable('sharda_users');
        const meta = this.getTable('sharda_user_metadata');

        // Upsert user
        const uIdx = users.findIndex(u => u.id === user.id);
        if (uIdx !== -1) users[uIdx] = { ...users[uIdx], ...user };
        else users.push(user);

        // Upsert metadata
        const mIdx = meta.findIndex(m => m.user_id === user.id);
        if (mIdx !== -1) meta[mIdx] = { ...meta[mIdx], ...metadata };
        else meta.push({ user_id: user.id, ...metadata });

        this.setTable('sharda_users', users);
        this.setTable('sharda_user_metadata', meta);
    },

    // --- PAYMENTS & SUBSCRIPTIONS ---
    async recordPayment(payment) {
        const payments = this.getTable('sharda_payments');
        payment.id = 'pay_' + Date.now();
        payment.created_at = new Date().toISOString();
        payments.push(payment);
        this.setTable('sharda_payments', payments);

        // Trigger automatic role/access upgrades
        await this.handlePaymentLogic(payment);
        return payment;
    },

    async handlePaymentLogic(payment) {
        const metadata = await this.getUserMetadata(payment.user_id);
        const user = await this.getUserById(payment.user_id);

        // --- AI TOOLS TIERS ---
        if (payment.product_type === 'AI_BASIC') {
            user.role = 'Pro';
            metadata.subscription_status = 'active';
            metadata.subscription_plan = 'AI Basic';
            metadata.ai_credits = (metadata.ai_credits || 0) + 500;
        } else if (payment.product_type === 'AI_ADVANCE') {
            user.role = 'Pro';
            metadata.subscription_status = 'active';
            metadata.subscription_plan = 'AI Advance';
            metadata.ai_credits = (metadata.ai_credits || 0) + 2000;
        } else if (payment.product_type === 'AI_CREDITS') {
            metadata.ai_credits = (metadata.ai_credits || 0) + 500;
        }

        // --- SAAS TIERS ---
        else if (payment.product_type === 'SAAS_BASIC' || payment.product_type === 'SAAS_ADVANCE') {
            user.role = 'Subscriber';
            metadata.subscription_status = 'active';
            metadata.subscription_plan = payment.product_type.replace('_', ' ');

            const sub = {
                id: 'sub_' + Date.now(),
                user_id: user.id,
                plan_name: metadata.subscription_plan,
                status: 'active',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };
            const subs = this.getTable('sharda_subscriptions');
            subs.push(sub);
            this.setTable('sharda_subscriptions', subs);
        }

        // --- GAMES TIERS ---
        else if (payment.product_type === 'GAME_BASIC') {
            user.role = 'Registered';
            metadata.game_credits = (metadata.game_credits || 0) + 1000;
        } else if (payment.product_type === 'GAME_ADVANCE') {
            user.role = 'Pro';
            metadata.game_credits = (metadata.game_credits || 0) + 5000;
            metadata.game_pass = true;
        }

        // --- LEGACY / FALLBACK ---
        else if (payment.product_type === 'COURSE') {
            user.role = 'Student';
            await this.enroll(user.id, payment.product_id);
        }

        await this.saveUser(user, metadata);
    },

    // --- ENROLLMENTS ---
    async enroll(userId, courseId) {
        const enrollments = this.getTable('sharda_enrollments');
        if (!enrollments.some(e => e.user_id === userId && e.course_id === courseId)) {
            enrollments.push({
                id: 'enr_' + Date.now(),
                user_id: userId,
                course_id: courseId,
                enrolled_at: new Date().toISOString()
            });
            this.setTable('sharda_enrollments', enrollments);
        }
    },

    // --- AI USAGE ---
    async deductAICredit(userId) {
        const metadata = await this.getUserMetadata(userId);
        if (metadata.ai_credits > 0) {
            metadata.ai_credits--;
            metadata.total_ai_usage++;
            const metaTable = this.getTable('sharda_user_metadata');
            const idx = metaTable.findIndex(m => m.user_id === userId);
            metaTable[idx] = metadata;
            this.setTable('sharda_user_metadata', metaTable);
            return true;
        }
        return false;
    },

    // --- STATS HELPER ---
    async getGlobalStats() {
        return {
            users: this.getTable('sharda_users').length,
            payments: this.getTable('sharda_payments').length,
            revenue: this.getTable('sharda_payments').reduce((s, p) => s + (p.amount || 0), 0),
            courses: this.getTable('sharda_courses').length
        };
    },

    // --- COURSES CRUD ---
    async getCourses() { return this.getTable('sharda_courses'); },
    async getCourseById(id) { return this.getTable('sharda_courses').find(c => c.id === id); }
};

ShardaDB.init();
window.ShardaDB = ShardaDB;

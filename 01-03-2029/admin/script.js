// admin/script.js

document.addEventListener('DOMContentLoaded', async () => {
    // Admin Security Check
    await checkAdminAccess();

    // Check if on Dashboard
    if (document.getElementById('totalRevenue')) {
        await loadDashboardStats();
    }

    // Check if on Master Inventory (formerly Courses)
    if (document.getElementById('productList')) {
        await loadAdminProducts();
    }

    // Check if on Contacts
    if (document.getElementById('contactList')) {
        await loadContacts();
    }
});

async function checkAdminAccess() {
    // Wait for the auth system to be fully ready (session + role fetch)
    if (window.SubpassAuth && window.SubpassAuth.ready) {
        await window.SubpassAuth.ready;
    } else {
        // Fallback: wait a short bit if auth isn't initialized yet
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const user = window.SubpassAuth ? window.SubpassAuth.user : null;

    if (!user) {
        console.warn("Admin Access: No user session found. Redirecting...");
        window.location.href = '../login.html?redirect=admin/dashboard.html';
        return;
    }

    if (user.role?.toLowerCase() !== 'admin') {
        console.warn("Admin Access: Role mismatch", user.role);
        alert("Access Denied: Admin privileges required.");
        window.location.href = '../index.html';
    }
}

async function loadDashboardStats() {
    try {
        const { count: totalProducts } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: totalAIGen } = await supabase.from('ai_generations').select('*', { count: 'exact', head: true });
        const { count: totalSubs } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true });
        const { count: totalGames } = await supabase.from('game_match_history').select('*', { count: 'exact', head: true });
        const { data: profiles } = await supabase.from('user_profiles').select('total_spent');

        const { data: recentOrders } = await supabase.from('orders')
            .select('*, users(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(5);

        const totalRevenue = profiles?.reduce((acc, p) => acc + (p.total_spent || 0), 0) || 0;

        // Update UI if elements exist (Dashboard page)
        if (document.getElementById('totalProducts')) document.getElementById('totalProducts').innerText = totalProducts || 0;
        if (document.getElementById('totalAIGen')) document.getElementById('totalAIGen').innerText = totalAIGen || 0;
        if (document.getElementById('totalSaaSSubs')) document.getElementById('totalSaaSSubs').innerText = totalSubs || 0;
        if (document.getElementById('totalRevenue')) document.getElementById('totalRevenue').innerText = '₹' + totalRevenue.toLocaleString();
        if (document.getElementById('totalGamesPlayed')) document.getElementById('totalGamesPlayed').innerText = totalGames || 0;

        const tbody = document.getElementById('enrollmentTable');
        if (tbody) {
            if (recentOrders && recentOrders.length > 0) {
                tbody.innerHTML = recentOrders.map(o => `
                    <tr>
                        <td>
                            <div class="fw-bold">${o.users?.full_name || 'Anonymous'}</div>
                            <div class="small text-secondary">${o.users?.email || 'no-email'}</div>
                        </td>
                        <td>Order: ${o.id.slice(0, 8)}</td>
                        <td>${new Date(o.created_at).toLocaleDateString()}</td>
                        <td><span class="badge bg-success">₹${o.total_amount}</span></td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-secondary">No recent activity</td></tr>';
            }
        }

    } catch (e) {
        console.error("Error loading stats:", e);
    }
}

async function loadAdminProducts() {
    const filter = document.getElementById('typeFilter')?.value || 'all';
    const container = document.getElementById('productList');
    if (!container) return;

    let query = supabase.from('products').select('*, categories(*)');

    const { data: products, error } = await query;
    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    if (products && products.length > 0) {
        // Client-side filter for now to handle simple inner join logic
        const filtered = filter === 'all' ? products : products.filter(p => p.categories?.slug === filter);

        container.innerHTML = filtered.map(p => `
            <div class="col-12 mb-3">
                <div class="glass p-3 rounded-4 d-flex align-items-center gap-4 interactive-card shadow-lg" style="border-left: 4px solid var(--ai-accent) !important;">
                    <div class="position-relative overflow-hidden rounded-3 shadow-sm" style="width: 120px; height: 80px;">
                        <img src="${p.image_url || 'https://via.placeholder.com/120x80'}" class="w-100 h-100 object-fit-cover transition-base hover-bright">
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h6 class="fw-bold mb-0 text-white">${p.title}</h6>
                            <span class="badge bg-info-subtle text-info rounded-pill px-2" style="font-size: 0.7rem;">${p.categories?.name || 'Global'}</span>
                        </div>
                        <div class="small text-secondary d-flex gap-3">
                            <span><i class="bi bi-tag text-info me-1"></i>₹${p.price_inr}</span>
                            <span class="text-truncate" style="max-width: 250px;"><i class="bi bi-info-circle text-info me-1"></i>${p.tagline || 'Ecosystem Asset'}</span>
                        </div>
                    </div>
                    <div class="d-flex gap-2 pe-2">
                        <button class="btn btn-sm btn-outline-info rounded-pill px-3 fw-medium hover-bright" onclick="editProduct('${p.id}')">
                            <i class="bi bi-pencil-square me-1"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-medium hover-danger" onclick="deleteProduct('${p.id}')">
                            <i class="bi bi-trash me-1"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<div class="col-12 text-center py-5"><h5 class="text-secondary">No products found in database</h5></div>`;
    }
}

window.toggleCategoryFields = function () {
    const slug = document.getElementById('category_slug').value;
    const courseFields = document.getElementById('courseFields');
    const gameHints = document.getElementById('gameHints');

    if (courseFields) {
        courseFields.style.display = (slug === 'education') ? 'flex' : 'none';
    }

    if (gameHints) {
        gameHints.style.display = (slug === 'games') ? 'block' : 'none';
    }
}

window.editProduct = async function (id) {
    const { data: p } = await supabase.from('products').select('*, courses(*), categories(*)').eq('id', id).single();
    if (p) {
        document.getElementById('courseId').value = p.id;
        // Populate & lock the slug field — ID cannot change after creation
        const slugEl = document.getElementById('productSlug');
        if (slugEl) { slugEl.value = p.id; slugEl.readOnly = true; slugEl.style.opacity = '0.5'; }
        document.getElementById('title').value = p.title;
        document.getElementById('tagline').value = p.tagline || '';
        document.getElementById('description').value = p.description || '';
        document.getElementById('price').value = p.price_inr || 0;
        const thumbUrl = p.image_url || '';
        document.getElementById('thumbnail_url').value = thumbUrl;
        document.getElementById('thumb_preview').src = thumbUrl || 'https://via.placeholder.com/300x168?text=Preview';
        document.getElementById('category_slug').value = p.categories?.slug || 'education';
        document.getElementById('video_url').value = p.video_url || '';

        // Course specific
        if (p.courses) {
            document.getElementById('instructor').value = p.courses.instructor_name || '';
            document.getElementById('level').value = p.courses.level || 'Beginner';
            document.getElementById('duration').value = p.courses.duration_hours || 0;
        }

        window.toggleCategoryFields();
        window.loadTiers(p.id); // Load tiers

        // Curriculum Tab management
        const curriculumTab = document.getElementById('curriculum-tab');
        if (curriculumTab) {
            if (p.categories?.slug === 'education') {
                curriculumTab.removeAttribute('disabled');
                curriculumTab.classList.remove('text-secondary');
                curriculumTab.classList.add('text-white');
                window.loadCurriculum(p.id);
            } else {
                curriculumTab.setAttribute('disabled', 'true');
                curriculumTab.classList.add('text-secondary');
                curriculumTab.classList.remove('text-white');
            }
        }

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('courseModal'));
        modal.show();
    }
}

window.saveProduct = async function () {
    const saveBtn = document.querySelector('[onclick="saveProduct()"]');
    if (saveBtn) saveBtn.disabled = true;

    const existingId = document.getElementById('courseId').value.trim();
    const slug = document.getElementById('productSlug')?.value.trim();

    if (!existingId && !slug) {
        alert("Product ID / Slug is required for new products.");
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    const pData = {
        id: existingId || slug || null,
        title: document.getElementById('title').value,
        tagline: document.getElementById('tagline').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('price').value),
        thumbnail_url: document.getElementById('thumbnail_url').value,
        category_slug: document.getElementById('category_slug').value,
        video_url: document.getElementById('video_url').value,
        instructor: document.getElementById('instructor').value,
        level: document.getElementById('level').value,
        duration: parseFloat(document.getElementById('duration').value)
    };

    const result = await ShardaDB.upsertProduct(pData);
    if (result.error) {
        alert("Error: " + result.error);
    } else {
        // Update hidden ID in case this was a new create
        document.getElementById('courseId').value = result.id;

        // Show success, but DON'T close modal so user can add tiers
        alert("Product Saved! You can now add Tiers below.");

        // Load tiers (reveals the add row)
        loadTiers(result.id);

        // Enable Curriculum Tab if it's a course
        const curriculumTab = document.getElementById('curriculum-tab');
        if (curriculumTab && document.getElementById('category_slug').value === 'education') {
            curriculumTab.removeAttribute('disabled');
            curriculumTab.classList.remove('text-secondary');
            curriculumTab.classList.add('text-white');
            window.loadCurriculum(result.id);

            // AUTOMATICALLY SWITCH TO CURRICULUM TAB
            const tabEl = document.querySelector('#curriculum-tab');
            if (tabEl) {
                const tab = new bootstrap.Tab(tabEl);
                tab.show();
            }
        }

        // Refresh background list
        loadAdminProducts();
    }
    saveBtn.disabled = false;
}

window.deleteProduct = async function (id) {
    if (confirm("Delete this product from ecosystem?")) {
        await ShardaDB.deleteProduct(id);
        loadAdminProducts();
    }
}

window.resetForm = function () {
    const form = document.getElementById('courseForm');
    if (form) form.reset();
    window.toggleCategoryFields();
    document.getElementById('courseId').value = '';
    const slugEl = document.getElementById('productSlug');
    if (slugEl) { slugEl.value = ''; slugEl.readOnly = false; slugEl.style.opacity = ''; }
    document.getElementById('tiersList').innerHTML = `<div class="alert alert-info bg-opacity-10 border-info border-opacity-25 text-info small mb-0">
        <i class="bi bi-lock-fill me-2"></i>
        First <strong>Save Product</strong> to unlock Tier management.
    </div>`;
    document.getElementById('addTierRow').style.display = 'none';
    if (document.getElementById('gameHints')) document.getElementById('gameHints').style.display = 'none';

    // Reset tabs
    const curriculumTab = document.getElementById('curriculum-tab');
    if (curriculumTab) {
        curriculumTab.setAttribute('disabled', 'true');
        curriculumTab.classList.add('text-secondary');
        curriculumTab.classList.remove('text-white');
    }
    const basicTab = document.getElementById('basic-tab');
    if (basicTab) {
        bootstrap.Tab.getOrCreateInstance(basicTab).show();
    }
    document.getElementById('curriculumList').innerHTML = '';
    document.getElementById('thumb_preview').src = 'https://via.placeholder.com/300x168?text=Preview';
}

// Tier Management
window.loadTiers = async function (productId) {
    const list = document.getElementById('tiersList');
    const { data: tiers } = await supabase.from('product_tiers').select('*').eq('product_id', productId);

    if (tiers && tiers.length > 0) {
        list.innerHTML = tiers.map(t => `
            <div class="d-flex align-items-center justify-content-between p-2 mb-2 bg-black bg-opacity-25 rounded border border-secondary">
                <div>
                    <span class="badge bg-info text-dark fw-bold me-2">${t.name}</span>
                    <span class="text-white me-2">₹${t.price_inr}</span>
                    <small class="text-secondary text-truncate d-inline-block" style="max-width: 200px;">${t.action_url || 'No URL'}</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger py-0" onclick="removeTier('${t.id}', '${productId}')">&times;</button>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p class="text-secondary small fst-italic">No tiers defined. Add one below.</p>';
    }

    document.getElementById('addTierRow').style.display = 'flex';

    // Game Specific UI adjustment
    const category = document.getElementById('category_slug').value;
    if (category === 'games') {
        document.getElementById('tierUrl').placeholder = "Play Link (optional)";
        list.innerHTML += `<p class="text-info small mt-2"><i class="bi bi-info-circle me-1"></i> Games only support 2 tiers: <strong>Free Play</strong> and <strong>Premium Access</strong>.</p>`;
    } else {
        document.getElementById('tierUrl').placeholder = "Redirect URL";
    }
}

window.addTier = async function () {
    const productId = document.getElementById('courseId').value;
    if (!productId) return alert("Please save the product first.");

    const name = document.getElementById('tierName').value;
    const priceRaw = document.getElementById('tierPrice').value;
    const url = document.getElementById('tierUrl').value;

    if (!name) return alert("Tier name is required");

    const tierData = {
        product_id: productId,
        name: name,
        price_inr: parseFloat(priceRaw) || 0, // Ensure number
        action_url: url || null, // Ensure null if empty
        features: [] // Start with empty array for features list
    };

    console.log("Adding Tier:", tierData);

    const { error } = await ShardaDB.addTier(tierData); // Changed to distinct addTier method

    if (error) {
        console.error("Tier Add Error:", error);
        alert("Failed to add tier: " + error.message || JSON.stringify(error));
        return;
    }

    // Clear inputs
    document.getElementById('tierName').value = '';
    document.getElementById('tierPrice').value = '';
    document.getElementById('tierUrl').value = '';

    loadTiers(productId);
}

window.removeTier = async function (tierId, productId) {
    if (confirm("Delete this tier?")) {
        await ShardaDB.deleteTier(tierId);
        loadTiers(productId);
    }
}

async function loadContacts() {
    const contacts = await ShardaDB.getContacts();
    const container = document.getElementById('contactList');

    if (contacts && contacts.length > 0) {
        container.innerHTML = contacts.map(c => `
            <div class="glass p-4 rounded-4 mb-4">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="fw-bold mb-0">${c.name}</h5>
                        <div class="small text-info">${c.email}</div>
                    </div>
                    <div class="text-secondary small">${new Date(c.created_at).toLocaleString()}</div>
                </div>
                <div class="p-3 bg-dark rounded-3 small">
                    <strong class="text-white d-block mb-1">Subject: ${c.subject || 'Inquiry'}</strong>
                    ${c.message}
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div class="text-center py-5 text-secondary">No inquiries yet</div>';
    }
}

// --- Curriculum Management ---
window.loadCurriculum = async function (courseId) {
    const list = document.getElementById('curriculumList');
    if (!list) return;

    const modules = await ShardaDB.getCourseCurriculum(courseId);

    if (modules && modules.length > 0) {
        list.innerHTML = modules.map(m => `
            <div class="module-card mb-3" id="module-${m.id}">
                <div class="module-header d-flex justify-content-between align-items-center p-3 bg-dark bg-opacity-50" onclick="this.parentElement.classList.toggle('collapsed')">
                    <div class="d-flex align-items-center gap-3">
                        <i class="bi bi-grip-vertical text-secondary"></i>
                        <h6 class="mb-0 fw-bold text-white">${m.title}</h6>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-icon-sm btn-outline-info" onclick="event.stopPropagation(); addLesson('${m.id}')" title="Add Lesson"><i class="bi bi-plus"></i></button>
                        <button type="button" class="btn btn-icon-sm btn-outline-warning" onclick="event.stopPropagation(); editModule('${m.id}', '${m.title}')" title="Edit Section"><i class="bi bi-pencil-fill"></i></button>
                        <button type="button" class="btn btn-icon-sm btn-outline-danger" onclick="event.stopPropagation(); deleteModule('${m.id}')" title="Delete Section"><i class="bi bi-trash-fill"></i></button>
                    </div>
                </div>
                <div class="lessons-container">
                    ${(m.lessons || []).map(l => `
                        <div class="lesson-item d-flex justify-content-between align-items-center p-2 border-top border-secondary border-opacity-25" style="padding-left: 3rem !important;">
                            <div class="d-flex align-items-center gap-3">
                                <div class="lesson-type-icon small">
                                    <i class="bi bi-${l.content_type === 'video' ? 'play-circle' : 'file-earmark-text'}"></i>
                                </div>
                                <div>
                                    <div class="text-white small fw-medium">${l.title}</div>
                                    <div class="text-secondary" style="font-size: 0.7rem;">${l.content_type} • ${l.duration_mins} mins</div>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-icon-sm btn-outline-info opacity-75" onclick="editLesson('${l.id}')"><i class="bi bi-pencil"></i></button>
                                <button type="button" class="btn btn-icon-sm btn-outline-danger opacity-75" onclick="deleteLesson('${l.id}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } else {
        list.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <i class="bi bi-journal-x h1 mb-3 d-block opacity-25"></i>
                <p>No curriculum added yet.</p>
            </div>`;
    }
}

window.addModule = async function () {
    const btn = document.querySelector('[onclick="addModule()"]');
    if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
    if (btn) btn.disabled = true;

    try {
        const courseId = document.getElementById('courseId').value;
        if (!courseId) {
            alert("Save the course first!");
            if (btn) { btn.innerHTML = '<i class="bi bi-plus-lg"></i> Add Section'; btn.disabled = false; }
            return;
        }

        const title = prompt("Enter Section Title (e.g. Module 1: Basics):");
        if (!title) {
            if (btn) { btn.innerHTML = '<i class="bi bi-plus-lg"></i> Add Section'; btn.disabled = false; }
            return;
        }

        console.log("Adding module for course:", courseId);

        // Get count for indexing
        const { count } = await supabase
            .from('course_modules')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId);

        const { error } = await ShardaDB.upsertModule({
            course_id: courseId,
            title: title,
            order_index: count || 0
        });

        if (error) throw error;

        await loadCurriculum(courseId);
        console.log("Module added successfully!");

    } catch (err) {
        console.error("Critical error in addModule:", err);
        alert("Action failed: " + (err.message || "Unknown error"));
    } finally {
        if (btn) {
            btn.innerHTML = '<i class="bi bi-plus-lg"></i> Add Section';
            btn.disabled = false;
        }
    }
}

window.editModule = async function (id, currentTitle) {
    const newTitle = prompt("Edit Section Title:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    const { error } = await ShardaDB.upsertModule({
        id: id,
        title: newTitle
    });

    if (error) alert("Error: " + error.message);
    else loadCurriculum(document.getElementById('courseId').value);
}

window.deleteModule = async function (id) {
    if (!confirm("Are you sure? This will delete all lessons in this section!")) return;

    const success = await ShardaDB.deleteModule(id);
    if (success) loadCurriculum(document.getElementById('courseId').value);
}

window.addLesson = async function (moduleId) {
    const title = prompt("Enter Lesson Title:");
    if (!title) return;

    const url = prompt("Content URL (YouTube/PDF Link):");
    const type = prompt("Type (video/article/resource/quiz):", "video");

    // Get next order index
    const { count } = await supabase.from('course_lessons').select('*', { count: 'exact', head: true }).eq('module_id', moduleId);

    const { error } = await ShardaDB.upsertLesson({
        module_id: moduleId,
        title: title,
        content_url: url,
        content_type: type,
        order_index: count || 0,
        duration_mins: 10 // Default
    });

    if (error) alert("Error adding lesson: " + error.message);
    else loadCurriculum(document.getElementById('courseId').value);
}

window.deleteLesson = async function (id) {
    if (!confirm("Delete this lesson?")) return;
    const success = await ShardaDB.deleteLesson(id);
    if (success) loadCurriculum(document.getElementById('courseId').value);
}

window.editLesson = async function (id) {
    // For simplicity, we'll just prompt for basic fields. 
    // In a real app, you'd use a dedicated lesson modal.
    const { data: l } = await supabase.from('course_lessons').select('*').eq('id', id).single();
    if (!l) return;

    const title = prompt("Edit Title:", l.title);
    const url = prompt("Edit URL:", l.content_url);

    if (!title) return;

    const { error } = await ShardaDB.upsertLesson({
        id: id,
        title: title,
        content_url: url
    });

    if (error) alert("Error: " + error.message);
    else loadCurriculum(document.getElementById('courseId').value);
}

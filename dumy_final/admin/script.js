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
    if (courseFields) {
        courseFields.style.display = (slug === 'education') ? 'flex' : 'none';
    }
}

window.editProduct = async function (id) {
    const { data: p } = await supabase.from('products').select('*, courses(*), categories(*)').eq('id', id).single();
    if (p) {
        document.getElementById('courseId').value = p.id;
        document.getElementById('title').value = p.title;
        document.getElementById('tagline').value = p.tagline || '';
        document.getElementById('description').value = p.description || '';
        document.getElementById('price').value = p.price_inr || 0;
        document.getElementById('thumbnail_url').value = p.image_url || '';
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
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('courseModal'));
        modal.show();
    }
}

window.saveProduct = async function () {
    const saveBtn = document.querySelector('[onclick="saveProduct()"]');
    saveBtn.disabled = true;

    const pData = {
        id: document.getElementById('courseId').value || null,
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
    document.getElementById('tiersList').innerHTML = `<div class="alert alert-info bg-opacity-10 border-info border-opacity-25 text-info small mb-0">
        <i class="bi bi-lock-fill me-2"></i>
        First <strong>Save Product</strong> to unlock Tier management.
    </div>`;
    document.getElementById('addTierRow').style.display = 'none';
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

function exportData() {
    alert("Export feature coming soon! (Mock data export is ready)");
}

// admin/script.js

document.addEventListener('DOMContentLoaded', async () => {
    // Admin Security Check
    await checkAdminAccess();

    // Check if on Dashboard
    if (document.getElementById('totalRevenue')) {
        await loadDashboardStats();
    }

    // Check if on Courses
    if (document.getElementById('courseList')) {
        await loadAdminCourses();
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
        const { count: totalCourses } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: totalEnrollments } = await supabase.from('enrollments').select('*', { count: 'exact', head: true });
        const { data: profiles } = await supabase.from('user_profiles').select('total_spent');
        const { data: recentEnrollments } = await supabase.from('enrollments').select('*, products(title), user_profiles(email)').order('created_at', { ascending: false }).limit(5);

        const totalRevenue = profiles?.reduce((acc, p) => acc + (p.total_spent || 0), 0) || 0;

        document.getElementById('totalCourses').innerText = totalCourses || 0;
        document.getElementById('totalStudents').innerText = totalEnrollments || 0;
        document.getElementById('totalRevenue').innerText = '₹' + totalRevenue.toLocaleString();
        document.getElementById('totalInquiries').innerText = 0; // Placeholder for support tickets

        const tbody = document.getElementById('enrollmentTable');
        if (recentEnrollments && recentEnrollments.length > 0) {
            tbody.innerHTML = recentEnrollments.map(e => `
                <tr>
                    <td>
                        <div class="fw-bold">User ${e.userId.slice(-4)}</div>
                        <div class="small text-secondary">${e.userId}@mock.sharda</div>
                    </td>
                    <td>${e.courseTitle}</td>
                    <td>${new Date(e.date).toLocaleDateString()}</td>
                    <td><span class="badge bg-success">Enrolled</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-secondary">No recent enrollments</td></tr>';
        }

    } catch (e) {
        console.error("Error loading stats:", e);
    }
}

async function loadAdminCourses() {
    const courses = await ShardaDB.getCourses();
    const container = document.getElementById('courseList');
    if (!container) return;

    if (courses && courses.length > 0) {
        container.innerHTML = courses.map(c => `
            <div class="col-12 mb-3">
                <div class="glass p-3 rounded-4 d-flex align-items-center gap-4 interactive-card shadow-lg" style="border-left: 4px solid var(--ai-accent) !important;">
                    <div class="position-relative overflow-hidden rounded-3 shadow-sm" style="width: 120px; height: 80px;">
                        <img src="${c.image_url || 'https://via.placeholder.com/120x80'}" class="w-100 h-100 object-fit-cover transition-base hover-bright">
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h6 class="fw-bold mb-0 text-white">${c.title}</h6>
                            <span class="badge bg-info-subtle text-info rounded-pill px-2" style="font-size: 0.7rem;">${c.categories?.name || 'Edu'}</span>
                        </div>
                        <div class="small text-secondary d-flex gap-3">
                            <span><i class="bi bi-tag text-info me-1"></i>₹${c.price_inr}</span>
                            <span><i class="bi bi-person text-info me-1"></i>${c.instructor_name || 'Expert'}</span>
                            <span><i class="bi bi-clock text-info me-1"></i>${c.duration_hours || 0}h</span>
                        </div>
                    </div>
                    <div class="d-flex gap-2 pe-2">
                        <button class="btn btn-sm btn-outline-info rounded-pill px-3 fw-medium hover-bright" onclick="editCourse('${c.id}')">
                            <i class="bi bi-pencil-square me-1"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-medium hover-danger" onclick="deleteCourse('${c.id}')">
                            <i class="bi bi-trash me-1"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="glass p-5 rounded-5">
                    <i class="bi bi-journal-x display-1 text-secondary opacity-25 mb-3"></i>
                    <h5 class="text-secondary">No courses found in database</h5>
                    <p class="text-muted small">Start by creating your first premium course!</p>
                </div>
            </div>`;
    }
}

// Global functions for the HTML buttons
window.editCourse = async function (id) {
    const course = await ShardaDB.getCourseById(id);
    if (course) {
        document.getElementById('courseId').value = course.id;
        document.getElementById('title').value = course.title;
        document.getElementById('description').value = course.description || '';
        document.getElementById('price').value = course.price_inr || 0;
        document.getElementById('thumbnail_url').value = course.image_url || '';
        document.getElementById('category').value = course.categories?.name || 'Development';
        document.getElementById('video_url').value = course.video_url || '';
        document.getElementById('demo_url').value = course.demo_url || '';
        document.getElementById('instructor').value = course.instructor_name || '';
        document.getElementById('level').value = course.level || 'Beginner';
        document.getElementById('duration').value = course.duration_hours || 0;

        const modalElement = document.getElementById('courseModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    }
};

window.saveCourse = async function () {
    const id = document.getElementById('courseId').value;
    const saveBtn = document.querySelector('[onclick="saveCourse()"]');
    const originalText = saveBtn.innerHTML;

    // UI Feedback: Loading state
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

    const courseData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('price').value),
        thumbnail_url: document.getElementById('thumbnail_url').value,
        category: document.getElementById('category').value,
        video_url: document.getElementById('video_url').value,
        demo_url: document.getElementById('demo_url').value,
        instructor: document.getElementById('instructor').value,
        level: document.getElementById('level').value,
        duration: parseFloat(document.getElementById('duration').value),
        is_free: parseFloat(document.getElementById('price').value) === 0
    };

    let result;
    if (id) {
        result = await ShardaDB.updateCourse(id, courseData);
    } else {
        result = await ShardaDB.addCourse(courseData);
    }

    if (result.error) {
        alert("Error saving course: " + result.error);
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    } else {
        const modalElement = document.getElementById('courseModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();

        // Reset button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;

        // Refresh list
        loadAdminCourses();
    }
};

window.deleteCourse = async function (id) {
    if (confirm("Permanently delete this course? This action cannot be undone.")) {
        const { error } = await ShardaDB.deleteCourse(id);
        if (error) alert("Error deleting course: " + error);
        else loadAdminCourses();
    }
};

window.resetForm = function () {
    const form = document.getElementById('courseForm');
    if (form) form.reset();
    const idInput = document.getElementById('courseId');
    if (idInput) idInput.value = '';
};

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

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
    const user = SubpassAuth.user;
    if (!user) {
        window.location.href = '../login.html?redirect=admin/dashboard.html';
        return;
    }

    if (user.role !== 'admin') {
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
                <div class="glass p-3 rounded-4 d-flex align-items-center gap-4">
                    <img src="${c.image_url || 'https://via.placeholder.com/100x60'}" width="100" height="60" class="rounded object-fit-cover">
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-1 text-white">${c.title}</h6>
                        <div class="small text-secondary">ID: ${c.id} | Price: ₹${c.price_inr} | Cat: ${c.categories?.name || 'Edu'}</div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="editCourse('${c.id}')">
                            <i class="bi bi-pencil-square"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="deleteCourse('${c.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No courses found in database.</div>';
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

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('courseModal'));
        modal.show();
    }
};

window.deleteCourse = async function (id) {
    if (confirm("Permanently delete this course?")) {
        const { error } = await ShardaDB.deleteCourse(id);
        if (error) alert("Error: " + error);
        else loadAdminCourses();
    }
};

window.resetForm = function () {
    document.getElementById('courseForm').reset();
    document.getElementById('courseId').value = '';
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

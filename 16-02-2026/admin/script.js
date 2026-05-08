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
        const stats = await ShardaDB.getStats();

        document.getElementById('totalCourses').innerText = stats.totalCourses;
        document.getElementById('totalStudents').innerText = stats.totalStudents;
        document.getElementById('totalRevenue').innerText = '₹' + stats.totalRevenue.toLocaleString();
        document.getElementById('totalInquiries').innerText = stats.totalInquiries;

        const tbody = document.getElementById('enrollmentTable');
        if (stats.recentEnrollments && stats.recentEnrollments.length > 0) {
            tbody.innerHTML = stats.recentEnrollments.map(e => `
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

    if (courses && courses.length > 0) {
        container.innerHTML = courses.map(c => `
            <div class="col-12">
                <div class="glass p-3 rounded-4 d-flex align-items-center gap-4 mb-3">
                    <img src="${c.thumbnail_url || 'https://via.placeholder.com/100x60'}" width="100" height="60" class="rounded object-fit-cover">
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-1">${c.title}</h6>
                        <div class="small text-secondary">Price: ₹${c.price} | Category: ${c.category}</div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-light rounded-pill" onclick="editCourse('${c.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteCourse('${c.id}')"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
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

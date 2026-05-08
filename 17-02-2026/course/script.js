// script.js with Supabase Integration

const courseGrid = document.getElementById('courseGrid');
const cartCount = document.getElementById('cartCount');
const cartTotalElement = document.getElementById('cartTotal');
const cartItemsContainer = document.getElementById('cartItems');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if on Index
    if (courseGrid) {
        await loadCoursesFromDB();
        setupFilters();
    }

    // Check if on Details
    if (document.getElementById('courseDetails')) {
        await loadCourseDetailsDB();
    }

    // Check if on Cart
    if (cartItemsContainer) {
        renderCart();
    }

    // Check if on Dashboard
    if (document.getElementById('dashboardGrid')) {
        await loadDashboardDB();
    }

    // Check if on Player
    if (document.getElementById('playerCourseTitle')) {
        // Player logic is handled by inline script but we can secure it here
        await securePlayerAccess();
    }

    updateCartIcon();
});

// --- SUPABASE DATA LOADING (Now Mocked) ---
async function loadCoursesFromDB() {
    let coursesList = [];
    try {
        coursesList = await ShardaDB.getCourses();
        // Standardize mapping for the template
        coursesList = coursesList.map(item => ({
            id: item.id,
            title: item.title,
            category: item.categories?.name || 'Education',
            thumbnail_url: item.image_url,
            description: item.description,
            price: item.price_inr,
            rating: 4.5, // Mock rating as not in schema yet
            is_free: item.price_inr === 0
        }));
    } catch (e) {
        console.error('ShardaDB failed', e);
    }

    window.allCourses = coursesList;
    renderCourses(coursesList);
}

function renderCourses(list) {
    if (!courseGrid) return;
    courseGrid.innerHTML = '';
    list.forEach(course => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 glass-card course-card interactive-card">
                <a href="details.html?id=${course.id}" class="text-decoration-none">
                    <div class="course-img-wrapper">
                        ${course.is_free ? '<span class="badge bg-success course-type-badge">FREE</span>' : '<span class="badge bg-dark course-type-badge">PAID</span>'}
                        <img src="${course.thumbnail_url}" class="card-img-top" alt="${course.title}">
                    </div>
                </a>
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <small class="text-accent text-uppercase fw-bold">${course.category}</small>
                        <div class="text-warning">
                             <i class="bi bi-star-fill"></i> ${course.rating || 'New'}
                        </div>
                    </div>
                    <a href="details.html?id=${course.id}" class="text-decoration-none">
                        <h5 class="card-title fw-bold text-white mb-3 text-truncate" title="${course.title}">${course.title}</h5>
                    </a>
                    <p class="card-text text-secondary small flex-grow-1">${course.description ? course.description.substring(0, 80) : ''}...</p>
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                        <div class="fw-bold text-info">₹${course.price}</div>
                        <div class="d-flex gap-2">
                             <a href="details.html?id=${course.id}" class="btn btn-sm btn-outline-light rounded-pill px-3">Details</a>
                             <button class="btn btn-sm btn-outline-info rounded-pill px-2" onclick="event.preventDefault(); addToCart({id: '${course.id}', title: '${course.title.replace(/'/g, "\\'")}', price: ${course.price}, icon: 'bi-mortarboard'})">
                                <i class="bi bi-cart-plus"></i>
                             </button>
                             <button class="btn btn-sm btn-info rounded-pill px-3 fw-bold" onclick="event.preventDefault(); addToCart({id: '${course.id}', title: '${course.title.replace(/'/g, "\\'")}', price: ${course.price}, icon: 'bi-mortarboard'}); window.location.href='../checkout.html'">
                                Buy
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        courseGrid.appendChild(card);
    });
}

function setupFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(f => f.classList.remove('active', 'bg-primary', 'text-white'));
            btn.classList.add('active', 'bg-primary', 'text-white');

            const category = btn.getAttribute('data-filter');
            if (!window.allCourses) return;

            const filtered = category === 'all' ? window.allCourses : window.allCourses.filter(c =>
                (c.category && c.category.toLowerCase() === category) ||
                (category === 'ebook' && c.type === 'ebook') ||
                (category === 'video' && c.type !== 'ebook')
            );
            renderCourses(filtered);
        });
    });
}

// --- DETAILS PAGE ---
async function loadCourseDetailsDB() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    let course = await ShardaDB.getCourseById(id);

    if (!course) {
        // Fallback to data.js
        if (typeof courses !== 'undefined') {
            const dummy = courses.find(c => c.id === id);
            if (dummy) {
                course = {
                    id: dummy.id,
                    title: dummy.title,
                    description: dummy.description,
                    price: dummy.price,
                    thumbnail_url: dummy.thumbnail,
                    instructor: dummy.instructor,
                    duration: dummy.duration,
                    is_free: dummy.price === 0
                };
            }
        }
    }

    if (!course) {
        document.getElementById('courseDetails').innerHTML = '<div class="text-center py-5"><h3>Course not found</h3><a href="index.html" class="btn btn-primary">Back to Courses</a></div>';
        return;
    }

    // Bind Data
    document.getElementById('detailTitle').innerText = course.title;
    document.getElementById('detailDesc').innerText = course.description;
    document.getElementById('detailPrice').innerText = course.is_free ? 'FREE' : '₹' + course.price;
    document.getElementById('detailThumb').src = course.thumbnail_url;
    document.getElementById('detailInstructor').innerText = course.instructor || 'ShardaHub Expert';
    document.getElementById('detailDuration').innerText = course.duration || 'Self-Paced';

    // buttons
    const buyBtn = document.getElementById('buyNowBtn');
    const cartBtn = document.getElementById('addToCartBtn');
    const mobileBuyBtn = document.getElementById('mobileBuyBtn');
    const demoBtn = document.getElementById('watchDemoBtn');

    const courseToCart = {
        id: course.id,
        name: course.title,
        price: course.price,
        icon: 'bi-mortarboard'
    };

    if (course.is_free) {
        const enrollLogic = () => handleFreeEnrollment(course.id);
        if (buyBtn) { buyBtn.innerText = "Start Learning"; buyBtn.onclick = enrollLogic; }
        if (mobileBuyBtn) { mobileBuyBtn.innerText = "Start Learning"; mobileBuyBtn.onclick = enrollLogic; }
        if (cartBtn) cartBtn.style.display = 'none';
    } else {
        const buyNowLogic = () => { addToCart(courseToCart); window.location.href = '../checkout.html'; };
        const addToCartLogic = () => addToCart(courseToCart);

        if (buyBtn) buyBtn.onclick = buyNowLogic;
        if (mobileBuyBtn) mobileBuyBtn.onclick = buyNowLogic;
        if (cartBtn) cartBtn.onclick = addToCartLogic;
    }

    // Demo Button
    if (course.demo_url) {
        demoBtn.style.display = 'inline-block';
        demoBtn.onclick = () => {
            // Open Demo Modal or Simple Window
            const demoWindow = window.open("", "_blank", "width=800,height=500");
            demoWindow.document.write(`
                <body style="background:black;margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
                    <iframe width="100%" height="100%" src="${course.demo_url}" frameborder="0" allowfullscreen></iframe>
                </body>
            `);
        };
    }

    // Similar Courses
    renderSimilarCourses(course.category, course.id);
}

function renderSimilarCourses(category, currentId) {
    const container = document.getElementById('similarCourses');
    if (!container) return;

    // Use global courses if available (from data.js)
    if (typeof courses !== 'undefined') {
        const similar = courses.filter(c => c.category === category && c.id !== currentId).slice(0, 3);
        container.innerHTML = similar.map(c => `
            <a href="details.html?id=${c.id}" class="glass p-3 rounded-4 d-flex align-items-center gap-3 text-white text-decoration-none similar-product-card transition-all mb-3">
                <img src="${c.thumbnail}" width="60" height="40" class="rounded object-fit-cover">
                <div>
                    <h6 class="mb-1 small fw-bold text-truncate" style="max-width: 150px;">${c.title}</h6>
                    <div class="fw-bold small text-info">₹${c.price}</div>
                </div>
            </a>
        `).join('');
    }
}

async function handleFreeEnrollment(courseId) {
    if (!shardaHubAuth.user) {
        alert("Please Sign In to start this free course.");
        ShardaHeader.switchModal('loginModal', 'loginModal'); // Trigger global login
        return;
    }

    const { error } = await shardaHubData.enrollInCourse(courseId);

    if (error) {
        alert("Enrollment failed: " + error.message);
    } else {
        alert("Enrolled successfully!");
        window.location.href = `player.html?id=${courseId}`;
    }
}


// --- DASHBOARD ---
async function loadDashboardDB() {
    const user = SubpassAuth.user;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const { recentEnrollments: enrollments } = await ShardaDB.getStats();
    // Filter enrollments for current user
    const userEnrollments = (await ShardaDB.getEnrollments()).filter(e => e.userId === user.id);
    const grid = document.getElementById('dashboardGrid');

    if (userEnrollments.length > 0) {
        document.getElementById('enrolledCount').innerText = userEnrollments.length;
        // Fetch full course data for these IDs
        const allCourses = await ShardaDB.getCourses();
        const displayCourses = userEnrollments.map(e => allCourses.find(c => c.id === e.courseId)).filter(Boolean);

        grid.innerHTML = displayCourses.map(course => `
            <div class="col-md-6 col-lg-4">
                <div class="card glass-card h-100 course-card">
                    <div class="course-img-wrapper">
                        <img src="${course.thumbnail_url}" class="card-img-top" alt="${course.title}">
                        <a href="player.html?id=${course.id}" class="btn btn-primary rounded-pill position-absolute top-50 start-50 translate-middle opacity-0 hover-opacity-100 transition-all">
                            <i class="bi bi-play-fill"></i> Resume
                        </a>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title text-white text-truncate">${course.title}</h5>
                        <a href="player.html?id=${course.id}" class="btn btn-outline-light w-100 mt-3 btn-sm">Continue Learning</a>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        grid.innerHTML = '<div class="col-12 text-center py-5"><p>No enrollments found.</p><a href="index.html" class="btn btn-primary">Browse Courses</a></div>';
    }
}

// --- PLAYER SECURITY ---
async function securePlayerAccess() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) return;

    const user = SubpassAuth.user;

    if (!user) {
        alert("You must be logged in to access the full course.");
        window.location.href = `details.html?id=${id}`;
        return;
    }

    // Check Enrollment
    const enrollments = await ShardaDB.getEnrollments();
    const enrolled = enrollments.some(e => e.userId === user.id && e.courseId === id);

    if (!enrolled) {
        alert("You have not purchased this course.");
        window.location.href = `details.html?id=${id}`;
    }
}

// --- CART & PAYMENT (Consolidated with Global ShardaPayments) ---
function addToCart(course) {
    if (typeof ShardaPayments !== 'undefined') {
        ShardaPayments.addToCart({
            id: course.id,
            name: course.title,
            price: course.price,
            icon: 'bi-mortarboard'
        });
    } else {
        console.error("ShardaPayments system not found");
    }
}

function updateCartIcon() {
    // Handled by ShardaPayments.updateCartBadge()
}

function renderCart() {
    // Handled by checkout.html
}

function removeFromCart(id) {
    // Handled by checkout.html
}

// Razorpay Logic (Enhanced)
// ... keeping placeholder if needed, or removing if consolidated ...

// --- PLAYER LOGIC ---
function initPlayer() {
    const playerTitle = document.getElementById('playerCourseTitle');
    if (!playerTitle) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    // In a real app, fetch from Supabase. For now, use the available course data if any.
    if (typeof courses !== 'undefined') {
        const course = courses.find(c => c.id === id);
        if (course) {
            playerTitle.innerText = course.title;
            const playlist = document.getElementById('playlist');
            if (playlist) {
                playlist.innerHTML = course.curriculum.map((lesson, i) => `
                    <div class="list-group-item list-group-item-action bg-transparent text-secondary border-secondary lesson-item ${i === 0 ? 'active text-white' : ''}" onclick="playLesson('${lesson}')">
                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <small class="mb-1">Lesson ${i + 1}</small>
                            <i class="bi bi-play-circle"></i>
                        </div>
                        <p class="mb-1 small text-truncate">${lesson}</p>
                    </div>
                `).join('');
            }
            if (document.getElementById('currentLessonTitle')) {
                document.getElementById('currentLessonTitle').innerText = course.curriculum[0];
            }
        }
    }
}

function playLesson(title) {
    const lessonTitle = document.getElementById('currentLessonTitle');
    if (lessonTitle) lessonTitle.innerText = title;

    // Update active states
    document.querySelectorAll('.lesson-item').forEach(item => {
        item.classList.remove('active', 'text-white');
        if (item.querySelector('p').innerText === title) {
            item.classList.add('active', 'text-white');
        }
    });
}

// Global initialization for Course Subdomain
document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
});
async function startPayment() {
    const cart = JSON.parse(localStorage.getItem('shardahub_cart')) || [];
    if (cart.length === 0) return alert("Empty Cart");

    // Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Please login before checkout.");
        window.location.href = 'login.html';
        return;
    }

    const total = cart.reduce((acc, c) => acc + c.price, 0);

    const options = {
        "key": "YOUR_KEY_ID",
        "amount": total * 100,
        "currency": "INR",
        "name": "ShardaHub",
        "handler": async function (response) {
            // enrollment loop
            for (const item of cart) {
                await enrollUser(item.id);
            }
            localStorage.removeItem('shardahub_cart');
            alert("Payment Success! Enrolled in courses.");
            window.location.href = 'dashboard.html';
        },
        "prefill": {
            "email": user.email
        }
    };
    new Razorpay(options).open();
}

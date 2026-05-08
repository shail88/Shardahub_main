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

    // Curriculum
    renderDetailedCurriculum(course.id);
}

async function renderDetailedCurriculum(courseId) {
    const container = document.getElementById('curriculumAccordion');
    if (!container) return;

    let curriculum = await ShardaDB.getCourseCurriculum(courseId);

    // Fallback if no lessons in DB
    if (curriculum.length === 0 && typeof courses !== 'undefined') {
        const dummy = courses.find(c => c.id === courseId);
        if (dummy) {
            if (dummy.detailedCurriculum) {
                curriculum = dummy.detailedCurriculum.map((m, i) => ({
                    id: `dm${i}`,
                    title: m.title,
                    lessons: m.lessons.map((l, j) => ({ id: `dl${i}-${j}`, title: l.title, duration_mins: l.duration_mins }))
                }));
            } else if (dummy.curriculum) {
                curriculum = [{
                    id: 'm1',
                    title: 'Course Introduction',
                    lessons: dummy.curriculum.map((l, i) => ({ id: `l${i}`, title: l, duration_mins: 10 }))
                }];
            }
        }
    }

    if (curriculum.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-secondary">Curriculum details coming soon...</div>';
        return;
    }

    container.innerHTML = curriculum.map((module, mIdx) => `
        <div class="accordion-item bg-transparent border-secondary mb-2 overflow-hidden rounded-3">
            <h2 class="accordion-header">
                <button class="accordion-button bg-transparent text-white shadow-none ${mIdx === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#module${mIdx}">
                    <div class="d-flex justify-content-between w-100 align-items-center me-3">
                        <span class="fw-bold fs-6">${module.title}</span>
                        <small class="text-secondary">${module.lessons.length} lessons</small>
                    </div>
                </button>
            </h2>
            <div id="module${mIdx}" class="accordion-collapse collapse ${mIdx === 0 ? 'show' : ''}" data-bs-parent="#curriculumAccordion">
                <div class="accordion-body p-0">
                    <ul class="list-group list-group-flush">
                        ${module.lessons.map((lesson, lIdx) => `
                            <li class="list-group-item bg-transparent text-secondary border-secondary d-flex justify-content-between align-items-center py-3">
                                <div class="d-flex align-items-center gap-3">
                                    <i class="bi bi-play-circle text-info"></i>
                                    <span class="small">${lesson.title}</span>
                                </div>
                                <span class="smaller opacity-50">${lesson.duration_mins || 5} min</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `).join('');
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
    if (!window.SubpassAuth?.user) {
        alert("Please Sign In to start this free course.");
        if (window.ShardaHeader) ShardaHeader.switchModal('loginModal', 'loginModal');
        return;
    }

    const user = window.SubpassAuth.user;

    // CRITICAL: Ensure the user record exists in the public.users table 
    // to satisfy foreign key constraints (Supabase Auth sync)
    await ShardaDB.ensureUserRecord(user.id, user.email, user.full_name);

    const { error } = await ShardaDB.enrollUser(user.id, courseId);

    if (error) {
        alert("Enrollment failed: " + error.message);
    } else {
        alert("Enrolled successfully!");
        window.location.href = `player.html?id=${courseId}`;
    }
}


// --- DASHBOARD ---
async function loadDashboardDB() {
    // Wait for auth system to resolve session
    if (window.SubpassAuth && window.SubpassAuth.ready) {
        await window.SubpassAuth.ready;
    }

    const user = SubpassAuth.user;
    if (!user) {
        console.warn("Dashboard: No user found after auth ready. Redirecting to login...");
        const baseUrl = window.ShardaBaseUrl || '../';
        window.location.href = baseUrl + 'login.html';
        return;
    }

    // const { recentEnrollments: enrollments } = await ShardaDB.getStats(); // Function doesn't exist
    // Filter enrollments for current user
    const userEnrollments = await ShardaDB.getEnrollments(user.id);
    const grid = document.getElementById('dashboardGrid');

    if (userEnrollments.length > 0) {
        document.getElementById('enrolledCount').innerText = userEnrollments.length;
        // Fetch full course data for these IDs - enrolling already joined courses
        const displayCourses = userEnrollments.map(e => e.courses).filter(Boolean);

        grid.innerHTML = displayCourses.map(course => `
            <div class="col-md-6 col-lg-4">
                <div class="card glass-card h-100 course-card">
                    <div class="course-img-wrapper">
                        <img src="${course.image_url || course.thumbnail_url}" class="card-img-top" alt="${course.title}">
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

    // Wait for auth system to resolve session
    if (window.SubpassAuth && window.SubpassAuth.ready) {
        await window.SubpassAuth.ready;
    }

    const user = SubpassAuth.user;

    if (!user) {
        alert("You must be logged in to access the full course.");
        const baseUrl = window.ShardaBaseUrl || '../';
        window.location.href = `${baseUrl}details.html?id=${id}`;
        return;
    }

    // Check Enrollment
    const enrollments = await ShardaDB.getEnrollments(user.id);
    const enrolled = enrollments.some(e => (e.courses?.id === id) || (e.course_id === id));

    if (!enrolled) {
        alert("You have not purchased this course.");
        const baseUrl = window.ShardaBaseUrl || '../';
        window.location.href = `${baseUrl}course/details.html?id=${id}`;
    }
}

// --- CART & PAYMENT (Consolidated with Global ShardaPayments) ---
function addToCart(course) {
    if (typeof ShardaPayments !== 'undefined') {
        ShardaPayments.addToCart({
            id: course.id,
            name: course.name || course.title,
            price: course.price,
            icon: course.icon || 'bi-mortarboard'
        });
    } else {
        console.error("ShardaPayments system not found. Check if assets/js/payments.js is loaded.");
        alert("Payment system initializing... please try again in a moment.");
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
async function initPlayer() {
    const accordion = document.getElementById('playerAccordion');
    if (!accordion) return;

    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('id');
    if (!courseId) return;

    // Wait for auth
    if (window.SubpassAuth && window.SubpassAuth.ready) await window.SubpassAuth.ready;
    const user = SubpassAuth.user;

    // Load Course Data
    const course = await ShardaDB.getCourseById(courseId);
    if (course) {
        document.getElementById('playerCourseTitle').innerText = course.title;
    }

    // Load Curriculum & Progress
    const curriculum = await ShardaDB.getCourseCurriculum(courseId);
    const progress = user ? await ShardaDB.getLessonProgress(user.id, courseId) : [];
    const completedLessonIds = progress.filter(p => p.is_completed).map(p => p.lesson_id);

    if (curriculum.length === 0) {
        accordion.innerHTML = '<div class="p-3 text-secondary small">No lessons found.</div>';
        return;
    }

    renderPlayerAccordion(curriculum, completedLessonIds);
    updateOverallProgress(curriculum, completedLessonIds);

    // Auto-play first lesson if none selected
    if (curriculum[0].lessons.length > 0) {
        playLesson(curriculum[0].lessons[0]);
    }
}

function renderPlayerAccordion(curriculum, completedLessonIds) {
    const accordion = document.getElementById('playerAccordion');
    accordion.innerHTML = curriculum.map((module, mIdx) => `
        <div class="accordion-item bg-transparent border-secondary border-start-0 border-end-0 border-top-0">
            <h2 class="accordion-header">
                <button class="accordion-button bg-dark text-white p-3 shadow-none collapsed small fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#playerMod${mIdx}">
                    Module ${mIdx + 1}: ${module.title}
                </button>
            </h2>
            <div id="playerMod${mIdx}" class="accordion-collapse collapse ${mIdx === 0 ? 'show' : ''}" data-bs-parent="#playerAccordion">
                <div class="accordion-body p-0">
                    <div class="list-group list-group-flush">
                        ${module.lessons.map(lesson => `
                            <button class="list-group-item list-group-item-action bg-transparent text-secondary border-secondary player-lesson-item d-flex align-items-center gap-3 py-3" 
                                id="lesson-${lesson.id}"
                                onclick="playLesson(${JSON.stringify(lesson).replace(/"/g, '&quot;')})">
                                <div class="form-check m-0">
                                    <input class="form-check-input" type="checkbox" ${completedLessonIds.includes(lesson.id) ? 'checked' : ''} onclick="event.stopPropagation(); toggleLesson(this, '${lesson.id}')">
                                </div>
                                <div class="flex-grow-1 small">${lesson.title}</div>
                                <i class="bi bi-play-circle smaller"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateOverallProgress(curriculum, completedIds) {
    const total = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
    const completed = completedIds.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const bar = document.getElementById('courseProgress');
    const text = document.getElementById('progressText');
    if (bar) bar.style.width = percent + '%';
    if (text) text.innerText = percent + '% Complete';
}

async function toggleLesson(checkbox, lessonId) {
    const user = SubpassAuth.user;
    if (!user) return;

    const success = await ShardaDB.updateLessonProgress(user.id, lessonId, checkbox.checked);
    if (!success) {
        checkbox.checked = !checkbox.checked; // Revert on failure
        return;
    }

    // Refresh overall progress (simple way for now)
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('id');
    const curriculum = await ShardaDB.getCourseCurriculum(courseId);
    const progress = await ShardaDB.getLessonProgress(user.id, courseId);
    const completedIds = progress.filter(p => p.is_completed).map(p => p.lesson_id);
    updateOverallProgress(curriculum, completedIds);
}

function playLesson(lesson) {
    const titleEl = document.getElementById('currentLessonTitle');
    if (titleEl) titleEl.innerText = lesson.title;

    // Update Video URL (Mocking frame for now or using lesson.content_url)
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        if (lesson.content_url) {
            videoContainer.innerHTML = `<iframe width="100%" height="100%" src="${lesson.content_url}" frameborder="0" allowfullscreen></iframe>`;
        } else {
            videoContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center h-100 w-100 bg-black text-secondary">
                    <div class="text-center">
                        <i class="bi bi-play-circle display-1 text-white opacity-50"></i>
                        <p class="mt-3">Playing: ${lesson.title}</p>
                        <small>No video URL provided for this lesson.</small>
                    </div>
                </div>
            `;
        }
    }

    // Highlight active in sidebar
    document.querySelectorAll('.player-lesson-item').forEach(item => item.classList.remove('active', 'text-white'));
    const activeItem = document.getElementById(`lesson-${lesson.id}`);
    if (activeItem) activeItem.classList.add('active', 'text-white');
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

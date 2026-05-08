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

// --- SUPABASE DATA LOADING ---
async function loadCoursesFromDB() {
    const { data, error } = await supabase.from('courses').select('*');
    if (error) {
        console.error('Error loading courses:', error);
        return;
    }
    // Global Access hack for filters
    window.allCourses = data;
    renderCourses(data);
}

function renderCourses(list) {
    if (!courseGrid) return;
    courseGrid.innerHTML = '';
    list.forEach(course => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 glass-card course-card">
                <div class="course-img-wrapper">
                    ${course.is_free ? '<span class="badge bg-success course-type-badge">FREE</span>' : '<span class="badge bg-dark course-type-badge">PAID</span>'}
                    <img src="${course.thumbnail_url}" class="card-img-top" alt="${course.title}">
                </div>
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <small class="text-accent text-uppercase fw-bold">${course.category}</small>
                        <div class="text-warning">
                             <i class="bi bi-star-fill"></i> ${course.rating || 'New'}
                        </div>
                    </div>
                    <h5 class="card-title fw-bold text-white mb-3 text-truncate" title="${course.title}">${course.title}</h5>
                    <p class="card-text text-secondary small flex-grow-1">${course.description ? course.description.substring(0, 80) : ''}...</p>
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                        <div>
                            <span class="price-tag text-gradient">₹${course.price}</span>
                        </div>
                        <a href="details.html?id=${course.id}" class="btn btn-sm btn-outline-primary rounded-pill px-3">View</a>
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

    const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).single();

    if (error || !course) {
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
    const demoBtn = document.getElementById('watchDemoBtn');

    if (course.is_free) {
        buyBtn.innerText = "Start Learning";
        buyBtn.onclick = () => handleFreeEnrollment(course.id);
        cartBtn.style.display = 'none';
    } else {
        buyBtn.onclick = () => { addToCart(course); window.location.href = 'checkout.html'; };
        cartBtn.onclick = () => addToCart(course);
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
}

async function handleFreeEnrollment(courseId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Please Sign In to start this free course.");
        window.location.href = 'login.html';
        return;
    }

    // Check if already enrolled
    if (await checkEnrollment(courseId)) {
        window.location.href = `player.html?id=${courseId}`;
        return;
    }

    // Enroll
    const { error } = await enrollUser(courseId);
    if (error) {
        alert("Error enrolling: " + error.message);
    } else {
        alert("Enrolled successfully!");
        window.location.href = `player.html?id=${courseId}`;
    }
}


// --- DASHBOARD ---
async function loadDashboardDB() {
    const { data: courses, error } = await fetchEnrollments();
    const grid = document.getElementById('dashboardGrid');

    if (error === 'Not logged in') {
        window.location.href = 'login.html';
        return;
    }

    if (courses.length > 0) {
        document.getElementById('enrolledCount').innerText = courses.length;
        grid.innerHTML = courses.map(course => `
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

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Not logged in -> Redirect to Details (they can see demo there)
        alert("You must be logged in to access the full course.");
        window.location.href = `details.html?id=${id}`;
        return;
    }

    // Check Enrollment
    const enrolled = await checkEnrollment(id);
    if (!enrolled) {
        alert("You have not purchased this course.");
        window.location.href = `details.html?id=${id}`;
    }
}

// --- CART & PAYMENT (Modified for Supabase) ---
function addToCart(course) {
    let cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    if (!cart.find(c => c.id === course.id)) {
        cart.push(course);
        localStorage.setItem('shardaCart', JSON.stringify(cart));
        updateCartIcon();
        alert("Added to Cart");
    } else {
        alert("Already in cart");
    }
}
function updateCartIcon() {
    const cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    if (cartCount) cartCount.innerText = cart.length;
}

function renderCart() {
    let cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    let total = 0, totalMRP = 0;

    cartItemsContainer.innerHTML = cart.map(item => {
        total += item.price;
        totalMRP += (item.originalPrice || item.price); // fallback if no Original Price in DB
        return `
            <tr>
                <td><img src="${item.thumbnail_url}" class="cart-img me-2"> ${item.title}</td>
                <td>₹${item.price}</td>
                <td><button onclick="removeFromCart('${item.id}')" class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button></td>
            </tr>
        `;
    }).join('');

    const discount = totalMRP - total;
    if (document.getElementById('mrpTotal')) document.getElementById('mrpTotal').innerText = '₹' + totalMRP;
    if (document.getElementById('discountTotal')) document.getElementById('discountTotal').innerText = '- ₹' + discount;
    if (cartTotalElement) cartTotalElement.innerText = '₹' + total;
}

function removeFromCart(id) {
    let cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    cart = cart.filter(c => c.id !== id);
    localStorage.setItem('shardaCart', JSON.stringify(cart));
    renderCart();
    updateCartIcon();
}

// Razorpay Logic (Enhanced)
async function startPayment() {
    const cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
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
            localStorage.removeItem('shardaCart');
            alert("Payment Success! Enrolled in courses.");
            window.location.href = 'dashboard.html';
        },
        "prefill": {
            "email": user.email
        }
    };
    new Razorpay(options).open();
}

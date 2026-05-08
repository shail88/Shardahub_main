// script.js

// Make sure data.js is loaded first.
// If not, we can assume `courses` is globally available or we fetch it.

const courseGrid = document.getElementById('courseGrid');
const cartCount = document.getElementById('cartCount');
const cartTotalElement = document.getElementById('cartTotal');
const cartItemsContainer = document.getElementById('cartItems');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the index page
    if (document.getElementById('courseGrid')) {
        renderCourses(courses);
        setupFilters();
    }

    // Check if we are on details page
    if (document.getElementById('courseDetails')) {
        loadCourseDetails();
    }

    // Check if we are on cart page
    if (document.getElementById('cartItems')) {
        renderCart();
    }

    // Update Cart Count in Header
    updateCartIcon();
});

// --- COURSES LISTING ---
function renderCourses(list) {
    if (!courseGrid) return;
    courseGrid.innerHTML = '';
    list.forEach(course => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 glass-card course-card">
                <div class="course-img-wrapper">
                    <span class="badgem bg-dark text-white course-type-badge text-uppercase">${course.type}</span>
                    <img src="${course.thumbnail}" class="card-img-top" alt="${course.title}">
                </div>
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <small class="text-accent text-uppercase fw-bold">${course.category}</small>
                        <div class="text-warning">
                            <i class="bi bi-star-fill"></i> ${course.rating}
                        </div>
                    </div>
                    <h5 class="card-title fw-bold text-white mb-3 text-truncate" title="${course.title}">${course.title}</h5>
                    <p class="card-text text-secondary small flex-grow-1">${course.description.substring(0, 80)}...</p>
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                        <div>
                            <span class="price-tag text-gradient">₹${course.price}</span>
                            <span class="original-price ms-2 text-decoration-line-through text-muted">₹${course.originalPrice}</span>
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
            // Remove active class
            filters.forEach(f => f.classList.remove('active', 'bg-primary', 'text-white'));
            // Add active
            btn.classList.add('active', 'bg-primary', 'text-white');

            const category = btn.getAttribute('data-filter');
            const filtered = category === 'all' ? courses : courses.filter(c => c.category.toLowerCase() === category || c.type === category);
            renderCourses(filtered);
        });
    });
}

// --- DETAILS PAGE ---
function loadCourseDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const course = courses.find(c => c.id === id);

    if (!course) {
        document.getElementById('courseDetails').innerHTML = '<div class="text-center py-5"><h3>Course not found</h3><a href="index.html" class="btn btn-primary">Back to Courses</a></div>';
        return;
    }

    // Update DOM Elements
    document.getElementById('detailTitle').innerText = course.title;
    document.getElementById('detailDesc').innerText = course.description;
    document.getElementById('detailPrice').innerText = '₹' + course.price;
    document.getElementById('detailOgPrice').innerText = '₹' + course.originalPrice;
    document.getElementById('detailThumb').src = course.thumbnail;
    document.getElementById('detailInstructor').innerText = course.instructor;
    document.getElementById('detailDuration').innerText = course.duration;

    // Setup Buttons
    document.getElementById('addToCartBtn').onclick = () => addToCart(course);
    document.getElementById('buyNowBtn').onclick = () => {
        addToCart(course);
        window.location.href = 'checkout.html';
    };

    // Render Curriculum
    const curriculumList = document.getElementById('curriculumList');
    if (curriculumList) {
        curriculumList.innerHTML = course.curriculum.map((item, i) => `
            <li class="list-group-item bg-transparent text-secondary border-secondary d-flex justify-content-between align-items-center">
                <span><i class="bi bi-play-circle me-2"></i> Module ${i + 1}: ${item}</span>
                <span class="badge bg-secondary rounded-pill">Lock</span>
            </li>
        `).join('');
    }
}

// --- CART LOGIC ---
function addToCart(course) {
    let cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    // Check if exists
    if (!cart.find(item => item.id === course.id)) {
        cart.push(course);
        localStorage.setItem('shardaCart', JSON.stringify(cart));
        showToast('Added to cart!');
        updateCartIcon();
    } else {
        showToast('Already in cart!');
    }
}

function removeFromCart(id) {
    let cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('shardaCart', JSON.stringify(cart));
    renderCart(); // Re-render
    updateCartIcon();
}

function updateCartIcon() {
    let cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    if (cartCount) cartCount.innerText = cart.length;
}

function renderCart() {
    let cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<tr><td colspan="4" class="text-center py-4">Your cart is empty. <a href="index.html">Shop Now</a></td></tr>';
        if (cartTotalElement) cartTotalElement.innerText = '₹0';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        total += item.price;
        return `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${item.thumbnail}" class="cart-img me-3" alt="${item.title}">
                    <div>
                        <h6 class="mb-0 text-white">${item.title}</h6>
                        <small class="text-secondary">${item.type}</small>
                    </div>
                </div>
            </td>
            <td class="text-white">₹${item.price}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart('${item.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>
        `;
    }).join('');

    if (cartTotalElement) cartTotalElement.innerText = '₹' + total;
}

// --- UTILS ---
function showToast(msg) {
    // Simple alert replacement or boostrap toast if available
    // For now, simple alert to not complicate dependent DOM
    alert(msg);
}

// --- AUTH & CHECKOUT MOCK ---
// Razorpay Mock
function startPayment() {
    const cart = JSON.parse(localStorage.getItem('shardaCart')) || [];
    const total = cart.reduce((acc, item) => acc + item.price, 0);

    if (total === 0) {
        alert('Cart is empty');
        return;
    }

    const options = {
        "key": "YOUR_KEY_ID", // Enter the Key ID generated from the Dashboard
        "amount": total * 100, // Amount is in currency subunits. Default currency is INR.
        "currency": "INR",
        "name": "ShardaHub Courses",
        "description": "Purchase of courses",
        "image": "https://example.com/your_logo",
        "handler": function (response) {
            alert("Payment Successful! Payment ID: " + response.razorpay_payment_id);
            localStorage.removeItem('shardaCart');
            window.location.href = 'index.html'; // Redirect to My Courses
        },
        "prefill": {
            "name": document.getElementById('fullName')?.value || "User",
            "email": document.getElementById('email')?.value || "user@example.com",
            "contact": "9999999999"
        },
        "theme": {
            "color": "#3399cc"
        }
    };

    // In a real scenario, you'd create an order on backend first.
    // Since this is client-side only mock:
    const rzp1 = new Razorpay(options);
    rzp1.open();
    // e.preventDefault();
}

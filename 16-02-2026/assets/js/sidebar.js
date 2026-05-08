/**
 * ShardaHub Master Sidebar Loader
 * 
 * To use: 
 * 1. Add <div id="shardahub-sidebar"></div> to your HTML
 * 2. Link this script at the end of body
 */

document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('shardahub-sidebar');
    if (!sidebarContainer) return;

    const currentPath = window.location.pathname.replace(/\\/g, '/');
    const subdirs = ['ai', 'saas', 'templates', 'robotics', 'games', 'shop', 'course'];
    let baseUrl = './';

    // Check if we are inside a subdomain folder
    for (const dir of subdirs) {
        if (currentPath.toLowerCase().includes(`/${dir}/`)) {
            baseUrl = '../';
            break;
        }
    }

    // Set globally for header.js and others
    window.ShardaBaseUrl = baseUrl;

    const sidebarHTML = `
        <button class="mobile-toggle" id="sidebar-toggle">
            <i class="bi bi-list"></i>
        </button>
        <aside class="sidebar" id="main-sidebar">
            <div class="sidebar-header">
                <a href="${baseUrl}index.html" class="text-decoration-none d-flex align-items-center gap-2">
                    <i class="bi bi-layers-half fs-2 text-gradient"></i>
                    <span class="fs-4 fw-bold text-white">ShardaHub</span>
                </a>
            </div>
            
            <nav class="nav-menu">
                <div class="nav-item">
                    <a href="${baseUrl}index.html" class="nav-link ${currentPath.endsWith('index.html') ? 'active' : ''}">
                        <i class="bi bi-house-door"></i>
                        <span>Home</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="${baseUrl}shop/index.html" class="nav-link ${currentPath.includes('/shop/') ? 'active' : ''}">
                        <i class="bi bi-bag-check"></i>
                        <span>Shop</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="${baseUrl}games/index.html" class="nav-link ${currentPath.includes('/games/') ? 'active' : ''}">
                        <i class="bi bi-controller"></i>
                        <span>Games</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="${baseUrl}ai/index.html" class="nav-link nav-link-ai ${currentPath.includes('/ai/') ? 'active' : ''}">
                        <i class="bi bi-cpu"></i>
                        <span>AI Tools</span>
                        <span class="ai-badge">Flagship</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="${baseUrl}saas/index.html" class="nav-link ${currentPath.includes('/saas/') ? 'active' : ''}">
                        <i class="bi bi-cloud-check"></i>
                        <span>SaaS</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="${baseUrl}templates/index.html" class="nav-link ${currentPath.includes('/templates/') ? 'active' : ''}">
                        <i class="bi bi-columns-gap"></i>
                        <span>Templates</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="${baseUrl}robotics/index.html" class="nav-link ${currentPath.includes('/robotics/') ? 'active' : ''}">
                        <i class="bi bi-robot"></i>
                        <span>Robotics</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="${baseUrl}course/index.html" class="nav-link ${currentPath.includes('/course/') ? 'active' : ''}">
                        <i class="bi bi-mortarboard"></i>
                        <span>Courses</span>
                    </a>
                </div>

                <div class="nav-item mt-2">
                    <button class="nav-link w-100 border-0 bg-transparent" id="open-cart-sidebar" data-bs-toggle="offcanvas" data-bs-target="#cartSidebar">
                        <i class="bi bi-cart3"></i>
                        <span>My Cart</span>
                        <span id="cartCount" class="badge rounded-pill bg-danger ms-auto d-none">0</span>
                    </button>
                </div>
                
                <div class="mt-4 pt-4 border-top border-secondary">
                    <div class="nav-item">
                        <a href="${baseUrl}#about" class="nav-link">
                            <i class="bi bi-info-circle"></i>
                            <span>About Us</span>
                        </a>
                    </div>
                    <div class="nav-item">
                        <a href="${baseUrl}#contact" class="nav-link">
                            <i class="bi bi-envelope"></i>
                            <span>Contact</span>
                        </a>
                    </div>
                </div>
            </nav>
            
            <div class="sidebar-footer mt-auto pt-3 border-top border-secondary">
                <div class="d-flex align-items-center gap-2 text-secondary">
                    <i class="bi bi-person-circle fs-5"></i>
                    <span class="small">Sign In</span>
                </div>
            </div>
        </aside>

        <!-- Global Cart Sidebar (Offcanvas) -->
        <div class="offcanvas offcanvas-end glass" tabindex="-1" id="cartSidebar" aria-labelledby="cartSidebarLabel" style="width: 400px; border-left: 1px solid rgba(255,255,255,0.1);">
            <div class="offcanvas-header border-bottom border-secondary">
                <h5 class="offcanvas-title fw-bold" id="cartSidebarLabel"><i class="bi bi-cart3 text-info me-2"></i>Your Cart</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body d-flex flex-column h-100">
                <div id="sidebarCartContents" class="flex-grow-1 overflow-auto pe-2">
                    <!-- Items dynamically populated -->
                </div>
                <div class="cart-footer mt-auto pt-4 border-top border-secondary">
                    <div class="d-flex justify-content-between mb-3">
                        <span class="text-secondary">Total:</span>
                        <span class="h5 fw-bold text-info" id="sidebarCartTotal">₹0.00</span>
                    </div>
                    <div class="d-grid gap-2">
                        <a href="${baseUrl}checkout.html" class="btn btn-info rounded-pill py-2 fw-bold glow-effect">Checkout Now</a>
                        <button class="btn btn-outline-secondary btn-sm py-2 rounded-pill" onclick="ShardaPayments.clearCart()">Clear All</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    sidebarContainer.innerHTML = sidebarHTML;
    window.ShardaBaseUrl = baseUrl;

    // Toggle functionality
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('main-sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const icon = toggleBtn.querySelector('i');
            if (sidebar.classList.contains('open')) {
                icon.classList.replace('bi-list', 'bi-x');
            } else {
                icon.classList.replace('bi-x', 'bi-list');
            }
        });
    }

    // --- ECOSYSTEM AUTO-LOADER ---
    const scripts = [
        { id: 'shardahub-db-script', src: 'assets/js/sharda-db.js' },
        { id: 'shardahub-auth-script', src: 'assets/js/auth.js' },
        { id: 'shardahub-header-script', src: 'assets/js/header.js' },
        { id: 'shardahub-payments-script', src: 'assets/js/payments.js' }
    ];

    scripts.forEach(s => {
        if (!document.getElementById(s.id)) {
            const script = document.createElement('script');
            script.id = s.id;
            script.src = `${baseUrl}${s.src}`;
            script.async = false; // Maintain order
            document.head.appendChild(script);
        }
    });

    // Listen for Auth Updates to refresh sidebar footer
    document.addEventListener('sharda-auth-updated', (e) => {
        const footer = document.querySelector('.sidebar-footer');
        if (!footer) return;

        const { user } = e.detail;
        if (user) {
            footer.innerHTML = `
                <div class="d-flex align-items-center gap-2 text-white">
                    <img src="${user.avatar}" width="28" height="28" class="rounded-circle border border-info shadow-sm">
                    <div class="d-flex flex-column overflow-hidden">
                        <span class="small fw-bold text-truncate">${user.full_name}</span>
                        <span class="badge bg-info text-dark" style="font-size: 0.6rem; width: fit-content;">${user.role}</span>
                    </div>
                </div>
            `;
        } else {
            footer.innerHTML = `
                <div class="d-flex align-items-center gap-2 text-secondary cursor-pointer hover-bright" onclick="SubpassAuth.showLogin()">
                    <i class="bi bi-person-circle fs-5"></i>
                    <span class="small fw-bold">Sign In</span>
                </div>
            `;
        }
    });
});

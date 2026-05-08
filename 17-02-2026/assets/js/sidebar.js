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
                <a href="${baseUrl}login.html" class="d-flex align-items-center gap-2 text-secondary text-decoration-none hover-bright">
                    <i class="bi bi-person-circle fs-5"></i>
                    <span class="small fw-bold">Sign In</span>
                </a>
            </div>
        </aside>
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
        { id: 'shardahub-supabase-lib', src: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', external: true },
        { id: 'shardahub-lib-supabase', src: 'lib/supabase.js' },
        { id: 'shardahub-db-script', src: 'assets/js/sharda-db.js' },
        { id: 'shardahub-auth-script', src: 'assets/js/auth.js' },
        { id: 'shardahub-header-script', src: 'assets/js/header.js' }
    ];

    scripts.forEach(s => {
        // More robust check: also check if script with same src is already in DOM
        const existingScript = document.getElementById(s.id) ||
            document.querySelector(`script[src*="${s.src}"]`);

        if (!existingScript) {
            const script = document.createElement('script');
            script.id = s.id;
            script.src = s.external ? s.src : `${baseUrl}${s.src}`;
            script.async = false;
            document.head.appendChild(script);
        }
    });

    // Listen for Auth Updates to refresh sidebar footer
    if (!window._shardaSidebarAuthListener) {
        window._shardaSidebarAuthListener = true;
        document.addEventListener('sharda-auth-updated', (e) => {
            const footer = document.querySelector('.sidebar-footer');
            if (!footer) return;

            const { user } = e.detail;
            if (user) {
                footer.innerHTML = `
                    <div class="d-flex flex-column gap-2">
                        <div class="d-flex align-items-center justify-content-between text-white">
                            <div class="d-flex align-items-center gap-2 overflow-hidden">
                                <img src="${user.avatar}" width="28" height="28" class="rounded-circle border border-info shadow-sm">
                                <div class="d-flex flex-column overflow-hidden">
                                    <span class="small fw-bold text-truncate">${user.full_name}</span>
                                    <span class="badge bg-info text-dark" style="font-size: 0.6rem; width: fit-content;">${user.role}</span>
                                </div>
                            </div>
                            <button class="btn btn-sm text-secondary hover-danger p-0 border-0" onclick="SubpassAuth.logout()" title="Logout">
                                <i class="bi bi-box-arrow-right fs-5"></i>
                            </button>
                        </div>
                        <a href="${baseUrl}index.html" class="btn btn-sm btn-outline-info rounded-pill w-100 mt-1 py-1 fw-bold" style="font-size: 0.75rem;">
                            <i class="bi bi-play-circle-fill me-1"></i> Resume Hub
                        </a>
                    </div>
                `;
            } else {
                footer.innerHTML = `
                    <a href="${baseUrl}login.html" class="d-flex align-items-center gap-2 text-secondary text-decoration-none hover-bright">
                        <i class="bi bi-person-circle fs-5"></i>
                        <span class="small fw-bold">Sign In</span>
                    </a>
                `;
            }
        });
    }
});

/**
 * ShardaHub Unified Global Header
 * Injects a consistent header and auth modals across all subdomains.
 */
const ShardaHeader = {
    init() {
        this.injectStyles();
        this.injectHeader();
        this.injectModals();
        this.setupEventListeners();
        console.log("ShardaHub Unified Header Injected");
    },

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .global-header {
                height: 70px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 2rem;
                background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(12px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                position: sticky;
                top: 0;
                z-index: 1100;
            }
            .auth-buttons .btn {
                padding: 0.5rem 1.5rem;
                font-weight: 600;
                border-radius: 50px;
            }
            .profile-avatar {
                width: 40px;
                height: 40px;
                border: 2px solid var(--ai-accent);
                border-radius: 50%;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .profile-avatar:hover { transform: scale(1.1); }
            
            .sharda-modal .modal-content {
                background: var(--bg-deep);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
            }
            .sharda-modal .form-control {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
            }
            .sharda-modal .form-control:focus {
                background: rgba(255, 255, 255, 0.1);
                border-color: var(--ai-accent);
                box-shadow: 0 0 10px var(--ai-glow);
            }
        `;
        document.head.appendChild(style);
    },

    injectHeader() {
        const header = document.createElement('header');
        header.className = 'global-header';
        header.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <a href="${window.ShardaBaseUrl}index.html" class="text-decoration-none d-flex align-items-center gap-2">
                    <i class="bi bi-layers-half fs-3 text-gradient"></i>
                    <span class="fs-4 fw-bold text-white d-none d-md-block">ShardaHub</span>
                </a>
            </div>
            
            <div class="auth-box" id="global-auth-ui">
                <!-- Injected via updateUI -->
            </div>
        `;
        // Insert before main content or wrapper
        const mainWrapper = document.querySelector('.main-wrapper');
        if (mainWrapper) {
            mainWrapper.insertBefore(header, mainWrapper.firstChild);
        } else {
            document.body.prepend(header);
        }
    },

    injectModals() {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'sharda-modal-container';
        modalContainer.innerHTML = `
            <!-- Login Modal -->
            <div class="modal fade sharda-modal" id="loginModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content glass p-4">
                        <div class="modal-header border-0 pb-0">
                            <h4 class="fw-bold"><i class="bi bi-shield-lock text-info me-2"></i>Secure Login</h4>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label class="small text-secondary mb-1">EMAIL ADDRESS</label>
                                    <input type="email" id="loginEmail" class="form-control" placeholder="name@example.com" required>
                                </div>
                                <div class="mb-4">
                                    <label class="small text-secondary mb-1">PASSWORD</label>
                                    <input type="password" id="loginPassword" class="form-control" placeholder="••••••••" required>
                                </div>
                                <button type="submit" class="btn btn-info w-100 rounded-pill py-2 fw-bold">Login to ShardaHub</button>
                            </form>
                            <div class="mt-4 text-center">
                                <p class="small text-secondary">Don't have an account? <a href="#" onclick="ShardaHeader.switchModal('loginModal', 'signupModal')" class="text-info">Sign Up</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Signup Modal -->
            <div class="modal fade sharda-modal" id="signupModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content glass p-4">
                        <div class="modal-header border-0 pb-0">
                            <h4 class="fw-bold"><i class="bi bi-person-plus text-info me-2"></i>Join Ecosystem</h4>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="signupForm">
                                <div class="mb-3">
                                    <label class="small text-secondary mb-1">FULL NAME</label>
                                    <input type="text" id="signupName" class="form-control" placeholder="John Doe" required>
                                </div>
                                <div class="mb-3">
                                    <label class="small text-secondary mb-1">EMAIL ADDRESS</label>
                                    <input type="email" id="signupEmail" class="form-control" placeholder="name@example.com" required>
                                </div>
                                <div class="mb-4">
                                    <label class="small text-secondary mb-1">PASSWORD</label>
                                    <input type="password" id="signupPassword" class="form-control" placeholder="••••••••" required>
                                </div>
                                <button type="submit" class="btn btn-info w-100 rounded-pill py-2 fw-bold">Create Account</button>
                            </form>
                            <div class="mt-4 text-center">
                                <p class="small text-secondary">Already have an account? <a href="#" onclick="ShardaHeader.switchModal('signupModal', 'loginModal')" class="text-info">Login</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
    },

    setupEventListeners() {
        // Listen for Auth Updates
        document.addEventListener('sharda-auth-updated', (e) => this.updateUI(e.detail));

        // Listen for Modal Triggers
        document.addEventListener('sharda-show-login', () => new bootstrap.Modal(document.getElementById('loginModal')).show());
        document.addEventListener('sharda-show-signup', () => new bootstrap.Modal(document.getElementById('signupModal')).show());

        // Form Submissions
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await SubpassAuth.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
            if (res.success) {
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                location.reload();
            } else {
                alert(res.error);
            }
        });

        document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await SubpassAuth.signup(
                document.getElementById('signupEmail').value,
                document.getElementById('signupPassword').value,
                document.getElementById('signupName').value
            );
            bootstrap.Modal.getInstance(document.getElementById('signupModal')).hide();
            location.reload();
        });
    },

    switchModal(hideId, showId) {
        bootstrap.Modal.getInstance(document.getElementById(hideId)).hide();
        setTimeout(() => new bootstrap.Modal(document.getElementById(showId)).show(), 500);
    },

    updateUI(data) {
        const container = document.getElementById('global-auth-ui');
        if (!container) return;

        const baseUrl = window.ShardaBaseUrl || './';

        if (data.user) {
            container.innerHTML = `
                <div class="dropdown">
                    <img src="${data.user.avatar}" class="profile-avatar dropdown-toggle" id="profileDropdown" data-bs-toggle="dropdown">
                    <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark shadow border-secondary">
                        <li class="px-3 py-2 border-bottom border-secondary mb-2">
                            <div class="fw-bold small">${data.user.full_name}</div>
                            <div class="text-secondary smaller" style="font-size: 0.75rem;">${data.user.role} Member</div>
                        </li>
                        <li><a class="dropdown-item py-2" href="${baseUrl}index.html"><i class="bi bi-grid me-2"></i>Dashboard</a></li>
                        <li><a class="dropdown-item py-2" href="${baseUrl}checkout.html"><i class="bi bi-bag-check me-2"></i>My Purchases</a></li>
                        <li><a class="dropdown-item py-2" href="${baseUrl}course/index.html"><i class="bi bi-mortarboard me-2"></i>My Learning</a></li>
                        <li><a class="dropdown-item py-2" href="${baseUrl}ai/index.html"><i class="bi bi-cpu me-2"></i>AI Usage</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item py-2 text-danger" href="#" onclick="SubpassAuth.logout(); return false;"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                    </ul>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="auth-buttons d-flex gap-2">
                    <button class="btn btn-outline-light btn-sm" onclick="SubpassAuth.showLogin()"><i class="bi bi-shield-lock me-1"></i>Login</button>
                    <button class="btn btn-info btn-sm" onclick="SubpassAuth.showSignup()"><i class="bi bi-person-plus me-1"></i>Sign Up</button>
                </div>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => ShardaHeader.init());

/**
 * ShardaHub Standardized Footer
 */
document.addEventListener('DOMContentLoaded', () => {
    const footerContainer = document.getElementById('shardahub-footer');
    if (!footerContainer) return;

    footerContainer.innerHTML = `
        <footer class="mt-5 py-5 border-top border-secondary">
            <div class="container text-center">
                <div class="row g-4 mb-4">
                    <div class="col-md-4 text-md-start">
                        <h5 class="fw-bold mb-3 text-white">ShardaHub</h5>
                        <p class="small text-secondary">An Integrated Digital Technology Ecosystem centralizing innovation in AI, SaaS, and Robotics.</p>
                        <div class="d-flex gap-3 fs-5 mt-3">
                            <a href="#" class="text-secondary hover-bright"><i class="bi bi-linkedin"></i></a>
                            <a href="#" class="text-secondary hover-bright"><i class="bi bi-twitter-x"></i></a>
                            <a href="#" class="text-secondary hover-bright"><i class="bi bi-github"></i></a>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <h5 class="fw-bold mb-3 text-white">Quick Links</h5>
                        <ul class="list-unstyled small">
                            <li><a href="${window.ShardaBaseUrl}index.html" class="text-secondary text-decoration-none">Home</a></li>
                            <li><a href="${window.ShardaBaseUrl}ai/index.html" class="text-secondary text-decoration-none">AI Tools</a></li>
                            <li><a href="${window.ShardaBaseUrl}course/index.html" class="text-secondary text-decoration-none">Courses</a></li>
                        </ul>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <h5 class="fw-bold mb-3 text-white">Support</h5>
                        <ul class="list-unstyled small">
                            <li><a href="${window.ShardaBaseUrl}policy.html" class="text-secondary text-decoration-none">Privacy Policy</a></li>
                            <li><a href="${window.ShardaBaseUrl}policy.html" class="text-secondary text-decoration-none">Terms of Service</a></li>
                            <li><a href="mailto:support@shardahub.com" class="text-secondary text-decoration-none">support@shardahub.com</a></li>
                        </ul>
                    </div>
                </div>
                <div class="border-top border-secondary pt-4">
                    <p class="small text-secondary mb-0">&copy; ${new Date().getFullYear()} ShardaHub. All rights reserved.</p>
                </div>
            </div>
        </footer>
    `;
});

/**
 * CivicTrack Common UI Utilities & App Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    initCounters();
});

/**
 * Updates navbar dynamic items based on user login state and role
 */
function updateNavigation() {
    const authNav = document.getElementById('auth-nav-items');
    if (!authNav) return;

    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
        const user = Auth.getCurrentUser();
        const roleBadge = (user && user.roles && user.roles.length > 0) ? user.roles[0].replace('ROLE_', '') : 'USER';
        
        let dashboardUrl = 'citizen-dashboard.html';
        if (Auth.hasRole('ROLE_ADMIN')) {
            dashboardUrl = 'admin-dashboard.html';
        } else if (Auth.hasRole(['ROLE_OFFICIAL', 'ROLE_STAFF'])) {
            dashboardUrl = 'official-dashboard.html';
        }

        authNav.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <a class="btn btn-outline-primary btn-sm fw-semibold" href="${dashboardUrl}">
                    <i class="bi bi-speedometer2 me-1"></i> Dashboard
                </a>
                <div class="dropdown">
                    <button class="btn btn-primary btn-sm dropdown-toggle fw-semibold d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i>
                        <span class="d-none d-sm-inline">${(user && (user.fullName || user.email)) || 'Account'}</span>
                        <span class="badge bg-light text-primary brand-badge">${roleBadge}</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                        <li><a class="dropdown-item py-2" href="${dashboardUrl}"><i class="bi bi-person me-2"></i> My Portal</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item py-2 text-danger" onclick="Auth.logout()"><i class="bi bi-box-arrow-right me-2"></i> Sign Out</button></li>
                    </ul>
                </div>
            </div>
        `;
    } else {
        authNav.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <a href="login.html" class="btn btn-outline-primary btn-sm fw-semibold px-3 py-2">
                    <i class="bi bi-box-arrow-in-right me-1"></i> Login
                </a>
                <a href="register.html" class="btn btn-gov-primary btn-sm px-3 py-2">
                    <i class="bi bi-person-plus-fill me-1"></i> Register
                </a>
            </div>
        `;
    }
}

/**
 * Animated statistics numbers trigger on viewport view
 */
function initCounters() {
    const statElements = document.querySelectorAll('.stat-number');
    if (!statElements || statElements.length === 0) return;

    let animated = false;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                statElements.forEach(el => {
                    const target = parseFloat(el.getAttribute('data-target'));
                    if (isNaN(target)) return;

                    const suffix = el.getAttribute('data-suffix') || '';
                    const isDecimal = el.getAttribute('data-decimal') || (target % 1 !== 0);
                    const duration = 1500;
                    const steps = 60;
                    const increment = target / steps;
                    let current = 0;

                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        const formatted = isDecimal
                            ? current.toFixed(1)
                            : Math.floor(current).toLocaleString();
                        el.textContent = formatted + suffix;
                    }, duration / steps);
                });
            }
        });
    }, { threshold: 0.3 });

    const statsSection = document.getElementById('statistics');
    if (statsSection) observer.observe(statsSection);
}

/**
 * Helper to display toast/alert messages
 */
function showNotification(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 show mb-2 shadow`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    container.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 4000);
}

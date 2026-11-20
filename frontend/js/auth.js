/**
 * CivicTrack Authentication Module
 * Handles login, registration, logout, session persistence, and role guards.
 * Integrates directly with Spring Boot Security JWT backend.
 */
const Auth = {
    /**
     * Authenticate user with email and password
     */
    async login(email, password) {
        const response = await Api.post('/auth/login', { email, password });
        const token = response.accessToken || response.token;

        if (response && token) {
            Api.setToken(token);

            const role = response.role || (Array.isArray(response.roles) && response.roles[0]) || 'ROLE_CITIZEN';
            const roles = Array.isArray(response.roles) && response.roles.length > 0 ? response.roles : [role];

            const accountNumber = response.accountNumber || ('CT-RES-' + String(response.userId || '').padStart(5, '0'));
            const userSession = {
                id: response.userId,
                fullName: response.fullName,
                email: response.email,
                phoneNumber: response.phoneNumber || null,
                address: response.address || null,
                accountNumber: accountNumber,
                role: role,
                roles: roles,
                department: response.department
            };

            localStorage.setItem('civictrack_user', JSON.stringify(userSession));
            return { ...response, token, role, roles };
        }
        throw new Error('Invalid authentication response from server.');
    },

    /**
     * Dedicated Citizen Login
     */
    async loginCitizen(email, password) {
        const response = await Api.post('/auth/login/citizen', { email, password });
        return this.handleAuthSuccess(response);
    },

    /**
     * Dedicated Admin Login
     */
    async loginAdmin(email, password) {
        const response = await Api.post('/auth/login/admin', { email, password });
        return this.handleAuthSuccess(response);
    },

    /**
     * Dedicated Staff Login
     */
    async loginStaff(email, password) {
        const response = await Api.post('/auth/login/staff', { email, password });
        return this.handleAuthSuccess(response);
    },

    /**
     * Register a new citizen account
     * Enforces ROLE_CITIZEN strictly.
     */
    async register(userData) {
        return await Api.post('/auth/register', userData);
    },

    /**
     * Helper to persist auth response
     */
    handleAuthSuccess(response) {
        const token = response.accessToken || response.token;
        if (response && token) {
            Api.setToken(token);
            const role = response.role || (Array.isArray(response.roles) && response.roles[0]) || 'ROLE_CITIZEN';
            const roles = Array.isArray(response.roles) && response.roles.length > 0 ? response.roles : [role];

            const accountNumber = response.accountNumber || ('CT-RES-' + String(response.userId || '').padStart(5, '0'));
            const userSession = {
                id: response.userId,
                fullName: response.fullName,
                email: response.email,
                phoneNumber: response.phoneNumber || null,
                address: response.address || null,
                accountNumber: accountNumber,
                role: role,
                roles: roles,
                department: response.department
            };

            localStorage.setItem('civictrack_user', JSON.stringify(userSession));
            return { ...response, token, role, roles };
        }
        throw new Error('Invalid authentication response from server.');
    },

    /**
     * Log out current user, clear tokens, and redirect
     */
    logout() {
        try {
            Api.post('/auth/logout', {}).catch(() => {});
        } catch (e) {}
        Api.clearSession();
        window.location.href = 'login.html';
    },

    /**
     * Get current logged-in user details
     */
    getCurrentUser() {
        const user = localStorage.getItem('civictrack_user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Refresh current user profile asynchronously from /users/me
     */
    async refreshProfile() {
        try {
            if (!this.isAuthenticated()) return null;
            const profile = await Api.get('/users/me');
            if (profile) {
                const cur = this.getCurrentUser() || {};
                const accNo = profile.accountNumber || ('CT-RES-' + String(profile.id || cur.id || '').padStart(5, '0'));
                const updated = {
                    ...cur,
                    id: profile.id || cur.id,
                    fullName: profile.fullName || cur.fullName,
                    email: profile.email || cur.email,
                    phoneNumber: profile.phoneNumber || cur.phoneNumber,
                    address: profile.address || cur.address,
                    accountNumber: accNo,
                    department: profile.department || cur.department,
                    createdAt: profile.createdAt || cur.createdAt
                };
                localStorage.setItem('civictrack_user', JSON.stringify(updated));
                return updated;
            }
        } catch (e) {
            console.warn('[Auth] Failed to refresh profile:', e);
        }
        return this.getCurrentUser();
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!Api.getToken();
    },

    /**
     * Check if user possesses a specific role or any of the allowed roles
     */
    hasRole(requiredRoles) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const roleList = user.roles || (user.role ? [user.role] : []);
        const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        return rolesToCheck.some(req => {
            if (!req) return false;
            const normalized = req.startsWith('ROLE_') ? req : 'ROLE_' + req;
            const bare = req.replace(/^ROLE_/, '');
            return roleList.some(r => r === req || r === normalized || r === bare);
        });
    },

    /**
     * Route protection helper: redirects to login if unauthenticated or missing role
     */
    requireAuth(requiredRole = null) {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        if (requiredRole && !this.hasRole(requiredRole)) {
            alert('Access Denied: You do not have permission to view this page.');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};

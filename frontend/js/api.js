/**
 * CivicTrack API Client
 * Centralized HTTP request handling with JWT Bearer Token integration.
 * Supports auto-detection of local vs production cloud backends (Render / Railway / Vercel).
 */
const API_BASE_URL = (() => {
    if (typeof window !== 'undefined') {
        if (window.CIVICTRACK_API_BASE) return window.CIVICTRACK_API_BASE;
        const stored = localStorage.getItem('civictrack_api_url');
        if (stored) return stored;

        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname === '') {
            return 'http://localhost:8080/api/v1';
        }
    }
    // In production cloud environments, route through proxy or configured base
    return '/api/v1';
})();

const Api = {
    /**
     * Get stored JWT Token from localStorage
     */
    getToken() {
        return localStorage.getItem('civictrack_token');
    },

    /**
     * Set stored JWT Token in localStorage
     */
    setToken(token) {
        localStorage.setItem('civictrack_token', token);
    },

    /**
     * Clear token and user session data
     */
    clearSession() {
        localStorage.removeItem('civictrack_token');
        localStorage.removeItem('civictrack_user');
    },

    /**
     * Perform HTTP fetch with Authorization header and JSON body
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            // Handle Unauthorized globally
            if (response.status === 401) {
                this.clearSession();
                if (!window.location.pathname.endsWith('login.html')) {
                    window.location.href = 'login.html';
                }
                throw new Error('Session expired. Please log in again.');
            }

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const message = (data && data.message) ? data.message : `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    /**
     * Multipart form data request for file uploads
     */
    async upload(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {};
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });

        if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error((data && data.message) || 'Upload failed');
        }

        return response.json();
    }
};

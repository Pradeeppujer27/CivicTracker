/**
 * CivicTrack Notification System
 * In-app status change notifications, unread counters, real-time polling, and notification history.
 * Zero fake notifications: backed by MySQL and Spring Boot REST API.
 */

const NotificationService = {
    /**
     * Fetch all in-app notifications for authenticated user
     */
    async getAll() {
        return await Api.get('/notifications');
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount() {
        return await Api.get('/notifications/unread-count');
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(id) {
        return await Api.put(`/notifications/${id}/read`);
    },

    /**
     * Mark all notifications as read for current user
     */
    async markAllAsRead() {
        return await Api.put('/notifications/read-all');
    }
};

const NotificationManager = {
    state: {
        notifications: [],
        unreadCount: 0,
        filterTab: 'ALL',
        searchTerm: '',
        isInitialized: false
    },

    /**
     * Initialize notification subsystem on page load
     */
    async init() {
        // Only run for authenticated users
        if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
            return;
        }

        this.injectHistoryModalIfMissing();
        this.bindEvents();

        // Initial fetch from MySQL database
        await this.loadNotifications();

        // Polling interval every 25 seconds for fresh notifications
        setInterval(() => {
            this.fetchUnreadCount();
        }, 25000);

        this.state.isInitialized = true;
    },

    /**
     * Bind UI event listeners
     */
    bindEvents() {
        // Dropdown triggers
        document.querySelectorAll('.notif-dropdown-toggle, #topNotifBellBtn').forEach(btn => {
            btn.addEventListener('show.bs.dropdown', () => {
                this.loadNotifications();
            });
        });
    },

    /**
     * Load notifications from real backend API
     */
    async loadNotifications() {
        try {
            const data = await NotificationService.getAll();
            this.state.notifications = Array.isArray(data) ? data : [];
            this.updateUnreadCount();
            this.renderDropdown();
            this.renderHistoryModal();
        } catch (err) {
            console.warn('[NotificationManager] Failed to load notifications:', err.message);
        }
    },

    /**
     * Fetch latest unread count from API
     */
    async fetchUnreadCount() {
        try {
            const res = await NotificationService.getUnreadCount();
            this.state.unreadCount = res && res.unreadCount !== undefined ? res.unreadCount : 0;
            this.updateBadgeUI();
        } catch (err) {
            // Quiet fail during background poll
        }
    },

    /**
     * Calculate and update unread count badges across all navigation elements
     */
    updateUnreadCount() {
        this.state.unreadCount = this.state.notifications.filter(n => !n.isRead).length;
        this.updateBadgeUI();
    },

    updateBadgeUI() {
        const count = this.state.unreadCount;
        const badges = document.querySelectorAll('#topNotifBadge, .notif-badge, #modalUnreadBadge');

        badges.forEach(badge => {
            if (badge) {
                badge.textContent = count;
                if (count > 0) {
                    badge.classList.remove('d-none');
                } else {
                    badge.classList.add('d-none');
                }
            }
        });

        const unreadPills = document.querySelectorAll('#dropdownUnreadPill');
        unreadPills.forEach(pill => {
            if (pill) {
                pill.textContent = count > 0 ? `${count} New` : '0 New';
            }
        });
    },

    /**
     * Render the Top Navbar Notification Dropdown
     */
    renderDropdown() {
        const container = document.getElementById('topNotifDropdownList');
        if (!container) return;

        const notifications = this.state.notifications.slice(0, 6); // Top 6 most recent

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 px-3 text-muted">
                    <i class="bi bi-bell-slash fs-3 d-block mb-2 text-secondary opacity-50"></i>
                    <div class="fw-semibold small text-dark">No Notifications Yet</div>
                    <div style="font-size: 0.75rem;">You will receive in-app alerts whenever administrators or municipal officers update your complaint statuses.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => {
            const timeAgo = this.formatTimeAgo(n.createdAt);
            const statusClass = n.newStatus ? `status-${n.newStatus.toUpperCase()}` : 'status-SUBMITTED';
            const statusLabel = n.newStatus ? n.newStatus.replace(/_/g, ' ') : 'UPDATED';

            return `
                <div class="notif-item ${!n.isRead ? 'unread' : ''}" onclick="NotificationManager.handleNotificationClick(${n.id}, '${this.escapeHtml(n.complaintNumber)}')">
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                        <div class="d-flex align-items-center gap-1 flex-wrap">
                            <span class="tracking-pill" style="font-size: 0.72rem; padding: 2px 6px;">#${this.escapeHtml(n.complaintNumber || 'GRV')}</span>
                            <span class="status-badge ${statusClass}" style="font-size: 0.68rem; padding: 2px 6px;">${statusLabel}</span>
                        </div>
                        <div class="d-flex align-items-center gap-1">
                            ${!n.isRead ? '<span class="notif-unread-dot" title="Unread"></span>' : ''}
                            <button type="button" class="btn btn-link p-0 text-muted btn-sm" title="${n.isRead ? 'Already read' : 'Mark as read'}" 
                                onclick="NotificationManager.markSingleAsRead(${n.id}, event)" style="font-size: 0.75rem;">
                                <i class="bi ${n.isRead ? 'bi-check-all text-primary' : 'bi-check-circle'}"></i>
                            </button>
                        </div>
                    </div>

                    <div class="fw-bold text-dark small mb-1" style="font-size: 0.82rem; line-height: 1.3;">
                        ${this.escapeHtml(n.title)}
                    </div>
                    <div class="text-secondary small mb-1" style="font-size: 0.75rem; line-height: 1.35;">
                        ${this.escapeHtml(n.message)}
                    </div>

                    ${n.adminRemarks ? `
                        <div class="notif-remarks-box">
                            <i class="bi bi-chat-left-quote-fill text-primary me-1"></i>
                            <strong>Remarks:</strong> ${this.escapeHtml(n.adminRemarks)}
                        </div>
                    ` : ''}

                    <div class="text-muted d-flex align-items-center gap-1 mt-2" style="font-size: 0.7rem;">
                        <i class="bi bi-clock"></i>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render the Full Notification History Modal
     */
    renderHistoryModal() {
        const listContainer = document.getElementById('historyModalNotifList');
        if (!listContainer) return;

        let items = [...this.state.notifications];

        // Apply Tab Filter
        if (this.state.filterTab === 'UNREAD') {
            items = items.filter(n => !n.isRead);
        } else if (this.state.filterTab === 'RESOLVED') {
            items = items.filter(n => n.newStatus === 'RESOLVED');
        }

        // Apply Search Term
        if (this.state.searchTerm) {
            const term = this.state.searchTerm.toLowerCase();
            items = items.filter(n => 
                (n.complaintNumber && n.complaintNumber.toLowerCase().includes(term)) ||
                (n.title && n.title.toLowerCase().includes(term)) ||
                (n.message && n.message.toLowerCase().includes(term)) ||
                (n.adminRemarks && n.adminRemarks.toLowerCase().includes(term))
            );
        }

        if (items.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-3 opacity-50"></i>
                    <h6 class="fw-bold text-dark">No Notifications Found</h6>
                    <p class="small mb-0">No notification records match your selected filter criteria.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = items.map(n => {
            const timeAgo = this.formatTimeAgo(n.createdAt);
            const fullDate = n.createdAt ? new Date(n.createdAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }) : 'Recent';
            const statusClass = n.newStatus ? `status-${n.newStatus.toUpperCase()}` : 'status-SUBMITTED';

            return `
                <div class="card border rounded-3 p-3 mb-2 shadow-sm ${!n.isRead ? 'border-primary-subtle bg-primary-subtle bg-opacity-10' : 'bg-white'}">
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div class="d-flex align-items-center gap-2">
                            <a href="grievance-details.html?track=${encodeURIComponent(n.complaintNumber || '')}" class="text-decoration-none">
                                <span class="tracking-pill">#${this.escapeHtml(n.complaintNumber || 'GRV')}</span>
                            </a>
                            <span class="status-badge ${statusClass}">
                                ${n.previousStatus ? `${n.previousStatus.replace(/_/g, ' ')} &rarr; ` : ''}${n.newStatus ? n.newStatus.replace(/_/g, ' ') : 'UPDATED'}
                            </span>
                            ${!n.isRead ? '<span class="badge bg-danger rounded-pill" style="font-size: 0.65rem;">UNREAD</span>' : ''}
                        </div>

                        <div class="d-flex align-items-center gap-2">
                            <small class="text-muted" title="${fullDate}">
                                <i class="bi bi-clock me-1"></i>${timeAgo}
                            </small>
                            ${!n.isRead ? `
                                <button type="button" class="btn btn-outline-primary btn-sm py-0 px-2" style="font-size: 0.75rem;" 
                                    onclick="NotificationManager.markSingleAsRead(${n.id}, event)">
                                    <i class="bi bi-check2 me-1"></i> Mark as Read
                                </button>
                            ` : `
                                <span class="badge bg-light text-secondary border small"><i class="bi bi-check2-all text-primary me-1"></i>Read</span>
                            `}
                        </div>
                    </div>

                    <h6 class="fw-bold text-navy mb-1">${this.escapeHtml(n.title)}</h6>
                    <p class="text-secondary small mb-2" style="line-height: 1.5;">${this.escapeHtml(n.message)}</p>

                    ${n.adminRemarks ? `
                        <div class="notif-remarks-box">
                            <div class="fw-bold text-navy mb-1"><i class="bi bi-chat-left-quote-fill text-primary me-1"></i> Official Administrator Remarks:</div>
                            <div>${this.escapeHtml(n.adminRemarks)}</div>
                        </div>
                    ` : ''}

                    <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top small">
                        <span class="text-muted" style="font-size: 0.72rem;">Timestamp: <strong>${fullDate}</strong></span>
                        <a href="grievance-details.html?track=${encodeURIComponent(n.complaintNumber || '')}" class="text-primary text-decoration-none fw-semibold">
                            Track Complaint Progress &rarr;
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Mark a single notification as read
     */
    async markSingleAsRead(id, event) {
        if (event) {
            event.stopPropagation();
        }

        try {
            await NotificationService.markAsRead(id);
            const found = this.state.notifications.find(n => n.id === id);
            if (found) {
                found.isRead = true;
                found.readAt = new Date().toISOString();
            }
            this.updateUnreadCount();
            this.renderDropdown();
            this.renderHistoryModal();
        } catch (err) {
            console.error('[NotificationManager] Failed to mark as read:', err);
        }
    },

    /**
     * Mark all notifications as read for citizen
     */
    async markAllAsRead() {
        try {
            await NotificationService.markAllAsRead();
            this.state.notifications.forEach(n => {
                n.isRead = true;
                n.readAt = new Date().toISOString();
            });
            this.updateUnreadCount();
            this.renderDropdown();
            this.renderHistoryModal();
        } catch (err) {
            console.error('[NotificationManager] Failed to mark all as read:', err);
        }
    },

    /**
     * Handle click on dropdown notification item
     */
    async handleNotificationClick(id, complaintNumber) {
        await this.markSingleAsRead(id);
        if (complaintNumber) {
            window.location.href = `grievance-details.html?track=${encodeURIComponent(complaintNumber)}`;
        }
    },

    /**
     * Set history modal filter tab (ALL, UNREAD, RESOLVED)
     */
    setFilterTab(tab) {
        this.state.filterTab = tab;

        document.querySelectorAll('#historyModalTabs button').forEach(btn => {
            if (btn.getAttribute('data-tab') === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.renderHistoryModal();
    },

    /**
     * Filter history modal by search keyword
     */
    filterHistoryBySearch(query) {
        this.state.searchTerm = (query || '').trim();
        this.renderHistoryModal();
    },

    /**
     * Open the dedicated Notification History Modal
     */
    openHistoryModal() {
        this.loadNotifications();
        const modalEl = document.getElementById('notificationHistoryModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    },

    /**
     * Format ISO timestamp to relative time (e.g. "12m ago", "3h ago")
     */
    formatTimeAgo(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const diffSeconds = Math.floor((now - date) / 1000);

        if (diffSeconds < 60) return 'Just now';
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
        if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    /**
     * Safely escape HTML strings
     */
    escapeHtml(text) {
        if (!text) return '';
        return text.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    /**
     * Ensure the Notification History Modal exists in the document DOM
     */
    injectHistoryModalIfMissing() {
        if (document.getElementById('notificationHistoryModal')) return;

        const modalHtml = `
            <div class="modal fade" id="notificationHistoryModal" tabindex="-1" aria-labelledby="notificationHistoryModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow-lg rounded-4">
                        <div class="modal-header bg-navy text-white px-4 py-3">
                            <div class="d-flex align-items-center gap-2">
                                <div class="admin-emblem-badge" style="width: 32px; height: 32px; font-size: 1rem; background: #2563EB;">
                                    <i class="bi bi-bell-fill"></i>
                                </div>
                                <div>
                                    <h5 class="modal-title fw-bold mb-0" id="notificationHistoryModalLabel">
                                        Notification Center & Status History
                                    </h5>
                                    <small class="text-white-50">Audit log of all municipal updates for your registered complaints</small>
                                </div>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>

                        <div class="modal-body p-4 bg-light">
                            <!-- Filter & Search Toolbar -->
                            <div class="card border-0 shadow-sm rounded-3 p-3 mb-3 bg-white">
                                <div class="row g-2 align-items-center justify-content-between">
                                    <div class="col-md-6">
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text bg-light border-end-0">
                                                <i class="bi bi-search text-muted"></i>
                                            </span>
                                            <input type="text" class="form-control border-start-0 ps-0" 
                                                placeholder="Search by Complaint ID or keyword..."
                                                oninput="NotificationManager.filterHistoryBySearch(this.value)">
                                        </div>
                                    </div>
                                    <div class="col-md-6 text-md-end">
                                        <button class="btn btn-outline-primary btn-sm" onclick="NotificationManager.markAllAsRead()">
                                            <i class="bi bi-check-all me-1"></i> Mark All as Read
                                        </button>
                                    </div>
                                </div>

                                <!-- Filter Tabs -->
                                <ul class="nav nav-pills nav-fill mt-3 border-top pt-2 small" id="historyModalTabs">
                                    <li class="nav-item">
                                        <button class="nav-link active py-1 px-3" data-tab="ALL" onclick="NotificationManager.setFilterTab('ALL')">
                                            All Updates
                                        </button>
                                    </li>
                                    <li class="nav-item">
                                        <button class="nav-link py-1 px-3" data-tab="UNREAD" onclick="NotificationManager.setFilterTab('UNREAD')">
                                            Unread Only
                                        </button>
                                    </li>
                                    <li class="nav-item">
                                        <button class="nav-link py-1 px-3" data-tab="RESOLVED" onclick="NotificationManager.setFilterTab('RESOLVED')">
                                            Resolved Complaints
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <!-- List of Notifications -->
                            <div id="historyModalNotifList">
                                <!-- Populated dynamically -->
                            </div>
                        </div>

                        <div class="modal-footer bg-white px-4 py-3 justify-content-between">
                            <span class="small text-muted">
                                <i class="bi bi-shield-check text-success me-1"></i> CivicTrack Municipal Notification Service &bull; Live MySQL Stream
                            </span>
                            <button type="button" class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NotificationManager.init();
});

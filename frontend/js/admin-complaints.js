/**
 * CivicTrack - Admin Complaint Management JavaScript
 * Full-featured controller for searching, filtering, inspecting, assigning,
 * updating status, viewing photos, viewing GPS coordinates, and tracking history.
 */

const AdminComplaints = {
    // State
    state: {
        complaints: [],
        filteredComplaints: [],
        departments: [],
        categories: [],
        currentPage: 1,
        pageSize: 10,
        searchTerm: '',
        categoryFilter: 'ALL',
        statusFilter: 'ALL',
        departmentFilter: 'ALL',
        sortBy: 'NEWEST',
        selectedComplaint: null,
        pendingConfirmAction: null
    },

    // Supported Statuses
    STATUSES: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],

    /**
     * Initialize Admin Complaint Management Page
     */
    async init() {
        // Enforce admin security check
        if (typeof Auth !== 'undefined' && !Auth.requireAuth('ROLE_ADMIN')) {
            return;
        }

        // Set admin name in header
        const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        if (user) {
            const navName = document.getElementById('adminNavName');
            if (navName) navName.textContent = user.fullName || 'System Administrator';
        }

        // Parse URL query params (e.g. ?status=PENDING or ?category=Road)
        this.parseUrlParams();

        // Bind event listeners
        this.bindEvents();

        // Load data
        await this.loadDepartments();
        await this.loadComplaints();
    },

    /**
     * Read URL parameters for deep linking
     */
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const statusParam = urlParams.get('status');
        const categoryParam = urlParams.get('category');
        const searchParam = urlParams.get('search');

        if (statusParam) {
            if (statusParam.toUpperCase() === 'PENDING') {
                this.state.statusFilter = 'SUBMITTED';
            } else if (this.STATUSES.includes(statusParam.toUpperCase())) {
                this.state.statusFilter = statusParam.toUpperCase();
            }
            const statusSelect = document.getElementById('filterStatusSelect');
            if (statusSelect) statusSelect.value = this.state.statusFilter;
        }

        if (categoryParam) {
            this.state.categoryFilter = categoryParam;
            const catSelect = document.getElementById('filterCategorySelect');
            if (catSelect) catSelect.value = categoryParam;
        }

        if (searchParam) {
            this.state.searchTerm = searchParam;
            const searchInput = document.getElementById('searchComplaintInput');
            if (searchInput) searchInput.value = searchParam;
        }
    },

    /**
     * Bind all search, filter, and pagination event listeners
     */
    bindEvents() {
        // Real-time search
        const searchInput = document.getElementById('searchComplaintInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.searchTerm = e.target.value.trim().toLowerCase();
                this.state.currentPage = 1;
                this.applyFilters();
            });
        }

        // Category filter
        const categorySelect = document.getElementById('filterCategorySelect');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.state.categoryFilter = e.target.value;
                this.state.currentPage = 1;
                this.applyFilters();
            });
        }

        // Status filter
        const statusSelect = document.getElementById('filterStatusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.state.statusFilter = e.target.value;
                this.state.currentPage = 1;
                this.updateFilterPillsUI();
                this.applyFilters();
            });
        }

        // Department filter
        const deptSelect = document.getElementById('filterDepartmentSelect');
        if (deptSelect) {
            deptSelect.addEventListener('change', (e) => {
                this.state.departmentFilter = e.target.value;
                this.state.currentPage = 1;
                this.applyFilters();
            });
        }

        // Sort filter
        const sortSelect = document.getElementById('sortDateSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.state.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        // Page size selector
        const pageSizeSelect = document.getElementById('pageSizeSelect');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.state.pageSize = parseInt(e.target.value, 10);
                this.state.currentPage = 1;
                this.applyFilters();
            });
        }

        // Fix Leaflet tile loading when modal finishes opening
        const detailModalEl = document.getElementById('complaintDetailModal');
        if (detailModalEl) {
            detailModalEl.addEventListener('shown.bs.modal', () => {
                if (this.detailModalMap) {
                    this.detailModalMap.invalidateSize();
                }
            });
        }
    },

    /**
     * Load departments from API or fallback
     */
    async loadDepartments() {
        try {
            if (typeof GrievanceService !== 'undefined') {
                const depts = await GrievanceService.getDepartments();
                if (depts && depts.length > 0) {
                    this.state.departments = depts;
                }
            }
        } catch (e) {
            console.warn('[AdminComplaints] Department API offline, using fallback list');
        }

        if (!this.state.departments || this.state.departments.length === 0) {
            this.state.departments = [
                { id: 1, name: 'Public Works Department (PWD)', description: 'Roads, bridges, civil structures' },
                { id: 2, name: 'Water Supply & Sewerage Board', description: 'Drinking water, pipelines, drains' },
                { id: 3, name: 'Solid Waste Management', description: 'Garbage collection, landfill maintenance' },
                { id: 4, name: 'Electricity & Street Lighting', description: 'Power grid, streetlights, poles' },
                { id: 5, name: 'Health & Municipal Sanitation', description: 'Vector control, public hygiene' }
            ];
        }

        this.populateDepartmentDropdowns();
    },

    /**
     * Populate filter and modal department dropdowns
     */
    populateDepartmentDropdowns() {
        const filterSelect = document.getElementById('filterDepartmentSelect');
        const modalSelect = document.getElementById('assignDeptSelect');

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="ALL">All Departments</option>' +
                this.state.departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
        }

        if (modalSelect) {
            modalSelect.innerHTML = '<option value="">-- Choose Municipal Department --</option>' +
                this.state.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }
    },

    /**
     * Fetch grievances from backend API or load rich realistic fallback
     */
    async loadComplaints() {
        const tableBody = document.getElementById('adminComplaintsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="spinner-border text-primary me-2" role="status"></div>
                        <span class="text-muted fw-semibold">Loading municipal complaints records from database...</span>
                    </td>
                </tr>
            `;
        }

        try {
            const apiData = await GrievanceService.getAllGrievances();
            this.state.complaints = Array.isArray(apiData) ? apiData : [];
            this.applyFilters();
        } catch (err) {
            console.error('[AdminComplaints] Backend error loading complaints:', err);
            this.state.complaints = [];
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <div class="alert alert-danger d-inline-block border-0 shadow-sm text-start py-3 px-4 mb-0">
                                <div class="d-flex align-items-center gap-2 mb-2">
                                    <i class="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
                                    <strong class="fs-6">Cannot Load Complaints</strong>
                                </div>
                                <p class="small mb-3 text-secondary">
                                    ${this.escapeHtml(err.message || 'Cannot reach Spring Boot server on port 8080.')}
                                </p>
                                <button type="button" class="btn btn-sm btn-outline-danger" onclick="AdminComplaints.loadComplaints()">
                                    <i class="bi bi-arrow-clockwise me-1"></i> Retry Connection
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    },

    /**
     * Apply search query, filters, and sorting
     */
    applyFilters() {
        let result = [...this.state.complaints];

        // 1. Search Query
        if (this.state.searchTerm) {
            const q = this.state.searchTerm;
            result = result.filter(c => 
                (c.trackingNumber && c.trackingNumber.toLowerCase().includes(q)) ||
                (c.title && c.title.toLowerCase().includes(q)) ||
                (c.citizenName && c.citizenName.toLowerCase().includes(q)) ||
                (c.locationAddress && c.locationAddress.toLowerCase().includes(q)) ||
                (c.categoryName && c.categoryName.toLowerCase().includes(q)) ||
                (c.departmentName && c.departmentName.toLowerCase().includes(q))
            );
        }

        // 2. Category Filter
        if (this.state.categoryFilter !== 'ALL') {
            result = result.filter(c => c.categoryName === this.state.categoryFilter);
        }

        // 3. Status Filter
        if (this.state.statusFilter !== 'ALL') {
            result = result.filter(c => c.status === this.state.statusFilter);
        }

        // 4. Department Filter
        if (this.state.departmentFilter !== 'ALL') {
            result = result.filter(c => c.departmentName === this.state.departmentFilter);
        }

        // 5. Date Sort
        if (this.state.sortBy === 'NEWEST') {
            result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (this.state.sortBy === 'OLDEST') {
            result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (this.state.sortBy === 'PRIORITY') {
            const pMap = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            result.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
        }

        this.state.filteredComplaints = result;
        this.renderStatsBar();
        this.renderTable();
        this.renderPagination();
    },

    /**
     * Render quick status filter pills and counter metrics
     */
    renderStatsBar() {
        const counts = {
            ALL: this.state.complaints.length,
            SUBMITTED: 0,
            UNDER_REVIEW: 0,
            ASSIGNED: 0,
            IN_PROGRESS: 0,
            RESOLVED: 0,
            REJECTED: 0
        };

        this.state.complaints.forEach(c => {
            if (counts[c.status] !== undefined) {
                counts[c.status]++;
            }
        });

        // Update Pill Counts
        const countAll = document.getElementById('countPillAll');
        const countSub = document.getElementById('countPillSubmitted');
        const countRev = document.getElementById('countPillUnderReview');
        const countAss = document.getElementById('countPillAssigned');
        const countPrg = document.getElementById('countPillInProgress');
        const countRes = document.getElementById('countPillResolved');
        const countRej = document.getElementById('countPillRejected');

        if (countAll) countAll.textContent = counts.ALL;
        if (countSub) countSub.textContent = counts.SUBMITTED;
        if (countRev) countRev.textContent = counts.UNDER_REVIEW;
        if (countAss) countAss.textContent = counts.ASSIGNED;
        if (countPrg) countPrg.textContent = counts.IN_PROGRESS;
        if (countRes) countRes.textContent = counts.RESOLVED;
        if (countRej) countRej.textContent = counts.REJECTED;

        // Active results count
        const activeCount = document.getElementById('activeResultsCount');
        if (activeCount) {
            activeCount.textContent = `Showing ${this.state.filteredComplaints.length} of ${this.state.complaints.length} records`;
        }
    },

    /**
     * Update active class on filter pills
     */
    updateFilterPillsUI() {
        document.querySelectorAll('.filter-pill-btn').forEach(btn => {
            const status = btn.getAttribute('data-status');
            if (status === this.state.statusFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    /**
     * Select a status filter pill
     */
    selectStatusPill(status) {
        this.state.statusFilter = status;
        this.state.currentPage = 1;

        const statusSelect = document.getElementById('filterStatusSelect');
        if (statusSelect) statusSelect.value = status;

        this.updateFilterPillsUI();
        this.applyFilters();
    },

    /**
     * Render Complaints Table with 7 specified columns:
     * Complaint ID | Citizen Name | Category | Location | Submitted Date | Status | Action
     */
    renderTable() {
        const tableBody = document.getElementById('adminComplaintsTableBody');
        if (!tableBody) return;

        if (this.state.filteredComplaints.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="empty-state p-4">
                            <i class="bi bi-inbox text-muted fs-1 mb-3 d-block"></i>
                            <h5 class="fw-bold text-navy">No Complaints Found</h5>
                            <p class="text-muted small mb-3">No grievance records match your current search and filter criteria.</p>
                            <button class="btn btn-outline-primary btn-sm px-3" onclick="AdminComplaints.resetFilters()">
                                <i class="bi bi-arrow-counterclockwise me-1"></i> Reset All Filters
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Pagination slice
        const start = (this.state.currentPage - 1) * this.state.pageSize;
        const pageItems = this.state.filteredComplaints.slice(start, start + this.state.pageSize);

        tableBody.innerHTML = pageItems.map(c => {
            const dateObj = new Date(c.createdAt);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const initials = c.citizenName ? c.citizenName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C';

            // Category Icons
            const catIcons = {
                'Road Damage': 'bi-cone-striped text-warning',
                'Garbage Collection': 'bi-trash-fill text-danger',
                'Water Supply': 'bi-droplet-half text-primary',
                'Streetlight Issues': 'bi-lightbulb-fill text-warning',
                'Drainage Problems': 'bi-water text-info',
                'Public Infrastructure': 'bi-buildings-fill text-secondary',
                'Other': 'bi-tag-fill text-secondary'
            };
            const catIcon = catIcons[c.categoryName] || 'bi-exclamation-circle text-primary';

            return `
                <tr>
                    <!-- 1. Complaint ID -->
                    <td>
                        <a href="javascript:void(0)" class="fw-bold text-primary text-decoration-none d-flex align-items-center gap-1" onclick="AdminComplaints.openDetailsModal(${c.id})">
                            <span class="tracking-code-pill">${c.trackingNumber}</span>
                        </a>
                        <div class="mt-1">
                            <span class="badge priority-badge priority-${c.priority || 'MEDIUM'}">${c.priority || 'MEDIUM'}</span>
                        </div>
                    </td>

                    <!-- 2. Citizen Name -->
                    <td>
                        <div class="table-citizen-cell">
                            <div class="table-citizen-avatar">${initials}</div>
                            <div>
                                <div class="fw-bold text-navy small mb-0">${this.escapeHtml(c.citizenName || 'Citizen')}</div>
                                <div class="text-primary font-monospace fw-semibold" style="font-size: 0.72rem;">
                                    <i class="bi bi-person-badge me-1"></i>${this.escapeHtml(c.residentAccountNumber || c.citizenAccountNumber || ('CT-RES-' + String(c.userId || '').padStart(5, '0')))}
                                </div>
                                <small class="text-muted d-block" style="font-size: 0.75rem;">
                                    <i class="bi bi-telephone me-1"></i>${c.citizenPhone || 'N/A'}
                                </small>
                            </div>
                        </div>
                    </td>

                    <!-- 3. Category -->
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi ${catIcon} fs-6"></i>
                            <div>
                                <div class="fw-semibold small text-dark">${this.escapeHtml(c.categoryName || 'General')}</div>
                                <small class="text-muted d-block" style="font-size: 0.72rem;">
                                    ${this.escapeHtml(c.departmentName || 'Unassigned')}
                                </small>
                            </div>
                        </div>
                    </td>

                    <!-- 4. Location -->
                    <td>
                        <div class="d-flex align-items-start gap-1" style="max-width: 200px;">
                            <i class="bi bi-geo-alt-fill text-danger mt-1" style="font-size: 0.85rem;"></i>
                            <div>
                                <span class="small text-dark text-truncate d-block" title="${this.escapeHtml(c.locationAddress)}">
                                    ${this.escapeHtml(c.locationAddress)}
                                </span>
                                ${c.latitude && c.longitude ? `
                                    <small class="text-primary text-decoration-none cursor-pointer" onclick="AdminComplaints.openLocationMap(${c.latitude}, ${c.longitude}, '${this.escapeHtml(c.locationAddress)}')">
                                        <i class="bi bi-map me-1"></i>Map Pin
                                    </small>
                                ` : ''}
                            </div>
                        </div>
                    </td>

                    <!-- 5. Submitted Date -->
                    <td>
                        <div class="small fw-semibold text-dark">${formattedDate}</div>
                        <small class="text-muted" style="font-size: 0.75rem;">${formattedTime}</small>
                    </td>

                    <!-- 6. Status -->
                    <td>
                        <span class="status-badge status-${c.status}">
                            ${this.formatStatus(c.status)}
                        </span>
                    </td>

                    <!-- 7. Action -->
                    <td>
                        <div class="d-flex align-items-center gap-1">
                            <!-- Quick View Details -->
                            <button class="btn btn-sm btn-light border text-navy" title="View Complaint Details" onclick="AdminComplaints.openDetailsModal(${c.id})">
                                <i class="bi bi-eye"></i>
                            </button>
                            
                            <!-- Assign Department -->
                            <button class="btn btn-sm btn-light border text-primary" title="Assign Department" onclick="AdminComplaints.openAssignModal(${c.id})">
                                <i class="bi bi-building"></i>
                            </button>

                            <!-- Update Status -->
                            <button class="btn btn-sm btn-light border text-success" title="Update Status" onclick="AdminComplaints.openStatusModal(${c.id})">
                                <i class="bi bi-arrow-repeat"></i>
                            </button>

                            <!-- More Dropdown -->
                            <div class="dropdown">
                                <button class="btn btn-sm btn-light border dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                    <li>
                                        <a class="dropdown-item small" href="javascript:void(0)" onclick="AdminComplaints.openDetailsModal(${c.id})">
                                            <i class="bi bi-info-circle me-2 text-primary"></i> Full Inspection
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item small" href="javascript:void(0)" onclick="AdminComplaints.openHistoryModal(${c.id})">
                                            <i class="bi bi-clock-history me-2 text-info"></i> Transition History
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item small" href="javascript:void(0)" onclick="AdminComplaints.openAssignModal(${c.id})">
                                            <i class="bi bi-building-gear me-2 text-warning"></i> Reassign Department
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item small" href="javascript:void(0)" onclick="AdminComplaints.openStatusModal(${c.id})">
                                            <i class="bi bi-pencil-square me-2 text-success"></i> Change Status
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Render Pagination controls
     */
    renderPagination() {
        const container = document.getElementById('adminPaginationContainer');
        if (!container) return;

        const totalItems = this.state.filteredComplaints.length;
        const totalPages = Math.ceil(totalItems / this.state.pageSize) || 1;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagesHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.state.currentPage - 1 && i <= this.state.currentPage + 1)) {
                pagesHtml += `
                    <li class="page-item ${i === this.state.currentPage ? 'active' : ''}">
                        <button class="page-link" onclick="AdminComplaints.goToPage(${i})">${i}</button>
                    </li>
                `;
            } else if (i === this.state.currentPage - 2 || i === this.state.currentPage + 2) {
                pagesHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        container.innerHTML = `
            <nav aria-label="Complaints Pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${this.state.currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" onclick="AdminComplaints.goToPage(${this.state.currentPage - 1})" aria-label="Previous">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                    </li>
                    ${pagesHtml}
                    <li class="page-item ${this.state.currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" onclick="AdminComplaints.goToPage(${this.state.currentPage + 1})" aria-label="Next">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </li>
                </ul>
            </nav>
        `;
    },

    /**
     * Change current pagination page
     */
    goToPage(pageNum) {
        const totalPages = Math.ceil(this.state.filteredComplaints.length / this.state.pageSize) || 1;
        if (pageNum < 1 || pageNum > totalPages) return;
        this.state.currentPage = pageNum;
        this.renderTable();
        this.renderPagination();
        window.scrollTo({ top: 200, behavior: 'smooth' });
    },

    /**
     * Reset all filters to default
     */
    resetFilters() {
        this.state.searchTerm = '';
        this.state.categoryFilter = 'ALL';
        this.state.statusFilter = 'ALL';
        this.state.departmentFilter = 'ALL';
        this.state.sortBy = 'NEWEST';
        this.state.currentPage = 1;

        const searchInput = document.getElementById('searchComplaintInput');
        const catSelect = document.getElementById('filterCategorySelect');
        const statusSelect = document.getElementById('filterStatusSelect');
        const deptSelect = document.getElementById('filterDepartmentSelect');
        const sortSelect = document.getElementById('sortDateSelect');

        if (searchInput) searchInput.value = '';
        if (catSelect) catSelect.value = 'ALL';
        if (statusSelect) statusSelect.value = 'ALL';
        if (deptSelect) deptSelect.value = 'ALL';
        if (sortSelect) sortSelect.value = 'NEWEST';

        this.updateFilterPillsUI();
        this.applyFilters();
    },

    /**
     * 1. Open Detailed Complaint Inspection Modal
     */
    openDetailsModal(id) {
        const complaint = this.state.complaints.find(c => c.id === id);
        if (!complaint) return;

        this.state.selectedComplaint = complaint;

        // Populate Modal Fields
        document.getElementById('modalDetailTracking').textContent = complaint.trackingNumber;
        document.getElementById('modalDetailTitle').textContent = complaint.title;
        document.getElementById('modalDetailCategory').textContent = complaint.categoryName;
        document.getElementById('modalDetailDepartment').textContent = complaint.departmentName;
        document.getElementById('modalDetailAddress').textContent = complaint.locationAddress;
        document.getElementById('modalDetailDescription').textContent = complaint.description;

        // Citizen Details
        document.getElementById('modalDetailCitizenName').textContent = complaint.citizenName || 'Registered Citizen';
        const resAccNo = complaint.residentAccountNumber || complaint.citizenAccountNumber || ('CT-RES-' + String(complaint.userId || '').padStart(5, '0'));
        const accEl = document.getElementById('modalDetailCitizenAccount');
        if (accEl) accEl.textContent = resAccNo;
        document.getElementById('modalDetailCitizenPhone').textContent = complaint.citizenPhone || 'N/A';
        document.getElementById('modalDetailCitizenEmail').textContent = complaint.citizenEmail || 'citizen@civictrack.com';
        document.getElementById('modalDetailCitizenAddress').textContent = complaint.citizenAddress || complaint.locationAddress || 'N/A';

        // Date and Badges
        const dateObj = new Date(complaint.createdAt);
        document.getElementById('modalDetailDate').textContent = dateObj.toLocaleString('en-US', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Priority Badge
        const priorityContainer = document.getElementById('modalDetailPriorityBadge');
        if (priorityContainer) {
            priorityContainer.className = `badge priority-badge priority-${complaint.priority || 'MEDIUM'} me-2`;
            priorityContainer.textContent = complaint.priority || 'MEDIUM';
        }

        // Status Badge
        const statusContainer = document.getElementById('modalDetailStatusBadge');
        if (statusContainer) {
            statusContainer.className = `status-badge status-${complaint.status}`;
            statusContainer.textContent = this.formatStatus(complaint.status);
        }

        // Resolution Notes
        const notesContainer = document.getElementById('modalDetailResolutionNotesBox');
        const notesText = document.getElementById('modalDetailResolutionNotes');
        if (complaint.resolutionNotes) {
            notesContainer.classList.remove('d-none');
            notesText.textContent = complaint.resolutionNotes;
        } else {
            notesContainer.classList.add('d-none');
        }

        // Photographs Gallery
        this.renderModalPhotos(complaint);

        // Location & Map Preview
        this.renderModalLocation(complaint);

        // Show Modal
        const modalEl = document.getElementById('complaintDetailModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Render photographs in details modal
     */
    renderModalPhotos(complaint) {
        const photoGrid = document.getElementById('modalDetailPhotoGrid');
        if (!photoGrid) return;

        const photos = (complaint.attachments && complaint.attachments.length > 0)
            ? complaint.attachments.map(a => a.fileUrl || a)
            : (complaint.photoUrls || [
                'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=800&q=80'
            ]);

        photoGrid.innerHTML = photos.map((url, idx) => `
            <div class="complaint-photo-thumb" onclick="AdminComplaints.openPhotoLightbox('${url}', 'Photograph ${idx + 1} - ${this.escapeHtml(complaint.trackingNumber)}')">
                <img src="${url}" alt="Complaint photograph proof" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'">
                <div class="photo-overlay-zoom">
                    <i class="bi bi-zoom-in"></i>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render location details and interactive map links
     */
    renderModalLocation(complaint) {
        const lat = parseFloat(complaint.latitude) || 19.0760;
        const lng = parseFloat(complaint.longitude) || 72.8777;

        document.getElementById('modalDetailCoords').textContent = `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        const mapBtn = document.getElementById('modalOpenMapBtn');
        if (mapBtn) {
            mapBtn.onclick = () => {
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                window.open(mapUrl, '_blank');
            };
        }

        // Initialize or update Leaflet OpenStreetMap in modal
        const mapContainer = document.getElementById('modalDetailMap');
        if (mapContainer && typeof L !== 'undefined') {
            const statusColors = {
                'SUBMITTED': '#F59E0B',
                'UNDER_REVIEW': '#6366F1',
                'ASSIGNED': '#8B5CF6',
                'IN_PROGRESS': '#2563EB',
                'RESOLVED': '#10B981',
                'REJECTED': '#EF4444'
            };
            const markerColor = statusColors[complaint.status] || '#2563EB';

            const customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `
                    <div style="
                        background-color: ${markerColor};
                        width: 30px;
                        height: 30px;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                        border: 2px solid #ffffff;
                    ">
                        <i class="bi bi-geo-alt-fill" style="transform: rotate(45deg); color: #ffffff; font-size: 14px;"></i>
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });

            if (!this.detailModalMap) {
                this.detailModalMap = L.map('modalDetailMap', {
                    zoomControl: true,
                    scrollWheelZoom: true,
                    touchZoom: true,
                    dragging: true,
                    inertia: true,
                    minZoom: 6,
                    maxZoom: 19
                }).setView([lat, lng], 15);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    minZoom: 6,
                    maxZoom: 19,
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
                }).addTo(this.detailModalMap);

                this.detailModalMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.detailModalMap);
            } else {
                this.detailModalMap.flyTo([lat, lng], 15, { animate: true, duration: 0.6 });
                if (this.detailModalMarker) {
                    this.detailModalMarker.setLatLng([lat, lng]);
                    this.detailModalMarker.setIcon(customIcon);
                } else {
                    this.detailModalMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.detailModalMap);
                }
            }

            const popupContent = `
                <div class="p-1">
                    <strong class="d-block text-navy">${this.escapeHtml(complaint.trackingNumber || '')}</strong>
                    <div class="small text-secondary mb-1">${this.escapeHtml(complaint.title || '')}</div>
                    <span class="badge" style="background-color: ${markerColor}; color: #fff;">${complaint.status || 'SUBMITTED'}</span>
                </div>
            `;
            this.detailModalMarker.bindPopup(popupContent);

            setTimeout(() => {
                if (this.detailModalMap) {
                    this.detailModalMap.invalidateSize();
                }
            }, 350);
        }
    },

    /**
     * 2. Open Department Assignment Modal
     */
    openAssignModal(id) {
        const complaint = this.state.complaints.find(c => c.id === id);
        if (!complaint) return;

        this.state.selectedComplaint = complaint;

        document.getElementById('assignModalTracking').textContent = complaint.trackingNumber;
        document.getElementById('assignModalCurrentDept').textContent = complaint.departmentName || 'Not Assigned';
        document.getElementById('assignModalRemarks').value = '';

        // Select current department if matched
        const deptSelect = document.getElementById('assignDeptSelect');
        if (deptSelect) {
            const foundDept = this.state.departments.find(d => d.name === complaint.departmentName);
            deptSelect.value = foundDept ? foundDept.id : '';
        }

        const modalEl = document.getElementById('assignDepartmentModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Trigger Department Assignment with Confirmation Dialog
     */
    triggerDepartmentAssignment() {
        const deptSelect = document.getElementById('assignDeptSelect');
        const remarks = document.getElementById('assignModalRemarks').value.trim();
        const deptId = deptSelect.value;

        if (!deptId) {
            this.showToast('Please select a municipal department to assign.', 'warning');
            deptSelect.focus();
            return;
        }

        const selectedDept = this.state.departments.find(d => d.id == deptId);
        const deptName = selectedDept ? selectedDept.name : 'Selected Department';

        this.showConfirmDialog(
            'Confirm Department Assignment',
            `Are you sure you want to reassign complaint <strong>${this.state.selectedComplaint.trackingNumber}</strong> to <strong>${this.escapeHtml(deptName)}</strong>?`,
            'btn-primary',
            async () => {
                await this.executeDepartmentAssignment(this.state.selectedComplaint.id, parseInt(deptId, 10), deptName, remarks);
            }
        );
    },

    /**
     * Execute department assignment on backend API
     */
    async executeDepartmentAssignment(id, deptId, deptName, remarks) {
        try {
            await GrievanceService.assignDepartment(id, deptId, remarks, deptName);

            // Hide assignment modal
            const assignModalEl = document.getElementById('assignDepartmentModal');
            const assignModal = bootstrap.Modal.getInstance(assignModalEl);
            if (assignModal) assignModal.hide();

            this.showToast(`Complaint successfully assigned to ${deptName}.`, 'success');

            // Refresh live complaints from backend
            await this.loadComplaints();

            // Refresh detail view if currently open
            if (this.state.selectedComplaint && this.state.selectedComplaint.id === id) {
                this.openDetailsModal(id);
            }
        } catch (e) {
            console.error('[AdminComplaints] Department assignment failed:', e);
            this.showToast(`Department assignment failed: ${e.message || 'Server error'}`, 'danger');
        }
    },

    /**
     * 3. Open Update Status Modal
     */
    openStatusModal(id) {
        const complaint = this.state.complaints.find(c => c.id === id);
        if (!complaint) return;

        this.state.selectedComplaint = complaint;

        document.getElementById('statusModalTracking').textContent = complaint.trackingNumber;
        document.getElementById('statusModalCurrentStatus').textContent = this.formatStatus(complaint.status);
        document.getElementById('statusModalRemarks').value = '';

        const statusSelect = document.getElementById('statusModalNewStatus');
        if (statusSelect) {
            statusSelect.value = complaint.status;
            this.onStatusSelectionChange(complaint.status);
        }

        const modalEl = document.getElementById('updateStatusModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Handle status change in update modal to show contextual guidance
     */
    onStatusSelectionChange(status) {
        const alertBox = document.getElementById('statusGuidanceAlert');
        const remarksLabel = document.getElementById('statusRemarksLabel');

        if (!alertBox || !remarksLabel) return;

        if (status === 'RESOLVED') {
            alertBox.className = 'alert alert-success d-flex align-items-center gap-2 py-2 small mb-3';
            alertBox.innerHTML = '<i class="bi bi-check-circle-fill"></i> Field resolution notes will be published to the citizen and recorded as closed.';
            remarksLabel.innerHTML = 'Resolution Notes / Field Action Summary <span class="text-danger">*</span>';
        } else if (status === 'REJECTED') {
            alertBox.className = 'alert alert-danger d-flex align-items-center gap-2 py-2 small mb-3';
            alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> A valid administrative justification is required when rejecting a citizen grievance.';
            remarksLabel.innerHTML = 'Official Rejection Reason <span class="text-danger">*</span>';
        } else if (status === 'IN_PROGRESS') {
            alertBox.className = 'alert alert-info d-flex align-items-center gap-2 py-2 small mb-3';
            alertBox.innerHTML = '<i class="bi bi-info-circle-fill"></i> Department crew dispatch status will notify the citizen.';
            remarksLabel.innerHTML = 'Work Order Notes / Internal Remarks';
        } else {
            alertBox.className = 'alert alert-secondary d-flex align-items-center gap-2 py-2 small mb-3';
            alertBox.innerHTML = '<i class="bi bi-info-circle"></i> Transitioning grievance status in municipal workflow.';
            remarksLabel.innerHTML = 'Admin Remarks';
        }
    },

    /**
     * Trigger Status Update with Confirmation Dialog
     */
    triggerStatusUpdate() {
        const newStatusSelect = document.getElementById('statusModalNewStatus');
        const remarksInput = document.getElementById('statusModalRemarks');
        const newStatus = newStatusSelect.value;
        const remarks = remarksInput.value.trim();

        // Validation: remarks required for REJECTED and RESOLVED
        if ((newStatus === 'REJECTED' || newStatus === 'RESOLVED') && !remarks) {
            this.showToast(`Please provide explanation remarks for ${newStatus} status.`, 'warning');
            remarksInput.focus();
            return;
        }

        const isRejection = newStatus === 'REJECTED';
        const confirmBtnClass = isRejection ? 'btn-danger' : 'btn-success';

        this.showConfirmDialog(
            `Confirm Status Change: ${this.formatStatus(newStatus)}`,
            `Are you sure you want to update status of <strong>${this.state.selectedComplaint.trackingNumber}</strong> to <strong>${this.formatStatus(newStatus)}</strong>?` +
            (isRejection ? '<br><span class="text-danger small fw-semibold"><i class="bi bi-exclamation-triangle"></i> This grievance will be marked as invalid/rejected.</span>' : ''),
            confirmBtnClass,
            async () => {
                await this.executeStatusUpdate(this.state.selectedComplaint.id, newStatus, remarks);
            }
        );
    },

    /**
     * Execute status update on backend API
     */
    async executeStatusUpdate(id, newStatus, remarks) {
        try {
            await GrievanceService.updateStatus(id, newStatus, remarks);

            // Hide update status modal
            const statusModalEl = document.getElementById('updateStatusModal');
            const statusModal = bootstrap.Modal.getInstance(statusModalEl);
            if (statusModal) statusModal.hide();

            this.showToast(`Complaint status updated to ${this.formatStatus(newStatus)}.`, 'success');

            // Refresh live complaints from backend
            await this.loadComplaints();

            // Refresh detail view if currently open
            if (this.state.selectedComplaint && this.state.selectedComplaint.id === id) {
                this.openDetailsModal(id);
            }
        } catch (e) {
            console.error('[AdminComplaints] Status update failed:', e);
            this.showToast(`Status update failed: ${e.message || 'Server error'}`, 'danger');
        }
    },

    /**
     * 4. Open Complaint History & Audit Trail Modal
     */
    async openHistoryModal(id) {
        const complaint = this.state.complaints.find(c => c.id === id);
        if (!complaint) return;

        document.getElementById('historyModalTracking').textContent = complaint.trackingNumber;
        const timelineContainer = document.getElementById('historyTimelineContainer');

        timelineContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                <span class="text-muted small">Loading grievance audit trail...</span>
            </div>
        `;

        const modalEl = document.getElementById('complaintHistoryModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();

        let logs = complaint.statusLogs || [];

        // Attempt API history retrieval if available
        try {
            if (typeof GrievanceService !== 'undefined' && GrievanceService.getGrievanceHistory) {
                const apiLogs = await GrievanceService.getGrievanceHistory(id);
                if (apiLogs && apiLogs.length > 0) {
                    logs = apiLogs;
                }
            }
        } catch (e) {
            console.warn('[AdminComplaints] Grievance history API offline, using local logs');
        }

        if (!logs || logs.length === 0) {
            // Synthesize initial submission log
            logs = [
                {
                    oldStatus: null,
                    newStatus: 'SUBMITTED',
                    changedByName: complaint.citizenName || 'Citizen',
                    remarks: 'Grievance ticket created via CivicTrack Portal',
                    createdAt: complaint.createdAt
                }
            ];
            if (complaint.status !== 'SUBMITTED') {
                logs.push({
                    oldStatus: 'SUBMITTED',
                    newStatus: complaint.status,
                    changedByName: 'Central Administration',
                    remarks: complaint.resolutionNotes || `Transitioned to ${complaint.status}`,
                    createdAt: complaint.updatedAt || complaint.createdAt
                });
            }
        }

        timelineContainer.innerHTML = `
            <div class="audit-timeline">
                ${logs.map((log, idx) => {
                    const dateObj = new Date(log.createdAt || complaint.createdAt);
                    const formatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                        ' at ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    const statusClass = log.newStatus ? log.newStatus.toLowerCase().replace('_', '-') : 'default';

                    return `
                        <div class="audit-item status-${statusClass}">
                            <div class="audit-dot">
                                <i class="bi bi-circle-fill"></i>
                            </div>
                            <div class="audit-card">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <div>
                                        <span class="status-badge status-${log.newStatus}">
                                            ${this.formatStatus(log.newStatus)}
                                        </span>
                                        ${log.oldStatus ? `
                                            <span class="text-muted small ms-1">
                                                from <del>${this.formatStatus(log.oldStatus)}</del>
                                            </span>
                                        ` : ''}
                                    </div>
                                    <small class="text-muted">${formatted}</small>
                                </div>
                                <div class="small text-dark mt-2 mb-1">
                                    <i class="bi bi-person-circle me-1 text-secondary"></i>
                                    <strong>${this.escapeHtml(log.changedByName || 'Administrative Officer')}</strong>
                                </div>
                                <p class="text-muted small mb-0 fst-italic">
                                    "${this.escapeHtml(log.remarks || 'No transition remarks recorded.')}"
                                </p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    /**
     * 5. Open Photo Lightbox Modal
     */
    openPhotoLightbox(photoUrl, caption) {
        const img = document.getElementById('lightboxImage');
        const cap = document.getElementById('lightboxCaption');
        if (img) img.src = photoUrl;
        if (cap) cap.textContent = caption || 'Complaint Photograph Proof';

        const modalEl = document.getElementById('photoLightboxModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Open Location in Google Maps directly
     */
    openLocationMap(lat, lng, address) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    },

    /**
     * 6. Reusable Confirmation Dialog
     */
    showConfirmDialog(title, message, confirmBtnClass = 'btn-primary', onConfirm = null) {
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalBody').innerHTML = message;

        const confirmBtn = document.getElementById('confirmModalActionBtn');
        confirmBtn.className = `btn ${confirmBtnClass}`;
        
        // Remove old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const modalEl = document.getElementById('actionConfirmModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });

        const modalEl = document.getElementById('actionConfirmModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Show Toast Notification
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('adminToastContainer');
        if (!container) return;

        const toastId = 'toast-' + Date.now();
        const icon = type === 'success' ? 'bi-check-circle-fill text-success' :
                     type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' :
                     type === 'danger' ? 'bi-x-circle-fill text-danger' : 'bi-info-circle-fill text-primary';

        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-bg-light border shadow-sm" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center gap-2 small">
                        <i class="bi ${icon} fs-5"></i>
                        <span class="fw-semibold text-navy">${message}</span>
                    </div>
                    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    },

    /**
     * Export Filtered Complaints to CSV
     */
    exportCSV() {
        if (this.state.filteredComplaints.length === 0) {
            this.showToast('No complaint records available to export.', 'warning');
            return;
        }

        const headers = ['Complaint ID', 'Citizen Name', 'Category', 'Department', 'Location', 'Priority', 'Status', 'Submitted Date'];
        const rows = this.state.filteredComplaints.map(c => [
            `"${c.trackingNumber}"`,
            `"${(c.citizenName || '').replace(/"/g, '""')}"`,
            `"${(c.categoryName || '').replace(/"/g, '""')}"`,
            `"${(c.departmentName || '').replace(/"/g, '""')}"`,
            `"${(c.locationAddress || '').replace(/"/g, '""')}"`,
            `"${c.priority || 'MEDIUM'}"`,
            `"${c.status}"`,
            `"${new Date(c.createdAt).toISOString()}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `CivicTrack_Complaints_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('Complaints spreadsheet successfully exported.', 'success');
    },

    /**
     * Format Status Enum String for UI
     */
    formatStatus(status) {
        if (!status) return 'Submitted';
        return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    },

    /**
     * Escape HTML string
     */
    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Realistic Mock Complaints for Preview & Offline Testing
     */
    getMockComplaints() {
        return [];
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AdminComplaints.init();
});

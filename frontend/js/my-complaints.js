/**
 * CivicTrack - My Complaints Logic
 * Real-time filtering, search by ID, category & status filtering, date sorting, and client-side pagination.
 * Fully connected to Spring Boot REST API (/complaints/my) with citizen isolation.
 */

let allComplaints = [];
let filteredComplaints = [];
let currentPage = 1;
let itemsPerPage = 5;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Enforce Citizen Authentication
    if (typeof Auth !== 'undefined') {
        if (!Auth.requireAuth('ROLE_CITIZEN')) {
            return;
        }
    }

    initUserSession();
    initFiltersAndControls();
    loadCitizenComplaints();
});

async function initUserSession() {
    let user = (typeof Auth !== 'undefined' && Auth.getCurrentUser()) || null;
    applyCitizenNav(user);

    if (typeof Auth !== 'undefined' && typeof Auth.refreshProfile === 'function') {
        try {
            const fresh = await Auth.refreshProfile();
            if (fresh) applyCitizenNav(fresh);
        } catch (e) {}
    }
}

function applyCitizenNav(user) {
    if (!user) return;
    const nameEl = document.getElementById('citizenNavName');
    const accEl = document.getElementById('citizenNavAccount');
    if (nameEl) {
        nameEl.textContent = user.fullName || user.email;
    }
    const accNo = user.accountNumber || ('CT-RES-' + String(user.id || '').padStart(5, '0'));
    if (accEl) {
        accEl.textContent = accNo;
    }
}

/**
 * Fetch complaints from Spring Boot API (/complaints/my)
 */
async function loadCitizenComplaints() {
    const tbody = document.getElementById('complaintsTbody');
    const emptyState = document.getElementById('emptyStateBox');
    const tableCard = document.getElementById('tableContainerCard');
    const countBadge = document.getElementById('complaintCountBadge');

    if (countBadge) countBadge.textContent = 'Syncing...';

    // Show loading row in table
    if (tbody) {
        tbody.innerHTML = `
            <tr id="tableLoadingRow">
                <td colspan="7" class="text-center py-5">
                    <div class="spinner-border text-primary me-2" role="status" style="width: 2rem; height: 2rem;"></div>
                    <div class="mt-2 text-muted fw-semibold">Retrieving your grievances from municipal server...</div>
                </td>
            </tr>
        `;
    }
    if (tableCard) tableCard.classList.remove('d-none');
    if (emptyState) emptyState.classList.add('d-none');

    try {
        const liveList = await GrievanceService.getMyGrievances();
        allComplaints = Array.isArray(liveList) ? liveList : [];

        if (allComplaints.length === 0) {
            // Show true empty state
            if (countBadge) countBadge.textContent = '0 Filed';
            if (tableCard) tableCard.classList.add('d-none');
            if (emptyState) {
                emptyState.innerHTML = `
                    <div class="empty-state-icon">
                        <i class="bi bi-inbox text-primary"></i>
                    </div>
                    <h5 class="fw-bold text-navy mb-1">No Complaints Lodged Yet</h5>
                    <p class="text-muted small mb-3">You have not submitted any civic grievances yet. If you see a problem in your neighborhood, file a complaint to get it resolved.</p>
                    <div>
                        <a href="report-grievance.html" class="btn btn-primary btn-sm px-3">
                            <i class="bi bi-plus-circle me-1"></i> File New Grievance
                        </a>
                    </div>
                `;
                emptyState.classList.remove('d-none');
            }
            return;
        }

        applyFiltersAndRender();

    } catch (error) {
        console.error('[MyComplaints] Error loading grievances:', error);
        if (countBadge) countBadge.textContent = 'Error';
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="alert alert-danger d-inline-block border-0 shadow-sm text-start py-3 px-4 mb-0">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <i class="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
                                <strong class="fs-6">Could Not Load Grievances</strong>
                            </div>
                            <p class="small mb-3 text-secondary">
                                ${escapeHtml(error.message || 'Unable to connect to the backend API. Please ensure the server is active on port 8080.')}
                            </p>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="loadCitizenComplaints()">
                                <i class="bi bi-arrow-clockwise me-1"></i> Retry Connection
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Filter and Search listeners
 */
function initFiltersAndControls() {
    const searchInput = document.getElementById('searchComplaintId');
    const categoryFilter = document.getElementById('filterCategory');
    const statusFilter = document.getElementById('filterStatus');
    const sortDateSelect = document.getElementById('sortDate');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const resetBtn = document.getElementById('resetFiltersBtn');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            applyFiltersAndRender();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndRender();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndRender();
        });
    }

    if (sortDateSelect) {
        sortDateSelect.addEventListener('change', () => {
            applyFiltersAndRender();
        });
    }

    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value, 10);
            currentPage = 1;
            applyFiltersAndRender();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = 'ALL';
            if (statusFilter) statusFilter.value = 'ALL';
            if (sortDateSelect) sortDateSelect.value = 'DESC';
            currentPage = 1;
            applyFiltersAndRender();
        });
    }
}

/**
 * Apply Search, Filters, Sorting, and Pagination
 */
function applyFiltersAndRender() {
    const searchQuery = (document.getElementById('searchComplaintId')?.value || '').trim().toLowerCase();
    const selectedCategory = document.getElementById('filterCategory')?.value || 'ALL';
    const selectedStatus = document.getElementById('filterStatus')?.value || 'ALL';
    const sortOrder = document.getElementById('sortDate')?.value || 'DESC';

    // 1. Filter
    filteredComplaints = allComplaints.filter(item => {
        const tracking = (item.complaintNumber || item.trackingNumber || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const category = (item.category || item.categoryName || '').toLowerCase();
        const status = (item.status || '').toUpperCase();

        // Search by tracking number or title
        const matchSearch = !searchQuery || tracking.includes(searchQuery) || title.includes(searchQuery);

        // Category filter
        const matchCategory = selectedCategory === 'ALL' || category.includes(selectedCategory.toLowerCase());

        // Status filter
        const matchStatus = selectedStatus === 'ALL' || status === selectedStatus;

        return matchSearch && matchCategory && matchStatus;
    });

    // 2. Sort by date
    filteredComplaints.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
    });

    // 3. Update summary counter badge
    const countBadge = document.getElementById('complaintCountBadge');
    if (countBadge) {
        countBadge.textContent = `${filteredComplaints.length} of ${allComplaints.length} Filed`;
    }

    // 4. Render Table and Pagination
    renderTable();
    renderPagination();
}

/**
 * Render Table Rows for Current Page
 */
function renderTable() {
    const tbody = document.getElementById('complaintsTbody');
    const emptyState = document.getElementById('emptyStateBox');
    const tableCard = document.getElementById('tableContainerCard');

    if (!tbody) return;

    if (filteredComplaints.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.innerHTML = `
                <div class="empty-state-icon">
                    <i class="bi bi-search"></i>
                </div>
                <h5 class="fw-bold text-navy mb-1">No Matching Complaints Found</h5>
                <p class="text-muted small mb-3">No grievances match your current search query or active filter settings.</p>
                <div>
                    <button class="btn btn-outline-primary btn-sm me-2" onclick="document.getElementById('resetFiltersBtn').click()">
                        <i class="bi bi-arrow-counterclockwise me-1"></i> Clear Filter Criteria
                    </button>
                    <a href="report-grievance.html" class="btn btn-primary btn-sm">
                        <i class="bi bi-plus-circle me-1"></i> File New Grievance
                    </a>
                </div>
            `;
            emptyState.classList.remove('d-none');
        }
        if (tableCard) tableCard.classList.add('d-none');
        return;
    }

    if (emptyState) emptyState.classList.add('d-none');
    if (tableCard) tableCard.classList.remove('d-none');

    // Slice for pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredComplaints.slice(startIndex, startIndex + itemsPerPage);

    tbody.innerHTML = paginatedItems.map(item => {
        const trackingNum = item.complaintNumber || item.trackingNumber || `GRV-2026-${item.id}`;
        const catName = item.category || item.categoryName || 'General';
        const deptName = item.department || item.departmentName || 'Responsible Dept';
        const location = item.locationAddress || item.location || 'Location specified';

        const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'Recent';

        const statusClass = getStatusBadgeClass(item.status);
        const statusLabel = formatStatusLabel(item.status);

        return `
            <tr>
                <!-- Complaint ID -->
                <td>
                    <span class="complaint-id-tag">${escapeHtml(trackingNum)}</span>
                </td>

                <!-- Complaint Title -->
                <td>
                    <div class="fw-bold text-navy" style="max-width: 260px;">${escapeHtml(item.title)}</div>
                    <small class="text-muted d-block text-truncate" style="max-width: 260px;">${escapeHtml(deptName)}</small>
                </td>

                <!-- Category -->
                <td>
                    <span class="category-pill">${escapeHtml(catName)}</span>
                </td>

                <!-- Submitted Date -->
                <td>
                    <div class="small text-secondary">
                        <i class="bi bi-calendar3 me-1 text-muted"></i>${formattedDate}
                    </div>
                </td>

                <!-- Location -->
                <td>
                    <div class="small text-secondary" style="max-width: 220px;">
                        <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(location)}
                    </div>
                </td>

                <!-- Current Status -->
                <td>
                    <span class="status-badge ${statusClass}">
                        ${getStatusIcon(item.status)} ${statusLabel}
                    </span>
                </td>

                <!-- View Details Button -->
                <td class="text-end">
                    <a href="grievance-details.html?track=${encodeURIComponent(trackingNum)}" class="btn btn-sm btn-outline-primary fw-semibold px-3 py-1">
                        <i class="bi bi-eye me-1"></i> View Details
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    // Update Showing Entries Info
    const rangeInfo = document.getElementById('showingEntriesInfo');
    if (rangeInfo) {
        const start = startIndex + 1;
        const end = Math.min(startIndex + itemsPerPage, filteredComplaints.length);
        rangeInfo.textContent = `Showing ${start} to ${end} of ${filteredComplaints.length} complaints`;
    }
}

/**
 * Render Dynamic Pagination Controls
 */
function renderPagination() {
    const paginationUl = document.getElementById('complaintPagination');
    if (!paginationUl) return;

    const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);

    if (totalPages <= 1) {
        paginationUl.innerHTML = '';
        return;
    }

    let html = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage(${currentPage - 1})" aria-label="Previous">
                <i class="bi bi-chevron-left"></i>
            </button>
        </li>
    `;

    for (let p = 1; p <= totalPages; p++) {
        html += `
            <li class="page-item ${p === currentPage ? 'active' : ''}">
                <button class="page-link" onclick="changePage(${p})">${p}</button>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" onclick="changePage(${currentPage + 1})" aria-label="Next">
                <i class="bi bi-chevron-right"></i>
            </button>
        </li>
    `;

    paginationUl.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();

    // Scroll to table smoothly on mobile
    document.getElementById('tableContainerCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'SUBMITTED': return 'status-SUBMITTED';
        case 'UNDER_REVIEW': return 'status-UNDER_REVIEW';
        case 'ASSIGNED': return 'status-ASSIGNED';
        case 'IN_PROGRESS': return 'status-IN_PROGRESS';
        case 'RESOLVED': return 'status-RESOLVED';
        case 'REJECTED': return 'status-REJECTED';
        default: return 'status-SUBMITTED';
    }
}

function formatStatusLabel(status) {
    if (!status) return 'Submitted';
    return status.replace(/_/g, ' ');
}

function getStatusIcon(status) {
    switch (status) {
        case 'SUBMITTED': return '<i class="bi bi-send"></i>';
        case 'UNDER_REVIEW': return '<i class="bi bi-hourglass-split"></i>';
        case 'ASSIGNED': return '<i class="bi bi-person-check"></i>';
        case 'IN_PROGRESS': return '<i class="bi bi-tools"></i>';
        case 'RESOLVED': return '<i class="bi bi-check2-circle text-success"></i>';
        case 'REJECTED': return '<i class="bi bi-x-circle text-danger"></i>';
        default: return '<i class="bi bi-circle"></i>';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * CivicTrack - Administrator Governance Engine
 * Protected API Integration, 3 Chart.js Visualizations, 5 Metric Cards, and Status Dispatch Manager.
 * Fully connected to Spring Boot REST APIs (/dashboard/admin and /complaints).
 */

let adminComplaintsList = [];
let activeStatusFilter = 'ALL';
let monthlyChart = null;
let categoryChart = null;
let statusChart = null;
let adminStatsData = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Enforce Administrator Authentication
    if (typeof Auth !== 'undefined') {
        if (!Auth.requireAuth('ROLE_ADMIN')) {
            return;
        }
    }

    initAdminProfile();
    loadAdminData();
    initAdminSearchAndFilters();
});

/**
 * 1. Admin Profile Header Setup
 */
function initAdminProfile() {
    const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const nameEl = document.getElementById('adminNavName');
    if (nameEl && user) {
        nameEl.textContent = user.fullName || user.email || 'System Administrator';
    }
}

/**
 * 2. Load Real Grievances and Statistics from Spring Boot Backend
 */
async function loadAdminData() {
    const tbody = document.getElementById('adminComplaintsTbody');
    const tableLoading = document.getElementById('adminTableLoading');

    if (tableLoading) tableLoading.classList.remove('d-none');

    try {
        // Fetch dashboard statistics from /dashboard/admin
        try {
            adminStatsData = await Api.get('/dashboard/admin');
        } catch (e) {
            console.warn('[AdminDashboard] Stats API call error, will calculate from complaints list:', e);
        }

        // Fetch all complaints
        const liveList = await GrievanceService.getAllGrievances();
        adminComplaintsList = Array.isArray(liveList) ? liveList : [];

        if (tableLoading) tableLoading.classList.add('d-none');
        renderAdminDashboard();

    } catch (err) {
        console.error('[AdminDashboard] Error connecting to backend:', err);
        if (tableLoading) tableLoading.classList.add('d-none');

        // Show error notice in complaints table
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="alert alert-danger d-inline-block border-0 shadow-sm text-start py-3 px-4 mb-0">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <i class="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
                                <strong class="fs-6">Failed to Load Administrative Data</strong>
                            </div>
                            <p class="small mb-3 text-secondary">
                                ${escapeHtml(err.message || 'Cannot reach Spring Boot on port 8080. Ensure MySQL and backend are running.')}
                            </p>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="loadAdminData()">
                                <i class="bi bi-arrow-clockwise me-1"></i> Retry Connection
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        // Zero out cards
        document.getElementById('metricTotalAll').textContent = '0';
        document.getElementById('metricPending').textContent = '0';
        document.getElementById('metricProgress').textContent = '0';
        document.getElementById('metricResolved').textContent = '0';
        document.getElementById('metricRejected').textContent = '0';

        initAllCharts();
    }
}

/**
 * 3. Render All Metrics, Charts, and Table
 */
function renderAdminDashboard() {
    updateMetricCards();
    initAllCharts();
    renderComplaintsTable();
}

/**
 * 4. Update the 5 Dashboard Metric Cards
 */
function updateMetricCards() {
    let total = adminComplaintsList.length;
    let pending = adminComplaintsList.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
    let inProgress = adminComplaintsList.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
    let resolved = adminComplaintsList.filter(c => c.status === 'RESOLVED').length;
    let rejected = adminComplaintsList.filter(c => c.status === 'REJECTED').length;

    if (adminStatsData) {
        if (adminStatsData.totalComplaints !== undefined) total = adminStatsData.totalComplaints;
        if (adminStatsData.pendingComplaints !== undefined) pending = adminStatsData.pendingComplaints;
        if (adminStatsData.inProgressComplaints !== undefined) inProgress = adminStatsData.inProgressComplaints;
        if (adminStatsData.resolvedComplaints !== undefined) resolved = adminStatsData.resolvedComplaints;
        if (adminStatsData.rejectedComplaints !== undefined) rejected = adminStatsData.rejectedComplaints;
    }

    document.getElementById('metricTotalAll').textContent = total;
    document.getElementById('metricPending').textContent = pending;
    document.getElementById('metricProgress').textContent = inProgress;
    document.getElementById('metricResolved').textContent = resolved;
    document.getElementById('metricRejected').textContent = rejected;
}

/**
 * 5. Initialize the 3 Chart.js Visualizations
 */
function initAllCharts() {
    renderMonthlyTrendChart();
    renderCategoryVolumeChart();
    renderStatusDistributionChart();
}

// Chart 1: Monthly Complaint Trend (Bar / Line)
function renderMonthlyTrendChart() {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    if (monthlyChart) monthlyChart.destroy();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
        const m = (currentMonthIdx - i + 12) % 12;
        last6Months.push(monthNames[m]);
    }

    // Tally by month from adminComplaintsList
    const reportedCounts = [0, 0, 0, 0, 0, 0];
    const resolvedCounts = [0, 0, 0, 0, 0, 0];

    adminComplaintsList.forEach(c => {
        if (c.createdAt) {
            const date = new Date(c.createdAt);
            const mName = monthNames[date.getMonth()];
            const idx = last6Months.indexOf(mName);
            if (idx !== -1) {
                reportedCounts[idx]++;
                if (c.status === 'RESOLVED') {
                    resolvedCounts[idx]++;
                }
            }
        }
    });

    // If all zeroes, show at least baseline bars
    const maxVal = Math.max(...reportedCounts, ...resolvedCounts);

    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last6Months,
            datasets: [
                {
                    label: 'Reported',
                    data: reportedCounts,
                    backgroundColor: '#2563EB',
                    borderRadius: 6
                },
                {
                    label: 'Resolved',
                    data: resolvedCounts,
                    backgroundColor: '#10B981',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, font: { size: 12 } } },
                tooltip: { cornerRadius: 8, padding: 10 }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: '#f1f5f9' },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Chart 2: Category-wise Complaint Chart (Horizontal Bar)
function renderCategoryVolumeChart() {
    const ctx = document.getElementById('categoryVolumeChart');
    if (!ctx) return;
    if (categoryChart) categoryChart.destroy();

    const categories = ['Road Damage', 'Water Supply', 'Garbage Collection', 'Streetlight', 'Drainage', 'Public Infrastructure', 'Other'];
    const counts = categories.map(cat => adminComplaintsList.filter(c => {
        const itemCat = (c.category || c.categoryName || '').toLowerCase();
        return itemCat.includes(cat.toLowerCase());
    }).length);

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Roads', 'Water', 'Waste', 'Lighting', 'Drainage', 'Infra', 'Other'],
            datasets: [{
                label: 'Complaints',
                data: counts,
                backgroundColor: [
                    '#ef4444', // Red for Road
                    '#3b82f6', // Blue for Water
                    '#10b981', // Green for Waste
                    '#f59e0b', // Amber for Lighting
                    '#06b6d4', // Cyan for Drainage
                    '#8b5cf6', // Violet for Infra
                    '#64748b'  // Slate for Other
                ],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { cornerRadius: 8, padding: 10 }
            },
            scales: {
                x: {
                    grid: { color: '#f1f5f9' },
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                },
                y: { grid: { display: false } }
            }
        }
    });
}

// Chart 3: Status Distribution Chart (Doughnut)
function renderStatusDistributionChart() {
    const ctx = document.getElementById('statusDistributionChart');
    if (!ctx) return;
    if (statusChart) statusChart.destroy();

    const pending = adminComplaintsList.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length;
    const inProgress = adminComplaintsList.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
    const resolved = adminComplaintsList.filter(c => c.status === 'RESOLVED').length;
    const rejected = adminComplaintsList.filter(c => c.status === 'REJECTED').length;

    const total = pending + inProgress + resolved + rejected;
    const chartData = total === 0 ? [1] : [resolved, inProgress, pending, rejected];
    const chartColors = total === 0 ? ['#e2e8f0'] : ['#10B981', '#2563EB', '#F59E0B', '#EF4444'];
    const chartLabels = total === 0 ? ['No Records'] : ['Resolved', 'In Progress', 'Pending', 'Rejected'];

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, font: { size: 11 }, padding: 14 }
                },
                tooltip: {
                    enabled: total > 0,
                    cornerRadius: 8,
                    padding: 10
                }
            }
        }
    });
}

/**
 * 6. Complaints Table Rendering & Filter Support
 */
function renderComplaintsTable() {
    const tbody = document.getElementById('adminComplaintsTbody');
    if (!tbody) return;

    const searchQuery = (document.getElementById('adminTableSearch')?.value || '').trim().toLowerCase();
    const deptFilter = document.getElementById('adminDeptFilter')?.value || 'ALL';

    const filtered = adminComplaintsList.filter(item => {
        const tracking = (item.complaintNumber || item.trackingNumber || '').toLowerCase();
        const citizen = (item.citizenName || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const dept = (item.department || item.departmentName || '').toLowerCase();
        const status = item.status || 'SUBMITTED';

        // Status sidebar filter
        let matchStatus = true;
        if (activeStatusFilter === 'PENDING') {
            matchStatus = (status === 'SUBMITTED' || status === 'UNDER_REVIEW');
        } else if (activeStatusFilter === 'IN_PROGRESS') {
            matchStatus = (status === 'IN_PROGRESS' || status === 'ASSIGNED');
        } else if (activeStatusFilter === 'RESOLVED') {
            matchStatus = (status === 'RESOLVED');
        } else if (activeStatusFilter === 'REJECTED') {
            matchStatus = (status === 'REJECTED');
        }

        // Search match
        const matchSearch = !searchQuery || tracking.includes(searchQuery) || citizen.includes(searchQuery) || title.includes(searchQuery);

        // Dept filter
        const matchDept = deptFilter === 'ALL' || dept.includes(deptFilter.toLowerCase());

        return matchStatus && matchSearch && matchDept;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No administrative records found matching filter criteria.</td></tr>`;
        const countText = document.getElementById('tableCountText');
        if (countText) countText.textContent = `0 Complaints Displayed`;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const trackingNum = item.complaintNumber || item.trackingNumber || `GRV-2026-${item.id}`;
        const catName = item.category || item.categoryName || 'General';
        const citizenName = item.citizenName || 'Verified Citizen';
        const citizenAcc = item.residentAccountNumber || item.citizenAccountNumber || ('CT-RES-' + String(item.userId || '').padStart(5, '0'));
        const location = item.locationAddress || 'Ward 4';
        const priority = item.priority || 'MEDIUM';
        const status = item.status || 'SUBMITTED';

        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) : 'Recent';

        return `
            <tr>
                <td>
                    <span class="tracking-pill">${escapeHtml(trackingNum)}</span>
                </td>
                <td>
                    <div class="fw-bold text-navy">${escapeHtml(citizenName)}</div>
                    <div class="text-primary font-monospace fw-semibold" style="font-size: 0.72rem;"><i class="bi bi-person-badge me-1"></i>${escapeHtml(citizenAcc)}</div>
                    <small class="text-muted"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(location)}</small>
                </td>
                <td>
                    <div class="fw-semibold text-dark">${escapeHtml(item.title)}</div>
                    <span class="category-pill mt-1">${escapeHtml(catName)}</span>
                </td>
                <td><small class="text-secondary">${dateStr}</small></td>
                <td>
                    <span class="badge priority-${priority}">${priority}</span>
                </td>
                <td>
                    <span class="status-badge status-${status}">${status.replace(/_/g, ' ')}</span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary fw-semibold px-2 py-1" onclick="openAdminUpdateModal(${item.id})">
                        <i class="bi bi-pencil-square me-1"></i> Action
                    </button>
                    <a href="grievance-details.html?track=${encodeURIComponent(trackingNum)}" class="btn btn-sm btn-light border px-2 py-1" title="View Public Tracking">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    const countText = document.getElementById('tableCountText');
    if (countText) countText.textContent = `${filtered.length} of ${adminComplaintsList.length} Complaints Displayed`;
}

/**
 * 7. Table Search and Filters
 */
function initAdminSearchAndFilters() {
    const searchInput = document.getElementById('adminTableSearch');
    const deptSelect = document.getElementById('adminDeptFilter');

    if (searchInput) {
        searchInput.addEventListener('input', renderComplaintsTable);
    }
    if (deptSelect) {
        deptSelect.addEventListener('change', renderComplaintsTable);
    }
}

/**
 * 8. Filter via Sidebar Navigation
 */
function filterBySidebar(filterKey, linkElement) {
    activeStatusFilter = filterKey;

    // Update active class on sidebar links
    document.querySelectorAll('.admin-sidebar .nav-link, .offcanvas-admin .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (linkElement) {
        linkElement.classList.add('active');
    }

    // Scroll to complaints table
    document.getElementById('complaintsStreamSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    renderComplaintsTable();
}

/**
 * 9. Status Update Action Modal
 */
let statusModalObj = null;

function openAdminUpdateModal(id) {
    const item = adminComplaintsList.find(c => c.id === id);
    if (!item) return;

    const trackingNum = item.complaintNumber || item.trackingNumber || `GRV-2026-${item.id}`;
    document.getElementById('modalComplaintIdHidden').value = item.id;
    document.getElementById('modalTrackingIdDisplay').textContent = trackingNum;
    document.getElementById('modalTitleDisplay').textContent = item.title;
    document.getElementById('modalStatusSelect').value = item.status;
    document.getElementById('modalRemarksInput').value = item.adminRemarks || item.resolutionNotes || '';

    if (!statusModalObj) {
        statusModalObj = new bootstrap.Modal(document.getElementById('adminStatusModal'));
    }
    statusModalObj.show();
}

async function submitAdminStatusChange() {
    const id = parseInt(document.getElementById('modalComplaintIdHidden').value, 10);
    const newStatus = document.getElementById('modalStatusSelect').value;
    const remarks = document.getElementById('modalRemarksInput').value.trim();
    const saveBtn = document.getElementById('modalSaveStatusBtn');

    if ((newStatus === 'REJECTED' || newStatus === 'RESOLVED') && !remarks) {
        alert(`Please enter administrative remarks explaining why this complaint is marked as ${newStatus}.`);
        document.getElementById('modalRemarksInput').focus();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving to MySQL...';

    try {
        await GrievanceService.updateStatus(id, newStatus, remarks);

        // Update local object
        const found = adminComplaintsList.find(c => c.id === id);
        if (found) {
            found.status = newStatus;
            found.adminRemarks = remarks;
            found.resolutionNotes = remarks;
        }

        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Update';
        statusModalObj.hide();

        // Refresh full dataset from backend to update charts and metrics accurately
        await loadAdminData();

    } catch (err) {
        console.error('[AdminDashboard] Status update failed:', err);
        alert(`Status update failed: ${err.message || 'Server error occurred'}`);
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Update';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

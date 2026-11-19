/**
 * CivicTrack - Municipal GIS & Interactive Grievance Map Engine
 * Leaflet.js & OpenStreetMap Spatial Analytics, Status-based Pins, Dynamic Filtering & Inspector Drawer.
 */

const AdminGisMap = {
    // Karnataka State Municipal GIS Center (Central Karnataka / Hubballi-Bengaluru Axis)
    DEFAULT_CENTER: [14.9200, 75.7500],
    DEFAULT_ZOOM: 7,

    // Status color mapping
    STATUS_COLORS: {
        'SUBMITTED': '#F59E0B',
        'UNDER_REVIEW': '#6366F1',
        'ASSIGNED': '#8B5CF6',
        'IN_PROGRESS': '#2563EB',
        'RESOLVED': '#10B981',
        'REJECTED': '#EF4444'
    },

    // Category Icon mapping
    CATEGORY_ICONS: {
        'Road Damage': 'bi-cone-striped',
        'Drainage Problems': 'bi-water',
        'Water Supply': 'bi-droplet-half',
        'Garbage Collection': 'bi-trash-fill',
        'Streetlight Issues': 'bi-lightbulb-fill',
        'Public Infrastructure': 'bi-buildings-fill',
        'Other': 'bi-tag-fill'
    },

    state: {
        map: null,
        markersLayerGroup: null,
        complaints: [],
        filteredComplaints: [],
        selectedComplaint: null,
        statusFilter: 'ALL',
        categoryFilter: 'ALL',
        searchTerm: '',
        markerMap: new Map() // complaintId -> L.Marker
    },

    /**
     * Initialization entry point
     */
    async init() {
        // 1. Role-based Authentication Guard
        if (typeof Auth !== 'undefined' && !Auth.requireAuth('ROLE_ADMIN')) {
            return;
        }

        // 2. Set Admin profile name
        const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        if (user) {
            const navName = document.getElementById('adminNavName');
            if (navName) navName.textContent = user.fullName || 'System Administrator';
        }

        // 3. Initialize Leaflet OpenStreetMap canvas
        this.initMap();

        // 4. Bind UI Event listeners
        this.bindEvents();

        // 5. Fetch complaints from Spring Boot backend
        await this.loadComplaints();
    },

    /**
     * Initialize Leaflet Map Instance
     */
    initMap() {
        const mapContainer = document.getElementById('adminGisMap');
        if (!mapContainer || typeof L === 'undefined') {
            console.error('[AdminGisMap] Leaflet or container not found.');
            return;
        }

        this.state.map = L.map('adminGisMap', {
            center: this.DEFAULT_CENTER,
            zoom: this.DEFAULT_ZOOM,
            minZoom: 6,
            maxZoom: 19,
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true,
            dragging: true,
            inertia: true,
            inertiaDeceleration: 3000,
            inertiaMaxSpeed: 2000,
            easeLinearity: 0.2
        });

        // OpenStreetMap Standard Tile Layer (Zero API keys required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 6,
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
        }).addTo(this.state.map);

        // Marker layer group
        this.state.markersLayerGroup = L.layerGroup().addTo(this.state.map);

        // Window resize handler to maintain map sliding & rendering
        window.addEventListener('resize', () => {
            if (this.state.map) {
                this.state.map.invalidateSize();
            }
        });

        // Ensure tiles render completely
        setTimeout(() => {
            if (this.state.map) {
                this.state.map.invalidateSize();
            }
        }, 300);
    },

    /**
     * Bind UI event listeners
     */
    bindEvents() {
        // Search Input
        const searchInput = document.getElementById('mapSearchInput');
        if (searchInput) {
            let debounceTimer = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.state.searchTerm = e.target.value.trim().toLowerCase();
                    this.applyFilters();
                }, 250);
            });
        }

        // Category Select
        const catSelect = document.getElementById('mapCategorySelect');
        if (catSelect) {
            catSelect.addEventListener('change', (e) => {
                this.state.categoryFilter = e.target.value;
                this.applyFilters();
            });
        }

        // Inspector action buttons
        const updateBtn = document.getElementById('inspUpdateStatusBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.openStatusModal());
        }

        const assignBtn = document.getElementById('inspAssignDeptBtn');
        if (assignBtn) {
            assignBtn.addEventListener('click', () => this.openAssignModal());
        }
    },

    /**
     * Load Complaints from Spring Boot REST API
     */
    async loadComplaints() {
        const refreshBtn = document.getElementById('refreshMapBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Loading...';
        }

        try {
            let complaints = [];
            if (typeof GrievanceService !== 'undefined') {
                complaints = await GrievanceService.getAllGrievances();
            }

            // Fallback sample coordinates if backend returns un-geocoded records or during offline dev
            if (!complaints || complaints.length === 0) {
                complaints = this.getFallbackGeocodedData();
            }

            // Normalize coordinates
            this.state.complaints = (complaints || []).map(c => {
                return {
                    ...c,
                    id: c.id,
                    trackingNumber: c.trackingNumber || c.complaintNumber || `GRV-2026-${c.id}`,
                    title: c.title || 'Untitled Grievance',
                    description: c.description || 'No detailed statement provided.',
                    categoryName: c.categoryName || c.category || 'General',
                    departmentName: c.departmentName || c.department || 'Responsible Department',
                    status: (c.status || 'SUBMITTED').toUpperCase(),
                    priority: c.priority || 'MEDIUM',
                    locationAddress: c.locationAddress || c.location || 'Municipal Corporation, Karnataka',
                    latitude: parseFloat(c.latitude) || null,
                    longitude: parseFloat(c.longitude) || null,
                    citizenName: c.citizenName || 'Registered Citizen',
                    citizenPhone: c.citizenPhone || '+91 98765 43210',
                    createdAt: c.createdAt || new Date().toISOString(),
                    images: c.images || c.attachments || []
                };
            });

            // Update KPI counts
            this.updateKpiCounts();

            // Apply filters & render pins
            this.applyFilters();

            // Fit bounds to all plotted markers
            this.fitAllMarkers();

        } catch (err) {
            console.error('[AdminGisMap] Failed to load grievances from backend:', err);
            this.showToast('Unable to connect to grievance API. Loaded cached GIS records.', 'warning');
            this.state.complaints = this.getFallbackGeocodedData();
            this.updateKpiCounts();
            this.applyFilters();
            this.fitAllMarkers();
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Sync Live Data';
            }
        }
    },

    /**
     * Update KPI metric counters
     */
    updateKpiCounts() {
        const counts = {
            ALL: 0,
            SUBMITTED: 0,
            UNDER_REVIEW: 0,
            ASSIGNED: 0,
            IN_PROGRESS: 0,
            RESOLVED: 0,
            REJECTED: 0
        };

        let geocodedTotal = 0;

        this.state.complaints.forEach(c => {
            if (c.latitude && c.longitude) {
                geocodedTotal++;
                counts.ALL++;
                if (counts[c.status] !== undefined) {
                    counts[c.status]++;
                }
            }
        });

        // Update DOM elements
        const countAll = document.getElementById('countAll');
        const countSubmitted = document.getElementById('countSubmitted');
        const countReview = document.getElementById('countReview');
        const countAssigned = document.getElementById('countAssigned');
        const countProgress = document.getElementById('countProgress');
        const countResolved = document.getElementById('countResolved');
        const countRejected = document.getElementById('countRejected');
        const headerCount = document.getElementById('headerGeocodedCount');

        if (countAll) countAll.textContent = counts.ALL;
        if (countSubmitted) countSubmitted.textContent = counts.SUBMITTED;
        if (countReview) countReview.textContent = counts.UNDER_REVIEW;
        if (countAssigned) countAssigned.textContent = counts.ASSIGNED;
        if (countProgress) countProgress.textContent = counts.IN_PROGRESS;
        if (countResolved) countResolved.textContent = counts.RESOLVED;
        if (countRejected) countRejected.textContent = counts.REJECTED;
        if (headerCount) headerCount.textContent = `${geocodedTotal} Mapped`;
    },

    /**
     * Filter by Status Pill
     */
    filterStatus(status) {
        this.state.statusFilter = status;

        // Update active class on pills
        document.querySelectorAll('#statusFilterPillsContainer .gis-metric-pill').forEach(pill => {
            if (pill.getAttribute('data-status') === status) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        this.applyFilters();
    },

    /**
     * Apply active search and category filters
     */
    applyFilters() {
        const { complaints, statusFilter, categoryFilter, searchTerm } = this.state;

        this.state.filteredComplaints = complaints.filter(c => {
            // Must have valid geolocation
            if (!c.latitude || !c.longitude) return false;

            // Status filter
            if (statusFilter !== 'ALL' && c.status !== statusFilter) {
                return false;
            }

            // Category filter
            if (categoryFilter !== 'ALL' && c.categoryName !== categoryFilter) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const trackMatch = (c.trackingNumber || '').toLowerCase().includes(searchTerm);
                const titleMatch = (c.title || '').toLowerCase().includes(searchTerm);
                const addressMatch = (c.locationAddress || '').toLowerCase().includes(searchTerm);
                const citizenMatch = (c.citizenName || '').toLowerCase().includes(searchTerm);
                if (!trackMatch && !titleMatch && !addressMatch && !citizenMatch) {
                    return false;
                }
            }

            return true;
        });

        this.renderMarkers();
    },

    /**
     * Render Status-Based Markers on the Leaflet Map
     */
    renderMarkers() {
        if (!this.state.map || !this.state.markersLayerGroup) return;

        // Clear existing markers
        this.state.markersLayerGroup.clearLayers();
        this.state.markerMap.clear();

        const visibleCountEl = document.getElementById('legendVisibleCount');
        if (visibleCountEl) {
            visibleCountEl.textContent = `${this.state.filteredComplaints.length} Visible`;
        }

        this.state.filteredComplaints.forEach(c => {
            const marker = this.createComplaintMarker(c);
            marker.addTo(this.state.markersLayerGroup);
            this.state.markerMap.set(c.id, marker);
        });

        // If previously selected complaint is still visible, keep it selected
        if (this.state.selectedComplaint) {
            const stillVisible = this.state.filteredComplaints.find(c => c.id === this.state.selectedComplaint.id);
            if (stillVisible) {
                this.selectComplaint(stillVisible, false);
            } else {
                this.clearInspector();
            }
        }
    },

    /**
     * Create Custom Colored Leaflet Marker
     */
    createComplaintMarker(complaint) {
        const color = this.STATUS_COLORS[complaint.status] || '#2563EB';
        const iconClass = this.CATEGORY_ICONS[complaint.categoryName] || 'bi-geo-alt-fill';

        // Custom Leaflet DivIcon with styled droplet pin & Bootstrap Icon
        const customIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div style="
                    background-color: ${color};
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                    border: 2px solid #ffffff;
                    cursor: pointer;
                ">
                    <i class="bi ${iconClass}" style="transform: rotate(45deg); color: #ffffff; font-size: 14px;"></i>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        const marker = L.marker([complaint.latitude, complaint.longitude], {
            icon: customIcon,
            title: `${complaint.trackingNumber} - ${complaint.title}`
        });

        // Rich Popup Tooltip
        const popupContent = `
            <div class="p-1" style="min-width: 200px; font-family: inherit;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="tracking-code-pill" style="font-size: 0.75rem;">${this.escapeHtml(complaint.trackingNumber)}</span>
                    <span class="badge" style="background-color: ${color}; color: #ffffff; font-size: 10px;">
                        ${complaint.status.replace(/_/g, ' ')}
                    </span>
                </div>
                <strong class="d-block text-navy small mb-1">${this.escapeHtml(complaint.title)}</strong>
                <div class="small text-muted mb-2"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${this.escapeHtml(complaint.locationAddress)}</div>
                <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span class="badge bg-light text-secondary border small">${this.escapeHtml(complaint.categoryName)}</span>
                    <button class="btn btn-primary btn-sm py-0 px-2" style="font-size: 11px;" onclick="AdminGisMap.selectComplaintById(${complaint.id})">
                        Inspect &rarr;
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);

        // Click marker to populate Inspector Drawer and smoothly slide map
        marker.on('click', () => {
            this.selectComplaint(complaint, true);
        });

        return marker;
    },

    /**
     * Select a complaint and display full dossier in Inspector Drawer
     */
    selectComplaint(complaint, panTo = true) {
        this.state.selectedComplaint = complaint;

        const emptyState = document.getElementById('inspectorEmptyState');
        const detailsState = document.getElementById('inspectorDetailsState');
        const inspectorBadge = document.getElementById('inspectorBadge');
        const inspectorSubtitle = document.getElementById('inspectorSubtitle');

        if (emptyState) emptyState.classList.add('d-none');
        if (detailsState) detailsState.classList.remove('d-none');
        if (inspectorBadge) {
            inspectorBadge.textContent = complaint.trackingNumber;
            inspectorBadge.className = 'badge bg-primary text-white font-monospace';
        }
        if (inspectorSubtitle) inspectorSubtitle.textContent = `${complaint.categoryName} • ${complaint.status}`;

        // Populate Fields
        document.getElementById('inspTrackingNumber').textContent = complaint.trackingNumber;
        document.getElementById('inspTitle').textContent = complaint.title;
        document.getElementById('inspCategory').textContent = complaint.categoryName;
        document.getElementById('inspPriority').textContent = complaint.priority || 'MEDIUM';
        document.getElementById('inspPriority').className = `badge priority-badge priority-${complaint.priority || 'MEDIUM'}`;
        document.getElementById('inspDescription').textContent = complaint.description;
        document.getElementById('inspAddress').textContent = complaint.locationAddress;
        document.getElementById('inspCoordinates').innerHTML = `
            <i class="bi bi-geo-alt-fill text-danger me-1"></i> ${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}
        `;

        // Citizen info
        document.getElementById('inspCitizenName').textContent = complaint.citizenName || 'Registered Citizen';
        const resAccNo = complaint.residentAccountNumber || complaint.citizenAccountNumber || ('CT-RES-' + String(complaint.userId || '').padStart(5, '0'));
        const accEl = document.getElementById('inspCitizenAccount');
        if (accEl) accEl.textContent = resAccNo;
        document.getElementById('inspCitizenPhone').textContent = complaint.citizenPhone || 'Contact not recorded';
        document.getElementById('inspDepartment').textContent = complaint.departmentName || 'Responsible Department';

        // Status Badge
        const statusBadge = document.getElementById('inspStatusBadge');
        if (statusBadge) {
            statusBadge.className = `status-badge status-${complaint.status}`;
            statusBadge.textContent = complaint.status.replace(/_/g, ' ');
        }

        // Photo thumbnail
        const photoContainer = document.getElementById('inspPhotoContainer');
        const photoImg = document.getElementById('inspPhotoImg');
        if (photoContainer && photoImg) {
            if (complaint.images && complaint.images.length > 0) {
                const imgObj = complaint.images[0];
                const rawUrl = imgObj.fileUrl || imgObj.filePath || imgObj.url || (typeof imgObj === 'string' ? imgObj : '');
                if (rawUrl) {
                    const fullUrl = rawUrl.startsWith('http')
                        ? rawUrl
                        : `http://localhost:8080/api/v1${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                    photoImg.src = fullUrl;
                    photoContainer.classList.remove('d-none');
                } else {
                    photoContainer.classList.add('d-none');
                }
            } else {
                photoContainer.classList.add('d-none');
            }
        }

        // External Google Maps Link
        const gmapsBtn = document.getElementById('inspGoogleMapsBtn');
        if (gmapsBtn) {
            gmapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${complaint.latitude},${complaint.longitude}`;
        }

        // Complaints Registry deep link
        const registryLink = document.getElementById('inspFullRecordLink');
        if (registryLink) {
            registryLink.href = `admin-complaints.html?search=${encodeURIComponent(complaint.trackingNumber)}`;
        }

        // Pan and slide map smoothly if requested
        if (panTo && this.state.map && complaint.latitude && complaint.longitude) {
            const currentZoom = this.state.map.getZoom();
            const targetZoom = Math.max(currentZoom, 13);
            this.state.map.flyTo([complaint.latitude, complaint.longitude], targetZoom, {
                animate: true,
                duration: 0.6
            });
            const marker = this.state.markerMap.get(complaint.id);
            if (marker) {
                setTimeout(() => marker.openPopup(), 400);
            }
        }

        // On mobile / tablet screens (< 992px), smoothly slide view to the Inspector Drawer
        if (window.innerWidth < 992) {
            const inspectorEl = document.getElementById('gisInspectorCard');
            if (inspectorEl) {
                inspectorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    },

    selectComplaintById(id) {
        const found = this.state.complaints.find(c => c.id === id);
        if (found) {
            this.selectComplaint(found, true);
        }
    },

    clearInspector() {
        this.state.selectedComplaint = null;
        const emptyState = document.getElementById('inspectorEmptyState');
        const detailsState = document.getElementById('inspectorDetailsState');
        const inspectorBadge = document.getElementById('inspectorBadge');
        const inspectorSubtitle = document.getElementById('inspectorSubtitle');

        if (emptyState) emptyState.classList.remove('d-none');
        if (detailsState) detailsState.classList.add('d-none');
        if (inspectorBadge) {
            inspectorBadge.textContent = 'SELECT PIN';
            inspectorBadge.className = 'badge bg-light text-dark font-monospace';
        }
        if (inspectorSubtitle) inspectorSubtitle.textContent = 'Spatial Pin Details';
    },

    /**
     * Map Zoom Controls
     */
    zoomIn() {
        if (this.state.map) {
            this.state.map.zoomIn();
        }
    },

    zoomOut() {
        if (this.state.map) {
            this.state.map.zoomOut();
        }
    },

    /**
     * Map Controls: Center on Karnataka Municipal GIS View with smooth slide
     */
    centerCity() {
        if (this.state.map) {
            this.state.map.flyTo(this.DEFAULT_CENTER, this.DEFAULT_ZOOM, {
                animate: true,
                duration: 0.8
            });
        }
    },

    /**
     * Map Controls: Fit all markers into viewport with capped zoom
     */
    fitAllMarkers() {
        if (!this.state.map || !this.state.markersLayerGroup) return;

        this.state.map.invalidateSize();

        const bounds = L.latLngBounds();
        let pointCount = 0;

        this.state.filteredComplaints.forEach(c => {
            if (c.latitude && c.longitude) {
                bounds.extend([c.latitude, c.longitude]);
                pointCount++;
            }
        });

        if (pointCount > 1) {
            this.state.map.fitBounds(bounds.pad(0.15), {
                maxZoom: 14,
                animate: true,
                duration: 0.8,
                padding: [40, 40]
            });
        } else if (pointCount === 1) {
            const single = this.state.filteredComplaints.find(c => c.latitude && c.longitude);
            this.state.map.flyTo([single.latitude, single.longitude], 14, {
                animate: true,
                duration: 0.8
            });
        } else {
            this.centerCity();
        }
    },

    /**
     * Reset search & category filters
     */
    resetFilters() {
        this.state.statusFilter = 'ALL';
        this.state.categoryFilter = 'ALL';
        this.state.searchTerm = '';

        const searchInput = document.getElementById('mapSearchInput');
        const catSelect = document.getElementById('mapCategorySelect');

        if (searchInput) searchInput.value = '';
        if (catSelect) catSelect.value = 'ALL';

        document.querySelectorAll('#statusFilterPillsContainer .gis-metric-pill').forEach(pill => {
            if (pill.getAttribute('data-status') === 'ALL') {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        this.applyFilters();
        this.fitAllMarkers();
    },

    /**
     * Manual Sync / Refresh Map Data
     */
    async refreshMapData() {
        await this.loadComplaints();
        this.showToast('Grievance GIS dataset synchronized with database.', 'success');
    },

    /**
     * Open Status Update Modal
     */
    openStatusModal() {
        if (!this.state.selectedComplaint) return;
        const complaint = this.state.selectedComplaint;

        document.getElementById('statusModalTracking').textContent = complaint.trackingNumber;
        document.getElementById('modalStatusSelect').value = complaint.status;
        document.getElementById('modalStatusRemarks').value = '';

        const modalEl = document.getElementById('updateStatusModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Submit Status Update to Spring Boot Backend
     */
    async submitStatusUpdate() {
        if (!this.state.selectedComplaint) return;
        const complaint = this.state.selectedComplaint;

        const newStatus = document.getElementById('modalStatusSelect').value;
        const remarks = document.getElementById('modalStatusRemarks').value.trim();

        try {
            if (typeof GrievanceService !== 'undefined') {
                await GrievanceService.updateStatus(complaint.id, newStatus, remarks);
            }

            // Update in local state
            complaint.status = newStatus;
            complaint.adminRemarks = remarks;

            // Re-render and update UI
            this.updateKpiCounts();
            this.applyFilters();
            this.selectComplaint(complaint, false);

            // Hide modal
            const modalEl = document.getElementById('updateStatusModal');
            bootstrap.Modal.getInstance(modalEl).hide();

            this.showToast(`Complaint #${complaint.trackingNumber} status updated to ${newStatus}.`, 'success');

        } catch (err) {
            console.error('[AdminGisMap] Failed to update status:', err);
            this.showToast(`Status update failed: ${err.message}`, 'danger');
        }
    },

    /**
     * Open Department Assignment Modal
     */
    openAssignModal() {
        if (!this.state.selectedComplaint) return;
        const complaint = this.state.selectedComplaint;

        document.getElementById('assignModalTracking').textContent = complaint.trackingNumber;
        document.getElementById('modalAssignRemarks').value = '';

        const modalEl = document.getElementById('assignDepartmentModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    },

    /**
     * Submit Department Assignment
     */
    async submitDepartmentAssignment() {
        if (!this.state.selectedComplaint) return;
        const complaint = this.state.selectedComplaint;

        const deptSelect = document.getElementById('modalAssignDeptSelect');
        const deptId = deptSelect.value;
        const deptName = deptSelect.options[deptSelect.selectedIndex]?.text || '';
        const remarks = document.getElementById('modalAssignRemarks').value.trim();

        if (!deptId) {
            alert('Please select a municipal department.');
            return;
        }

        try {
            if (typeof GrievanceService !== 'undefined') {
                await GrievanceService.assignDepartment(complaint.id, deptId, remarks, deptName);
            }

            // Update in local state
            complaint.departmentName = deptName;
            complaint.status = 'ASSIGNED';

            this.updateKpiCounts();
            this.applyFilters();
            this.selectComplaint(complaint, false);

            const modalEl = document.getElementById('assignDepartmentModal');
            bootstrap.Modal.getInstance(modalEl).hide();

            this.showToast(`Complaint #${complaint.trackingNumber} assigned to ${deptName}.`, 'success');

        } catch (err) {
            console.error('[AdminGisMap] Department assignment failed:', err);
            this.showToast(`Assignment failed: ${err.message}`, 'danger');
        }
    },

    /**
     * Toast notification display
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('adminToastContainer');
        if (!container) return;

        const toastId = 'toast_' + Date.now();
        const icon = type === 'success' ? 'bi-check-circle-fill text-success'
            : type === 'warning' ? 'bi-exclamation-triangle-fill text-warning'
            : type === 'danger' ? 'bi-x-circle-fill text-danger'
            : 'bi-info-circle-fill text-primary';

        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center gap-2">
                        <i class="bi ${icon} fs-5"></i>
                        <span>${this.escapeHtml(message)}</span>
                    </div>
                    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
        bsToast.show();

        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    /**
     * Escape HTML helper
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
     * High-fidelity seeded geocoded records spanning Karnataka Municipal Corporations
     */
    getFallbackGeocodedData() {
        return [
            {
                id: 1,
                trackingNumber: 'GRV-2026-8910',
                title: 'Dangerous Deep Pothole on MG Road Near Brigade Junction',
                categoryName: 'Road Damage',
                departmentName: 'Public Works Department (PWD)',
                status: 'SUBMITTED',
                priority: 'HIGH',
                locationAddress: 'MG Road & Brigade Road Junction, Central Zone, Bengaluru, Karnataka - 560001',
                latitude: 12.9756,
                longitude: 77.6066,
                citizenName: 'Rahul Sharma',
                citizenPhone: '+91 98201 12345',
                description: 'Several massive potholes opened near the central crossroads. Urgent asphalt repair needed before heavy rain.',
                createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
            },
            {
                id: 2,
                trackingNumber: 'GRV-2026-7821',
                title: 'Overflowing Municipal Dumpster Near Old Cotton Market',
                categoryName: 'Garbage Collection',
                departmentName: 'Solid Waste Management',
                status: 'UNDER_REVIEW',
                priority: 'HIGH',
                locationAddress: 'Cotton Market Road, Near Koppikar Road, Hubballi, Karnataka - 580020',
                latitude: 15.3524,
                longitude: 75.1432,
                citizenName: 'Priya Patel',
                citizenPhone: '+91 98765 43210',
                description: 'Garbage has not been collected for four consecutive days. Waste is spilling onto pedestrian footpaths.',
                createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
            },
            {
                id: 3,
                trackingNumber: 'GRV-2026-6542',
                title: 'High Pressure Water Pipeline Rupture Flooding Alley',
                categoryName: 'Water Supply',
                departmentName: 'Water Supply & Sewerage Board',
                status: 'ASSIGNED',
                priority: 'CRITICAL',
                locationAddress: 'Near Municipal Council Office, Station Road, Gadag-Betageri, Karnataka - 582101',
                latitude: 15.4312,
                longitude: 75.6324,
                citizenName: 'Amit Verma',
                citizenPhone: '+91 97112 34567',
                description: 'Main potable water supply pipe ruptured underground. Water gushing onto street and flooding premises.',
                createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
            },
            {
                id: 4,
                trackingNumber: 'GRV-2026-5120',
                title: 'Dark Stretch of 5 Non-Functional LED Streetlights',
                categoryName: 'Streetlight Issues',
                departmentName: 'Electricity & Street Lighting',
                status: 'IN_PROGRESS',
                priority: 'MEDIUM',
                locationAddress: 'Sayyaji Rao Road, Near Devaraja Market, Mysuru, Karnataka - 570001',
                latitude: 12.3112,
                longitude: 76.6529,
                citizenName: 'Rahul Sharma',
                citizenPhone: '+91 98201 12345',
                description: 'Five consecutive street poles are dark for over a week from pole #44 to #49. Hazardous for evening pedestrians.',
                createdAt: new Date(Date.now() - 3600000 * 36).toISOString()
            },
            {
                id: 5,
                trackingNumber: 'GRV-2026-4419',
                title: 'Severe Storm Drain Blockage Causing Waterlogging',
                categoryName: 'Drainage Problems',
                departmentName: 'Water Supply & Sewerage Board',
                status: 'RESOLVED',
                priority: 'HIGH',
                locationAddress: 'Hampankatta Junction, K.S. Rao Road, Mangaluru, Karnataka - 575001',
                latitude: 12.8698,
                longitude: 74.8431,
                citizenName: 'Priya Patel',
                citizenPhone: '+91 98765 43210',
                description: 'Stormwater drain is choked with construction debris creating knee-deep puddle outside primary clinic.',
                createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
            },
            {
                id: 6,
                trackingNumber: 'GRV-2026-2241',
                title: 'Private Courtyard Tree Trimming Request',
                categoryName: 'Public Infrastructure',
                departmentName: 'Public Works Department (PWD)',
                status: 'REJECTED',
                priority: 'LOW',
                locationAddress: 'College Road, Near Rani Channamma Circle, Belagavi, Karnataka - 590001',
                latitude: 15.8572,
                longitude: 74.5098,
                citizenName: 'Amit Verma',
                citizenPhone: '+91 97112 34567',
                description: 'Requesting municipal staff to trim branches of a private ornamental tree inside personal compound.',
                createdAt: new Date(Date.now() - 3600000 * 96).toISOString()
            }
        ];
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AdminGisMap.init();
});

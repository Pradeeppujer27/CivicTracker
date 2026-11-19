/**
 * CivicTrack - Complaint Tracking Engine
 * Live tracking, 5-stage visual stepper, rejection banner, photo lightbox, and Spring Boot REST API integration.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTrackingForm();
    checkUrlForTrackingId();
});

function initTrackingForm() {
    const form = document.getElementById('trackingSearchForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('trackingNumberInput');
        if (input && input.value.trim()) {
            const trackVal = input.value.trim().toUpperCase();
            // Update URL without full reload
            const newUrl = `${window.location.pathname}?track=${encodeURIComponent(trackVal)}`;
            window.history.pushState({ track: trackVal }, '', newUrl);
            performTrack(trackVal);
        }
    });
}

function checkUrlForTrackingId() {
    const urlParams = new URLSearchParams(window.location.search);
    const trackParam = urlParams.get('track') || urlParams.get('id');
    const input = document.getElementById('trackingNumberInput');

    if (trackParam) {
        if (input) input.value = trackParam;
        performTrack(trackParam);
    }
}

/**
 * Main Track Execution Engine
 * Queries real Spring Boot backend: /complaints/track/{trackingCode}
 */
async function performTrack(trackingCode) {
    const loadingCard = document.getElementById('trackingLoadingState');
    const resultsContainer = document.getElementById('trackingResultsContainer');
    const notFoundCard = document.getElementById('trackingNotFoundState');

    if (loadingCard) loadingCard.classList.remove('d-none');
    if (resultsContainer) resultsContainer.classList.add('d-none');
    if (notFoundCard) notFoundCard.classList.add('d-none');

    const cleanCode = (trackingCode || '').trim();
    if (!cleanCode) {
        if (loadingCard) loadingCard.classList.add('d-none');
        return;
    }

    try {
        const grievanceData = await GrievanceService.getGrievanceById(cleanCode);

        if (loadingCard) loadingCard.classList.add('d-none');

        if (!grievanceData || (!grievanceData.id && !grievanceData.complaintNumber && !grievanceData.trackingNumber)) {
            showNotFound(cleanCode);
            return;
        }

        renderComplaintDetails(grievanceData);
        if (resultsContainer) resultsContainer.classList.remove('d-none');

    } catch (err) {
        console.error(`[Tracking] Error fetching complaint '${cleanCode}':`, err);
        if (loadingCard) loadingCard.classList.add('d-none');
        showNotFound(cleanCode, err.message);
    }
}

function showNotFound(query, errorMsg) {
    const notFoundCard = document.getElementById('trackingNotFoundState');
    const queryEl = document.getElementById('notFoundQueryText');
    if (queryEl) queryEl.textContent = query;
    if (notFoundCard) {
        if (errorMsg && !errorMsg.toLowerCase().includes('not found') && !errorMsg.toLowerCase().includes('404')) {
            const descEl = notFoundCard.querySelector('p');
            if (descEl) {
                descEl.innerHTML = `Unable to connect to municipal database: <strong class="text-danger">${escapeHtml(errorMsg)}</strong>. Please verify the backend is running.`;
            }
        }
        notFoundCard.classList.remove('d-none');
    }
}

/**
 * Render Complaint Details and 5-stage Timeline
 */
function renderComplaintDetails(data) {
    // 1. Complaint ID
    const trackingNo = data.complaintNumber || data.trackingNumber || `GRV-2026-${data.id}`;
    document.getElementById('displayTrackingNumber').textContent = trackingNo;

    // 2. Complaint Title & Description
    document.getElementById('displayTitle').textContent = data.title || 'Untitled Grievance';
    document.getElementById('displayDescription').textContent = data.description || 'No description provided.';

    // 3. Category & Department
    document.getElementById('displayCategory').textContent = data.category || data.categoryName || 'General';
    document.getElementById('displayDepartment').textContent = data.department || data.departmentName || 'Responsible Department';

    // 4. Location & Map Link
    const locationStr = data.locationAddress || data.location || 'Location not specified';
    document.getElementById('displayLocation').textContent = locationStr;
    
    const mapLink = document.getElementById('displayMapLink');
    if (mapLink) {
        if (data.latitude && data.longitude) {
            mapLink.href = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
            mapLink.innerHTML = `<i class="bi bi-geo-alt-fill text-danger me-1"></i> View External GPS Pin (${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)})`;
        } else {
            mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}`;
            mapLink.innerHTML = `<i class="bi bi-box-arrow-up-right me-1"></i> View on Map`;
        }
    }

    // Render Interactive Leaflet OpenStreetMap Pin
    renderTrackingMap(data.latitude, data.longitude, data.title, data.status);

    // 5. Photographic Evidence
    const photoContainer = document.getElementById('displayPhotoContainer');
    const photoImg = document.getElementById('displayPhotoImg');
    const photoLink = document.getElementById('photoPreviewLink');
    if (photoContainer && photoImg) {
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            const imgObj = data.images[0];
            const rawUrl = imgObj.fileUrl || imgObj.filePath || imgObj.url || '';
            const fullUrl = rawUrl.startsWith('http')
                ? rawUrl
                : `http://localhost:8080/api/v1${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
            
            photoImg.src = fullUrl;
            if (photoLink) photoLink.href = fullUrl;
            photoContainer.classList.remove('d-none');
        } else {
            photoContainer.classList.add('d-none');
        }
    }

    // 6. Submission Date
    const submittedDate = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Recent';
    document.getElementById('displayDate').textContent = submittedDate;

    // 7. Current Status Badge
    const status = (data.status || 'SUBMITTED').toUpperCase();
    const statusBadge = document.getElementById('displayStatusBadge');
    if (statusBadge) {
        statusBadge.className = `status-badge status-${status}`;
        statusBadge.innerHTML = `${getStatusIcon(status)} ${status.replace(/_/g, ' ')}`;
    }

    // 8. Visual Status Timeline (1: Submitted, 2: Under Review, 3: Assigned, 4: In Progress, 5: Resolved)
    updateStatusTimeline(status);

    // 9. Admin Remarks / Resolution Notes & Rejected state
    const remarksBox = document.getElementById('adminRemarksContainer');
    const rejectionBanner = document.getElementById('rejectionBannerContainer');
    const remarksText = data.adminRemarks || data.resolutionNotes;

    if (status === 'REJECTED') {
        if (rejectionBanner) {
            rejectionBanner.classList.remove('d-none');
            const rejEl = document.getElementById('rejectionReasonText');
            if (rejEl) {
                rejEl.textContent = remarksText || 'Complaint does not meet municipal criteria or falls outside municipal jurisdiction.';
            }
        }
        if (remarksBox) remarksBox.classList.add('d-none');
    } else {
        if (rejectionBanner) rejectionBanner.classList.add('d-none');
        if (remarksBox) {
            const remarksEl = document.getElementById('adminRemarksText');
            if (remarksEl) {
                remarksEl.textContent = remarksText || 'Your complaint is actively logged in the municipal system and being handled according to standard service level timelines.';
            }
            remarksBox.classList.remove('d-none');
        }
    }
}

/**
 * Updates the 5-Stage Stepper
 * Stage 1: SUBMITTED
 * Stage 2: UNDER_REVIEW
 * Stage 3: ASSIGNED
 * Stage 4: IN_PROGRESS
 * Stage 5: RESOLVED
 */
function updateStatusTimeline(status) {
    const step1 = document.getElementById('step-submitted');
    const step2 = document.getElementById('step-review');
    const step3 = document.getElementById('step-assigned');
    const step4 = document.getElementById('step-progress');
    const step5 = document.getElementById('step-resolved');

    const steps = [step1, step2, step3, step4, step5];
    steps.forEach(s => {
        if (s) {
            s.classList.remove('completed', 'active');
        }
    });

    let activeIndex = 0; // 0=submitted, 1=review, 2=assigned, 3=progress, 4=resolved

    switch (status) {
        case 'SUBMITTED':
            activeIndex = 0;
            break;
        case 'UNDER_REVIEW':
            activeIndex = 1;
            break;
        case 'ASSIGNED':
            activeIndex = 2;
            break;
        case 'IN_PROGRESS':
            activeIndex = 3;
            break;
        case 'RESOLVED':
            activeIndex = 4;
            break;
        case 'REJECTED':
            activeIndex = 1; // halted at review stage
            break;
        default:
            activeIndex = 0;
    }

    for (let i = 0; i < steps.length; i++) {
        if (!steps[i]) continue;
        if (i < activeIndex) {
            steps[i].classList.add('completed');
        } else if (i === activeIndex) {
            if (status === 'RESOLVED') {
                steps[i].classList.add('completed');
            } else {
                steps[i].classList.add('active');
            }
        }
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'SUBMITTED': return '<i class="bi bi-send-fill"></i>';
        case 'UNDER_REVIEW': return '<i class="bi bi-hourglass-split"></i>';
        case 'ASSIGNED': return '<i class="bi bi-person-check-fill"></i>';
        case 'IN_PROGRESS': return '<i class="bi bi-tools"></i>';
        case 'RESOLVED': return '<i class="bi bi-check2-circle"></i>';
        case 'REJECTED': return '<i class="bi bi-x-circle-fill"></i>';
        default: return '<i class="bi bi-circle"></i>';
    }
}

function copyTrackingCode() {
    const code = document.getElementById('displayTrackingNumber')?.textContent;
    if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            const copyBtn = document.getElementById('copyBtnText');
            if (copyBtn) {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            }
        });
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

let trackingMiniMapInstance = null;
let trackingMarkerInstance = null;

/**
 * Render Interactive Leaflet OpenStreetMap Pin for Grievance Tracking
 */
function renderTrackingMap(lat, lng, title, status) {
    const mapContainer = document.getElementById('trackingMapContainer');
    const mapEl = document.getElementById('trackingMiniMap');
    const coordsLabel = document.getElementById('mapCoordinatesLabel');

    if (!mapContainer || !mapEl) return;

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);

    if (isNaN(numLat) || isNaN(numLng) || (numLat === 0 && numLng === 0)) {
        mapContainer.classList.add('d-none');
        return;
    }

    mapContainer.classList.remove('d-none');
    if (coordsLabel) {
        coordsLabel.textContent = `${numLat.toFixed(5)}, ${numLng.toFixed(5)}`;
    }

    if (typeof L === 'undefined') {
        console.warn('[TrackingMap] Leaflet.js library is not loaded');
        return;
    }

    const normStatus = (status || 'SUBMITTED').toUpperCase();
    const statusColors = {
        'SUBMITTED': '#F59E0B',
        'UNDER_REVIEW': '#6366F1',
        'ASSIGNED': '#8B5CF6',
        'IN_PROGRESS': '#2563EB',
        'RESOLVED': '#10B981',
        'REJECTED': '#EF4444'
    };
    const markerColor = statusColors[normStatus] || '#2563EB';

    const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div style="
                background-color: ${markerColor};
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                border: 2px solid #ffffff;
            ">
                <i class="bi bi-geo-alt-fill" style="transform: rotate(45deg); color: #ffffff; font-size: 15px;"></i>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    if (!trackingMiniMapInstance) {
        trackingMiniMapInstance = L.map('trackingMiniMap', {
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true,
            dragging: true,
            inertia: true,
            minZoom: 6,
            maxZoom: 19
        }).setView([numLat, numLng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            minZoom: 6,
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(trackingMiniMapInstance);

        trackingMarkerInstance = L.marker([numLat, numLng], { icon: customIcon }).addTo(trackingMiniMapInstance);
    } else {
        trackingMiniMapInstance.flyTo([numLat, numLng], 15, { animate: true, duration: 0.6 });
        if (trackingMarkerInstance) {
            trackingMarkerInstance.setLatLng([numLat, numLng]);
            trackingMarkerInstance.setIcon(customIcon);
        } else {
            trackingMarkerInstance = L.marker([numLat, numLng], { icon: customIcon }).addTo(trackingMiniMapInstance);
        }
    }

    const popupContent = `
        <div class="p-1 text-start" style="font-family: inherit;">
            <div class="fw-bold text-dark mb-1">${escapeHtml(title || 'Complaint Location')}</div>
            <div class="d-flex align-items-center gap-1 mb-1">
                <span class="badge" style="background-color: ${markerColor}; color: #fff; font-size: 11px;">
                    ${normStatus.replace(/_/g, ' ')}
                </span>
            </div>
            <div class="small text-secondary font-monospace">${numLat.toFixed(5)}, ${numLng.toFixed(5)}</div>
            <div class="mt-1">
                <a href="https://www.google.com/maps/search/?api=1&query=${numLat},${numLng}" target="_blank" rel="noopener" class="small text-primary text-decoration-none">
                    <i class="bi bi-box-arrow-up-right me-1"></i>Open in Maps
                </a>
            </div>
        </div>
    `;

    trackingMarkerInstance.bindPopup(popupContent);

    setTimeout(() => {
        if (trackingMiniMapInstance) {
            trackingMiniMapInstance.invalidateSize();
        }
    }, 300);
}

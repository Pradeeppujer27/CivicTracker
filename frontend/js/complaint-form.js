/**
 * CivicTrack Submit Complaint Logic
 * Form Validation, Image Preview & Removal, GPS Geolocation & Spring Boot Multipart Form-Data Submission.
 */

document.addEventListener('DOMContentLoaded', () => {
    initCategoryPreselect();
    initImageUploadAndPreview();
    initInteractiveMap();
    initGpsDetection();
    initComplaintFormSubmission();
});

// Category ID mapping
const CATEGORY_MAP = {
    '1': 'Road Damage',
    '2': 'Drainage',
    '3': 'Water Supply',
    '4': 'Garbage Collection',
    '5': 'Streetlight',
    '6': 'Public Infrastructure',
    '7': 'Other'
};

let selectedPhotoFile = null;
let detectedLatitude = null;
let detectedLongitude = null;

/**
 * 1. Preselect category from URL query param if present
 */
function initCategoryPreselect() {
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat');
    if (catParam) {
        const catSelect = document.getElementById('complaintCategory');
        if (catSelect) {
            catSelect.value = catParam;
        }
    }
}

/**
 * 2. Image Upload, Drag-and-Drop, Preview & Removal
 */
function initImageUploadAndPreview() {
    const fileInput = document.getElementById('photoFileInput');
    const dropZone = document.getElementById('photoUploadZone');
    const previewWrapper = document.getElementById('photoPreviewContainer');
    const previewImg = document.getElementById('previewThumbnail');
    const previewName = document.getElementById('previewFileName');
    const previewSize = document.getElementById('previewFileSize');
    const removeBtn = document.getElementById('removePhotoBtn');

    if (!fileInput || !dropZone) return;

    // Click on dropzone opens native file picker
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleSelectedFile(e.target.files[0]);
        }
    });

    // Drag and Drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleSelectedFile(e.dataTransfer.files[0]);
        }
    });

    // Remove photo button
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearSelectedPhoto();
        });
    }

    function handleSelectedFile(file) {
        // Validate MIME type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Invalid file format. Please upload a JPEG, PNG, or WEBP photo.');
            clearSelectedPhoto();
            return;
        }

        // Validate Size (max 10 MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Photo is too large. Maximum allowed size is 10 MB.');
            clearSelectedPhoto();
            return;
        }

        selectedPhotoFile = file;

        // Render preview thumbnail
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewName.textContent = file.name;
            previewSize.textContent = formatBytes(file.size);

            dropZone.classList.add('d-none');
            previewWrapper.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    }

    function clearSelectedPhoto() {
        selectedPhotoFile = null;
        fileInput.value = '';
        previewImg.src = '';
        previewName.textContent = '';
        previewSize.textContent = '';

        previewWrapper.classList.add('d-none');
        dropZone.classList.remove('d-none');
    }
}

let complaintMap = null;
let mapMarker = null;
let accuracyCircle = null;

/**
 * 3A. Initialize Interactive Leaflet.js & OpenStreetMap Pinpoint Map
 */
function initInteractiveMap() {
    const mapContainer = document.getElementById('complaintMap');
    if (!mapContainer || typeof L === 'undefined') return;

    // Default Civic Center Coordinates (Karnataka - Bengaluru State Capital / Central Karnataka 12.9716, 77.5946)
    const defaultLat = 12.9716;
    const defaultLng = 77.5946;

    complaintMap = L.map('complaintMap', {
        zoomControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        dragging: true,
        inertia: true,
        inertiaDeceleration: 3000,
        minZoom: 6,
        maxZoom: 19
    }).setView([defaultLat, defaultLng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 6,
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(complaintMap);

    // Interactive Manual Location Pinning: Click on map to place or reposition pin
    complaintMap.on('click', (e) => {
        setMapLocation(e.latlng.lat, e.latlng.lng, true);
    });

    // Fix map rendering and sliding when container is resized
    window.addEventListener('resize', () => {
        if (complaintMap) complaintMap.invalidateSize();
    });

    setTimeout(() => {
        if (complaintMap) complaintMap.invalidateSize();
    }, 350);
}

/**
 * Set and sync map pin, coordinates, and address
 */
function setMapLocation(lat, lng, isManual = false, accuracy = null) {
    detectedLatitude = lat;
    detectedLongitude = lng;

    const latField = document.getElementById('detectedLatitude');
    const lngField = document.getElementById('detectedLongitude');
    const addressInput = document.getElementById('complaintLocation');

    if (latField) latField.value = lat;
    if (lngField) lngField.value = lng;

    if (!complaintMap || typeof L === 'undefined') return;

    // Remove previous accuracy ring if any
    if (accuracyCircle) {
        complaintMap.removeLayer(accuracyCircle);
        accuracyCircle = null;
    }

    if (accuracy && accuracy > 0 && !isManual) {
        accuracyCircle = L.circle([lat, lng], {
            radius: Math.min(accuracy, 500),
            color: '#2563EB',
            fillColor: '#3B82F6',
            fillOpacity: 0.15,
            weight: 1
        }).addTo(complaintMap);
    }

    // Custom pulse-style icon or standard marker
    if (!mapMarker) {
        mapMarker = L.marker([lat, lng], {
            draggable: true,
            title: 'Drag to adjust complaint location'
        }).addTo(complaintMap);

        // Marker dragend listener for manual fine-tuning
        mapMarker.on('dragend', (event) => {
            const pos = event.target.getLatLng();
            setMapLocation(pos.lat, pos.lng, true);
        });
    } else {
        mapMarker.setLatLng([lat, lng]);
    }

    const popupHtml = isManual
        ? `<div class="p-1"><strong>📍 Manually Selected Pin</strong><br><small class="text-secondary">${lat.toFixed(5)}, ${lng.toFixed(5)}</small><br><span class="badge bg-primary-subtle text-primary mt-1">Drag to fine-tune</span></div>`
        : `<div class="p-1"><strong>🎯 GPS Locked Location</strong><br><small class="text-secondary">${lat.toFixed(5)}, ${lng.toFixed(5)}</small><br><span class="badge bg-success-subtle text-success mt-1">Drag to protect privacy</span></div>`;

    mapMarker.bindPopup(popupHtml).openPopup();
    
    // Smooth sliding without jarring zoom snap for manual pin adjustments
    if (!isManual) {
        complaintMap.flyTo([lat, lng], Math.max(complaintMap.getZoom(), 15), {
            animate: true,
            duration: 0.8
        });
    } else {
        complaintMap.panTo([lat, lng], {
            animate: true,
            duration: 0.4
        });
    }

    // Update GPS status badge
    const badgeText = isManual
        ? `Manual Map Pin Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
        : `GPS Locked: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${Math.round(accuracy || 15)}m)`;
    updateGpsBadge('active', badgeText);

    // Reverse geocode via OpenStreetMap Nominatim with fallback
    reverseGeocodeOsm(lat, lng).then(addr => {
        if (addressInput && (!addressInput.value.trim() || isManual)) {
            addressInput.value = addr;
        }
    });
}

/**
 * Reverse Geocode via OpenStreetMap Nominatim
 */
async function reverseGeocodeOsm(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
                return data.display_name;
            }
        }
    } catch (e) {
        console.warn('[ComplaintForm] Nominatim reverse-geocode unreachable:', e);
    }
    return `Geo-Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Please add specific street or landmark)`;
}

/**
 * 3B. Browser GPS Geolocation API Detection with Permission Handling
 */
function initGpsDetection() {
    const detectBtn = document.getElementById('detectLocationBtn');

    if (!detectBtn) return;

    detectBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            updateGpsBadge('error', 'Geolocation is not supported by your browser.');
            return;
        }

        detectBtn.disabled = true;
        detectBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Locating...';
        updateGpsBadge('waiting', 'Requesting satellite GPS coordinates...');

        // Check permission state if browser supports Permissions API
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
                if (permissionStatus.state === 'denied') {
                    console.warn('[GPS] Location permission was previously denied.');
                }
            }).catch(() => {});
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                setMapLocation(lat, lng, false, accuracy);

                detectBtn.disabled = false;
                detectBtn.innerHTML = '<i class="bi bi-geo-alt-fill text-success"></i> Location Locked';
            },
            (error) => {
                detectBtn.disabled = false;
                detectBtn.innerHTML = '<i class="bi bi-crosshair me-1"></i> Detect My Location';

                let errorMsg = 'Could not acquire GPS position.';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = 'Location permission was denied. You can click anywhere on the OpenStreetMap below to place the pin manually.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMsg = 'GPS signal unavailable. Please click on the interactive map to choose the location.';
                } else if (error.code === error.TIMEOUT) {
                    errorMsg = 'GPS signal timed out. Please click on the map to pin your location.';
                }

                updateGpsBadge('error', errorMsg);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

function updateGpsBadge(state, text) {
    const badge = document.getElementById('gpsStatusBadge');
    if (!badge) return;
    badge.className = 'gps-status-badge';
    if (state === 'active') {
        badge.classList.add('active');
        badge.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> <span>${text}</span>`;
    } else if (state === 'error') {
        badge.classList.add('bg-danger-subtle', 'text-danger');
        badge.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger me-1"></i> <span>${text}</span>`;
    } else {
        badge.classList.add('waiting');
        badge.innerHTML = `<span class="spinner-border spinner-border-sm text-secondary me-1"></span> <span>${text}</span>`;
    }
    badge.classList.remove('d-none');
}

/**
 * 4. Multipart Form Submission & Comprehensive Validation
 */
function initComplaintFormSubmission() {
    const form = document.getElementById('submitComplaintForm');
    if (!form) return;

    const alertBox = document.getElementById('submissionAlertBox');
    const submitBtn = document.getElementById('submitGrievanceBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert(alertBox);

        // Validation fields
        const titleInput = document.getElementById('complaintTitle');
        const categorySelect = document.getElementById('complaintCategory');
        const descriptionInput = document.getElementById('complaintDescription');
        const locationInput = document.getElementById('complaintLocation');

        let isValid = true;

        // Title validation
        const title = titleInput.value.trim();
        if (!title || title.length < 5) {
            setFieldError(titleInput, 'titleError', 'Please provide a clear title (at least 5 characters).');
            isValid = false;
        } else {
            setFieldSuccess(titleInput, 'titleError');
        }

        // Category validation
        const categoryId = categorySelect.value;
        if (!categoryId) {
            setFieldError(categorySelect, 'categoryError', 'Please select a complaint category.');
            isValid = false;
        } else {
            setFieldSuccess(categorySelect, 'categoryError');
        }

        // Description validation
        const description = descriptionInput.value.trim();
        if (!description || description.length < 15) {
            setFieldError(descriptionInput, 'descriptionError', 'Please provide a detailed description (minimum 15 characters).');
            isValid = false;
        } else {
            setFieldSuccess(descriptionInput, 'descriptionError');
        }

        // Location address validation
        const locationAddress = locationInput.value.trim();
        if (!locationAddress || locationAddress.length < 5) {
            setFieldError(locationInput, 'locationError', 'Please enter a valid street address or landmark.');
            isValid = false;
        } else {
            setFieldSuccess(locationInput, 'locationError');
        }

        if (!isValid) {
            showFormAlert(alertBox, 'danger', 'Please complete all required fields with accurate information.');
            return;
        }

        // Authentication Check
        if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
            showFormAlert(alertBox, 'warning', `
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                        <strong>Authentication Required:</strong> You must be signed in as a registered citizen to file an official grievance.
                    </div>
                    <a href="login.html" class="btn btn-sm btn-warning text-dark fw-bold px-3">
                        <i class="bi bi-box-arrow-in-right me-1"></i> Sign In to Submit
                    </a>
                </div>
            `);
            return;
        }

        // Construct Multipart FormData payload
        const formData = new FormData();
        formData.append('title', title);
        formData.append('categoryId', categoryId);
        formData.append('category', CATEGORY_MAP[categoryId] || 'Other');
        formData.append('description', description);
        formData.append('locationAddress', locationAddress);
        formData.append('priority', 'MEDIUM');

        if (detectedLatitude) {
            formData.append('latitude', detectedLatitude);
        }
        if (detectedLongitude) {
            formData.append('longitude', detectedLongitude);
        }

        if (selectedPhotoFile) {
            formData.append('file', selectedPhotoFile);
        }

        // Send to Spring Boot Backend
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Submitting to Municipal Portal...';

        try {
            const response = await GrievanceService.submitGrievance(formData);

            // Verified success from real backend
            const trackingNum = response.trackingNumber || 'Assigned';
            const deptName = response.departmentName || 'Responsible Municipal Department';

            showFormAlert(alertBox, 'success', `
                <div class="py-2">
                    <h5 class="fw-bold mb-1 text-success"><i class="bi bi-check-circle-fill me-2"></i> Grievance Submitted Successfully!</h5>
                    <p class="mb-2">Your complaint has been logged and auto-routed to the <strong>${deptName}</strong>.</p>
                    <div class="p-2 bg-white rounded border d-inline-block mb-3">
                        <span class="text-muted small">Tracking Reference: </span>
                        <strong class="text-primary fs-6 font-monospace">${trackingNum}</strong>
                    </div>
                    <div>
                        <a href="grievance-details.html?id=${response.id || trackingNum}" class="btn btn-sm btn-primary fw-semibold me-2">
                            <i class="bi bi-eye me-1"></i> View Timeline Details
                        </a>
                        <a href="citizen-dashboard.html" class="btn btn-sm btn-outline-secondary">
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            `);

            form.reset();
            detectedLatitude = null;
            detectedLongitude = null;
            if (mapMarker && complaintMap) {
                complaintMap.removeLayer(mapMarker);
                mapMarker = null;
            }
            if (accuracyCircle && complaintMap) {
                complaintMap.removeLayer(accuracyCircle);
                accuracyCircle = null;
            }
            document.getElementById('gpsStatusBadge').classList.add('d-none');
            document.getElementById('photoPreviewContainer').classList.add('d-none');
            document.getElementById('photoUploadZone').classList.remove('d-none');

            // Scroll alert into view
            alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

        } catch (error) {
            console.error('Submission error:', error);
            showFormAlert(alertBox, 'danger', `
                <strong>Submission Failed:</strong> ${error.message || 'Could not connect to the grievance server. Ensure the Spring Boot backend is running on port 8080.'}
            `);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send-fill me-2"></i> Submit Complaint';
        }
    });
}

function setFieldError(element, errorId, message) {
    element.classList.add('is-invalid');
    element.classList.remove('is-valid');
    const errEl = document.getElementById(errorId);
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
    }
}

function setFieldSuccess(element, errorId) {
    element.classList.remove('is-invalid');
    element.classList.add('is-valid');
    const errEl = document.getElementById(errorId);
    if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
    }
}

function showFormAlert(alertBox, type, htmlContent) {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} border-0 shadow-sm mb-4`;
    alertBox.innerHTML = htmlContent;
    alertBox.classList.remove('d-none');
}

function hideAlert(alertBox) {
    if (!alertBox) return;
    alertBox.classList.add('d-none');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * CivicTrack Grievance Module
 * Frontend service layer for fetching, filtering, and reporting civic grievances.
 */
const GrievanceService = {
    /**
     * Submit a new grievance with optional file attachment
     */
    async submitGrievance(formData) {
        return await Api.upload('/grievances', formData);
    },

    /**
     * Get all grievances for current citizen
     */
    async getMyGrievances() {
        return await Api.get('/grievances/my');
    },

    /**
     * Get all grievances (Official / Admin view with optional filters)
     */
    async getAllGrievances(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `/grievances?${queryParams}` : '/grievances';
        return await Api.get(url);
    },

    /**
     * Get details of a single grievance by ID or tracking number
     */
    async getGrievanceById(idOrTracking) {
        if (typeof idOrTracking === 'string' && (isNaN(idOrTracking) || idOrTracking.startsWith('GRV'))) {
            return await Api.get(`/grievances/track/${encodeURIComponent(idOrTracking)}`);
        }
        return await Api.get(`/grievances/${idOrTracking}`);
    },

    /**
     * Update status and add remarks (Official / Admin)
     */
    async updateStatus(id, status, remarks) {
        return await Api.put(`/grievances/${id}/status`, { status, remarks });
    },

    /**
     * Assign grievance to a municipal department (Admin)
     */
    async assignDepartment(id, departmentId, remarks, departmentName) {
        const body = {
            departmentId: departmentId,
            department: departmentName || (typeof departmentId === 'string' && isNaN(departmentId) ? departmentId : undefined),
            remarks: remarks
        };
        return await Api.put(`/grievances/${id}/assign`, body);
    },

    /**
     * Fetch timeline audit history of a grievance
     */
    async getGrievanceHistory(id) {
        return await Api.get(`/grievances/${id}/history`);
    },

    /**
     * Fetch active categories
     */
    async getCategories() {
        return await Api.get('/departments/categories');
    },

    /**
     * Fetch all municipal departments
     */
    async getDepartments() {
        return await Api.get('/departments');
    }
};

package com.civictrack.dto.grievance;

import com.civictrack.entity.GrievanceStatus;
import jakarta.validation.constraints.NotNull;

public class StatusUpdateRequest {

    @NotNull(message = "Status is required")
    private GrievanceStatus status;

    private String remarks;

    public StatusUpdateRequest() {}

    public StatusUpdateRequest(GrievanceStatus status, String remarks) {
        this.status = status;
        this.remarks = remarks;
    }

    public GrievanceStatus getStatus() {
        return status;
    }

    public void setStatus(GrievanceStatus status) {
        this.status = status;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}

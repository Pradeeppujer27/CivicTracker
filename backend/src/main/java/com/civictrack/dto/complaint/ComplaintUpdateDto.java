package com.civictrack.dto.complaint;

import java.time.LocalDateTime;

public class ComplaintUpdateDto {
    private Long id;
    private String previousStatus;
    private String currentStatus;
    private String updatedByName;
    private String remarks;
    private LocalDateTime createdAt;

    public ComplaintUpdateDto() {}

    public ComplaintUpdateDto(Long id, String previousStatus, String currentStatus, String updatedByName, String remarks, LocalDateTime createdAt) {
        this.id = id;
        this.previousStatus = previousStatus;
        this.currentStatus = currentStatus;
        this.updatedByName = updatedByName;
        this.remarks = remarks;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPreviousStatus() {
        return previousStatus;
    }

    public String getOldStatus() {
        return previousStatus;
    }

    public void setPreviousStatus(String previousStatus) {
        this.previousStatus = previousStatus;
    }

    public String getCurrentStatus() {
        return currentStatus;
    }

    public String getNewStatus() {
        return currentStatus;
    }

    public void setCurrentStatus(String currentStatus) {
        this.currentStatus = currentStatus;
    }

    public String getUpdatedByName() {
        return updatedByName;
    }

    public String getChangedByName() {
        return updatedByName;
    }

    public void setUpdatedByName(String updatedByName) {
        this.updatedByName = updatedByName;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

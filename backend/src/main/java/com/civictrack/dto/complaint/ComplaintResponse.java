package com.civictrack.dto.complaint;

import com.civictrack.entity.ComplaintStatus;
import com.civictrack.entity.Priority;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ComplaintResponse {

    private Long id;
    private String complaintNumber;
    private Long userId;
    private String citizenName;
    private String citizenEmail;
    private String citizenPhone;
    private String citizenAddress;
    private String residentAccountNumber;
    private String title;
    private String description;
    private String category;
    private String department;
    private Priority priority;
    private ComplaintStatus status;
    private String locationAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String adminRemarks;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ComplaintImageDto> images = new ArrayList<>();
    private List<ComplaintUpdateDto> updates = new ArrayList<>();

    public ComplaintResponse() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getComplaintNumber() {
        return complaintNumber;
    }

    public String getTrackingNumber() {
        return complaintNumber;
    }

    public void setComplaintNumber(String complaintNumber) {
        this.complaintNumber = complaintNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.complaintNumber = trackingNumber;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getCitizenName() {
        return citizenName;
    }

    public void setCitizenName(String citizenName) {
        this.citizenName = citizenName;
    }

    public String getCitizenEmail() {
        return citizenEmail;
    }

    public void setCitizenEmail(String citizenEmail) {
        this.citizenEmail = citizenEmail;
    }

    public String getCitizenPhone() {
        return citizenPhone;
    }

    public void setCitizenPhone(String citizenPhone) {
        this.citizenPhone = citizenPhone;
    }

    public String getCitizenAddress() {
        return citizenAddress;
    }

    public void setCitizenAddress(String citizenAddress) {
        this.citizenAddress = citizenAddress;
    }

    public String getResidentAccountNumber() {
        return residentAccountNumber != null ? residentAccountNumber : (userId != null ? String.format("CT-RES-%05d", userId) : null);
    }

    public void setResidentAccountNumber(String residentAccountNumber) {
        this.residentAccountNumber = residentAccountNumber;
    }

    public String getCitizenAccountNumber() {
        return getResidentAccountNumber();
    }

    public void setCitizenAccountNumber(String citizenAccountNumber) {
        this.residentAccountNumber = citizenAccountNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public String getCategoryName() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public void setCategoryName(String categoryName) {
        this.category = categoryName;
    }

    public String getDepartment() {
        return department;
    }

    public String getDepartmentName() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public void setDepartmentName(String departmentName) {
        this.department = departmentName;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public ComplaintStatus getStatus() {
        return status;
    }

    public void setStatus(ComplaintStatus status) {
        this.status = status;
    }

    public String getLocationAddress() {
        return locationAddress;
    }

    public void setLocationAddress(String locationAddress) {
        this.locationAddress = locationAddress;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public String getAdminRemarks() {
        return adminRemarks;
    }

    public String getResolutionNotes() {
        return adminRemarks;
    }

    public void setAdminRemarks(String adminRemarks) {
        this.adminRemarks = adminRemarks;
    }

    public void setResolutionNotes(String resolutionNotes) {
        this.adminRemarks = resolutionNotes;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<ComplaintImageDto> getImages() {
        return images;
    }

    public void setImages(List<ComplaintImageDto> images) {
        this.images = images;
    }

    public List<ComplaintUpdateDto> getUpdates() {
        return updates;
    }

    public void setUpdates(List<ComplaintUpdateDto> updates) {
        this.updates = updates;
    }
}

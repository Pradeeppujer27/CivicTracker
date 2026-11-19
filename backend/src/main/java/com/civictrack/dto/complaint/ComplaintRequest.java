package com.civictrack.dto.complaint;

import com.civictrack.entity.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class ComplaintRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Size(min = 10, message = "Description must be at least 10 characters")
    private String description;

    private String category;
    private Long categoryId;
    private String department;

    private Priority priority = Priority.MEDIUM;

    @NotBlank(message = "Location address is required")
    private String locationAddress;

    private BigDecimal latitude;
    private BigDecimal longitude;

    public ComplaintRequest() {}

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
        if (category != null && !category.isBlank()) {
            return category;
        }
        if (categoryId != null) {
            return switch (categoryId.intValue()) {
                case 1 -> "Road Damage";
                case 2 -> "Drainage Problems";
                case 3 -> "Water Supply";
                case 4 -> "Garbage Collection";
                case 5 -> "Streetlight Issues";
                case 6 -> "Public Infrastructure";
                default -> "Other";
            };
        }
        return "Other";
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public Priority getPriority() {
        return priority != null ? priority : Priority.MEDIUM;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
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
}

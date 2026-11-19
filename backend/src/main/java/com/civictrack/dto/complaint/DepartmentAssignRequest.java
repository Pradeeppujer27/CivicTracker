package com.civictrack.dto.complaint;

public class DepartmentAssignRequest {

    private String department;
    private Long departmentId;
    private String remarks;

    public DepartmentAssignRequest() {}

    public DepartmentAssignRequest(String department, String remarks) {
        this.department = department;
        this.remarks = remarks;
    }

    public String getDepartment() {
        if ((department == null || department.isBlank()) && departmentId != null) {
            switch (departmentId.intValue()) {
                case 1: return "Public Works Department";
                case 2: return "Water Supply and Sewerage Board";
                case 3: return "Solid Waste Management";
                case 4: return "Electricity Board";
                case 5: return "Health & Municipal Sanitation";
                default: return "Municipal Department #" + departmentId;
            }
        }
        return department != null ? department : "General Municipal Dept";
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Long departmentId) {
        this.departmentId = departmentId;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}

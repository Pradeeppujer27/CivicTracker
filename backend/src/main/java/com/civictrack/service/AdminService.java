package com.civictrack.service;

import com.civictrack.dto.auth.RegisterRequest;
import com.civictrack.dto.complaint.ComplaintResponse;
import com.civictrack.dto.complaint.DepartmentAssignRequest;
import com.civictrack.dto.complaint.StatusUpdateRequest;
import com.civictrack.dto.dashboard.DashboardStatsResponse;
import com.civictrack.dto.user.UserProfileResponse;
import com.civictrack.security.UserPrincipal;

import java.util.List;

public interface AdminService {

    ComplaintResponse assignDepartment(Long complaintId, DepartmentAssignRequest request, UserPrincipal currentUser);

    ComplaintResponse updateStatus(Long complaintId, StatusUpdateRequest request, UserPrincipal currentUser);

    List<ComplaintResponse> getAllComplaints(String category, String status, String department, String search);

    List<UserProfileResponse> getAllUsers();

    UserProfileResponse createStaffAccount(RegisterRequest request, String department, UserPrincipal currentUser);

    DashboardStatsResponse getAdminDashboardStats();

    void deleteComplaint(Long complaintId, UserPrincipal currentUser);
}

package com.civictrack.controller;

import com.civictrack.dto.auth.RegisterRequest;
import com.civictrack.dto.common.ApiResponse;
import com.civictrack.dto.complaint.ComplaintResponse;
import com.civictrack.dto.complaint.DepartmentAssignRequest;
import com.civictrack.dto.complaint.StatusUpdateRequest;
import com.civictrack.dto.dashboard.DashboardStatsResponse;
import com.civictrack.dto.user.UserProfileResponse;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    /**
     * Search, filter, and inspect all complaints
     */
    @GetMapping("/complaints")
    public ResponseEntity<List<ComplaintResponse>> getAllComplaints(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String search) {

        List<ComplaintResponse> list = adminService.getAllComplaints(category, status, department, search);
        return ResponseEntity.ok(list);
    }

    /**
     * Assign / Reassign complaint to a municipal department
     */
    @PutMapping("/complaints/{id}/assign")
    public ResponseEntity<ComplaintResponse> assignDepartment(
            @PathVariable Long id,
            @Valid @RequestBody DepartmentAssignRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ComplaintResponse response = adminService.assignDepartment(id, request, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * Update status with administrative remarks
     */
    @PutMapping("/complaints/{id}/status")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ComplaintResponse response = adminService.updateStatus(id, request, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete complaint
     */
    @DeleteMapping("/complaints/{id}")
    public ResponseEntity<ApiResponse<String>> deleteComplaint(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        adminService.deleteComplaint(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Complaint deleted successfully", null));
    }

    /**
     * Retrieve all registered users
     */
    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        List<UserProfileResponse> users = adminService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * Admin creates authorized municipal staff / official accounts
     */
    @PostMapping("/staff")
    public ResponseEntity<UserProfileResponse> createStaffAccount(
            @Valid @RequestBody RegisterRequest request,
            @RequestParam(required = false) String department,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        UserProfileResponse staff = adminService.createStaffAccount(request, department, currentUser);
        return new ResponseEntity<>(staff, HttpStatus.CREATED);
    }

    /**
     * Fetch central executive analytics and metrics
     */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getAdminStats() {
        DashboardStatsResponse stats = adminService.getAdminDashboardStats();
        return ResponseEntity.ok(stats);
    }
}

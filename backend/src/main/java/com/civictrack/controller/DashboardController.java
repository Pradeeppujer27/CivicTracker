package com.civictrack.controller;

import com.civictrack.dto.complaint.ComplaintResponse;
import com.civictrack.dto.dashboard.DashboardStatsResponse;
import com.civictrack.entity.ComplaintStatus;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.AdminService;
import com.civictrack.service.ComplaintService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final AdminService adminService;
    private final ComplaintService complaintService;

    public DashboardController(AdminService adminService, ComplaintService complaintService) {
        this.adminService = adminService;
        this.complaintService = complaintService;
    }

    /**
     * Citizen personal dashboard metrics
     * Calculates counts based only on current citizen's own complaints
     */
    @GetMapping("/citizen")
    @PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN')")
    public ResponseEntity<DashboardStatsResponse> getCitizenDashboard(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<ComplaintResponse> myComplaints = complaintService.getMyComplaints(currentUser);

        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalComplaints(myComplaints.size());

        long pending = myComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.SUBMITTED || c.getStatus() == ComplaintStatus.UNDER_REVIEW).count();
        long inProgress = myComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.ASSIGNED || c.getStatus() == ComplaintStatus.IN_PROGRESS).count();
        long resolved = myComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.RESOLVED).count();
        long rejected = myComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.REJECTED).count();

        stats.setPendingComplaints(pending);
        stats.setInProgressComplaints(inProgress);
        stats.setResolvedComplaints(resolved);
        stats.setRejectedComplaints(rejected);

        double rate = myComplaints.size() > 0 ? ((double) resolved / myComplaints.size()) * 100.0 : 0.0;
        stats.setResolutionRate(Math.round(rate * 10.0) / 10.0);

        // Status breakdown
        Map<String, Long> statusMap = new HashMap<>();
        for (ComplaintStatus s : ComplaintStatus.values()) {
            statusMap.put(s.name(), myComplaints.stream().filter(c -> c.getStatus() == s).count());
        }
        stats.setStatusDistribution(statusMap);

        // Category breakdown
        Map<String, Long> catMap = myComplaints.stream()
                .collect(Collectors.groupingBy(ComplaintResponse::getCategory, Collectors.counting()));
        stats.setCategoryDistribution(catMap);

        // Recent 5 complaints
        stats.setRecentComplaints(myComplaints.stream().limit(5).collect(Collectors.toList()));

        return ResponseEntity.ok(stats);
    }

    /**
     * Central municipal administration dashboard metrics
     * Restricted to ROLE_ADMIN
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStatsResponse> getAdminDashboard() {
        DashboardStatsResponse stats = adminService.getAdminDashboardStats();
        return ResponseEntity.ok(stats);
    }

    /**
     * Department staff dashboard metrics
     * Restricted to ROLE_STAFF or ROLE_OFFICIAL
     */
    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('STAFF', 'OFFICIAL', 'ADMIN')")
    public ResponseEntity<DashboardStatsResponse> getStaffDashboard(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<ComplaintResponse> assignedComplaints = complaintService.getAssignedComplaints(currentUser);

        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalComplaints(assignedComplaints.size());

        long pending = assignedComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.SUBMITTED || c.getStatus() == ComplaintStatus.UNDER_REVIEW).count();
        long inProgress = assignedComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.ASSIGNED || c.getStatus() == ComplaintStatus.IN_PROGRESS).count();
        long resolved = assignedComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.RESOLVED).count();
        long rejected = assignedComplaints.stream().filter(c ->
                c.getStatus() == ComplaintStatus.REJECTED).count();

        stats.setPendingComplaints(pending);
        stats.setInProgressComplaints(inProgress);
        stats.setResolvedComplaints(resolved);
        stats.setRejectedComplaints(rejected);

        // Recent complaints
        stats.setRecentComplaints(assignedComplaints.stream().limit(10).collect(Collectors.toList()));

        return ResponseEntity.ok(stats);
    }
}

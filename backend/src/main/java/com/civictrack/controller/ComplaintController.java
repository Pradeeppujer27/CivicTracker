package com.civictrack.controller;

import com.civictrack.dto.complaint.ComplaintRequest;
import com.civictrack.dto.complaint.ComplaintResponse;
import com.civictrack.dto.complaint.ComplaintUpdateDto;
import com.civictrack.dto.complaint.StatusUpdateRequest;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping({"/complaints", "/grievances"})
public class ComplaintController {

    private final ComplaintService complaintService;
    private final com.civictrack.service.AdminService adminService;

    public ComplaintController(ComplaintService complaintService, com.civictrack.service.AdminService adminService) {
        this.complaintService = complaintService;
        this.adminService = adminService;
    }

    /**
     * Submit a new civic complaint (with optional photographic proof)
     * Accessible by CITIZEN or ADMIN
     */
    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN')")
    public ResponseEntity<ComplaintResponse> createComplaint(
            @ModelAttribute @Valid ComplaintRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ComplaintResponse response = complaintService.createComplaint(request, file, currentUser);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Citizen personal complaint history
     * STRICT SECURITY: Citizens only access their own complaints
     */
    @GetMapping("/my")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<List<ComplaintResponse>> getMyComplaints(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<ComplaintResponse> list = complaintService.getMyComplaints(currentUser);
        return ResponseEntity.ok(list);
    }

    /**
     * Municipal Staff assigned complaints
     * Accessible by STAFF or ADMIN
     */
    @GetMapping("/assigned")
    @PreAuthorize("hasAnyRole('STAFF', 'OFFICIAL', 'ADMIN')")
    public ResponseEntity<List<ComplaintResponse>> getAssignedComplaints(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<ComplaintResponse> list = complaintService.getAssignedComplaints(currentUser);
        return ResponseEntity.ok(list);
    }

    /**
     * Inspect complaint by internal ID
     * Checked against currentUser role and ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CITIZEN', 'STAFF', 'OFFICIAL', 'ADMIN')")
    public ResponseEntity<ComplaintResponse> getComplaintById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ComplaintResponse response = complaintService.getComplaintById(id, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * Public Complaint Tracking lookup by Complaint / Tracking Number (e.g. GRV-2026-8910)
     * Publicly accessible by any citizen
     */
    @GetMapping("/track/{complaintNumber}")
    public ResponseEntity<ComplaintResponse> getComplaintByNumber(@PathVariable String complaintNumber) {
        ComplaintResponse response = complaintService.getComplaintByNumber(complaintNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * List all complaints with optional filtering
     * Accessible by STAFF, OFFICIAL, or ADMIN
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'OFFICIAL', 'ADMIN')")
    public ResponseEntity<List<ComplaintResponse>> getAllComplaints(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String search) {

        List<ComplaintResponse> list = complaintService.getAllComplaints(category, status, department, search);
        return ResponseEntity.ok(list);
    }

    /**
     * Update status and add remarks
     * Accessible by STAFF, OFFICIAL, or ADMIN
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('STAFF', 'OFFICIAL', 'ADMIN')")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ComplaintResponse response = complaintService.updateStatus(id, request, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * Assign complaint to a municipal department (Admin only)
     */
    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComplaintResponse> assignDepartment(
            @PathVariable Long id,
            @Valid @RequestBody com.civictrack.dto.complaint.DepartmentAssignRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ComplaintResponse response = adminService.assignDepartment(id, request, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * Get complaint lifecycle history & audit logs
     */
    @GetMapping({"/{id}/updates", "/{id}/history"})
    @PreAuthorize("hasAnyRole('CITIZEN', 'STAFF', 'OFFICIAL', 'ADMIN')")
    public ResponseEntity<List<ComplaintUpdateDto>> getComplaintUpdates(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        List<ComplaintUpdateDto> list = complaintService.getComplaintUpdates(id, currentUser);
        return ResponseEntity.ok(list);
    }
}

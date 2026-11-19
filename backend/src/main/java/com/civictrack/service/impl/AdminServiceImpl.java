package com.civictrack.service.impl;

import com.civictrack.dto.auth.RegisterRequest;
import com.civictrack.dto.complaint.ComplaintResponse;
import com.civictrack.dto.complaint.DepartmentAssignRequest;
import com.civictrack.dto.complaint.StatusUpdateRequest;
import com.civictrack.dto.dashboard.DashboardStatsResponse;
import com.civictrack.dto.user.UserProfileResponse;
import com.civictrack.entity.Complaint;
import com.civictrack.entity.ComplaintStatus;
import com.civictrack.entity.ComplaintUpdate;
import com.civictrack.entity.Role;
import com.civictrack.entity.User;
import com.civictrack.exception.BadRequestException;
import com.civictrack.exception.ResourceNotFoundException;
import com.civictrack.repository.ComplaintRepository;
import com.civictrack.repository.ComplaintUpdateRepository;
import com.civictrack.repository.UserRepository;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.AdminService;
import com.civictrack.service.ComplaintService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl implements AdminService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintUpdateRepository updateRepository;
    private final UserRepository userRepository;
    private final ComplaintService complaintService;
    private final PasswordEncoder passwordEncoder;
    private final com.civictrack.service.NotificationService notificationService;

    public AdminServiceImpl(ComplaintRepository complaintRepository,
                            ComplaintUpdateRepository updateRepository,
                            UserRepository userRepository,
                            ComplaintService complaintService,
                            PasswordEncoder passwordEncoder,
                            com.civictrack.service.NotificationService notificationService) {
        this.complaintRepository = complaintRepository;
        this.updateRepository = updateRepository;
        this.userRepository = userRepository;
        this.complaintService = complaintService;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public ComplaintResponse assignDepartment(Long complaintId, DepartmentAssignRequest request, UserPrincipal currentUser) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", complaintId));

        User admin = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        String oldStatus = complaint.getStatus().name();
        complaint.setDepartment(request.getDepartment().trim());

        if (complaint.getStatus() == ComplaintStatus.SUBMITTED || complaint.getStatus() == ComplaintStatus.UNDER_REVIEW) {
            complaint.setStatus(ComplaintStatus.ASSIGNED);
        }

        String note = "Assigned to department: " + request.getDepartment().trim();
        if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
            note += " - Directive: " + request.getRemarks().trim();
            complaint.setAdminRemarks(note);
        }

        Complaint saved = complaintRepository.save(complaint);

        ComplaintUpdate update = new ComplaintUpdate(
                saved,
                admin,
                oldStatus,
                saved.getStatus().name(),
                note
        );
        updateRepository.save(update);

        // Dispatch in-app notification to the complainant citizen
        if (saved.getUser() != null) {
            notificationService.createStatusNotification(
                    saved.getUser(),
                    saved,
                    oldStatus,
                    saved.getStatus().name(),
                    note
            );
        }

        return complaintService.getComplaintById(complaintId, currentUser);
    }

    @Override
    @Transactional
    public ComplaintResponse updateStatus(Long complaintId, StatusUpdateRequest request, UserPrincipal currentUser) {
        return complaintService.updateStatus(complaintId, request, currentUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintResponse> getAllComplaints(String category, String status, String department, String search) {
        return complaintService.getAllComplaints(category, status, department, search);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> new UserProfileResponse(
                        u.getId(),
                        u.getFullName(),
                        u.getEmail(),
                        u.getPhoneNumber(),
                        u.getAddress(),
                        u.getRole(),
                        u.getDepartment(),
                        u.getIsActive(),
                        u.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserProfileResponse createStaffAccount(RegisterRequest request, String department, UserPrincipal currentUser) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email address already exists.");
        }

        User staff = new User();
        staff.setFullName(request.getFullName().trim());
        staff.setEmail(email);
        staff.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
        staff.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        staff.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        staff.setRole(Role.ROLE_STAFF);
        staff.setDepartment(department != null && !department.isBlank() ? department.trim() : "Public Works Department (PWD)");
        staff.setIsActive(true);

        User saved = userRepository.save(staff);

        return new UserProfileResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getPhoneNumber(),
                saved.getAddress(),
                saved.getRole(),
                saved.getDepartment(),
                saved.getIsActive(),
                saved.getCreatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getAdminDashboardStats() {
        DashboardStatsResponse stats = new DashboardStatsResponse();

        long total = complaintRepository.count();
        long pending = complaintRepository.countByStatus(ComplaintStatus.SUBMITTED) +
                complaintRepository.countByStatus(ComplaintStatus.UNDER_REVIEW);
        long inProgress = complaintRepository.countByStatus(ComplaintStatus.ASSIGNED) +
                complaintRepository.countByStatus(ComplaintStatus.IN_PROGRESS);
        long resolved = complaintRepository.countByStatus(ComplaintStatus.RESOLVED);
        long rejected = complaintRepository.countByStatus(ComplaintStatus.REJECTED);

        stats.setTotalComplaints(total);
        stats.setPendingComplaints(pending);
        stats.setInProgressComplaints(inProgress);
        stats.setResolvedComplaints(resolved);
        stats.setRejectedComplaints(rejected);

        double rate = total > 0 ? ((double) resolved / total) * 100.0 : 0.0;
        stats.setResolutionRate(Math.round(rate * 10.0) / 10.0);

        // Status Distribution
        Map<String, Long> statusMap = new HashMap<>();
        for (ComplaintStatus s : ComplaintStatus.values()) {
            statusMap.put(s.name(), complaintRepository.countByStatus(s));
        }
        stats.setStatusDistribution(statusMap);

        // Category Distribution
        Map<String, Long> catMap = new HashMap<>();
        List<Object[]> catCounts = complaintRepository.countComplaintsByCategory();
        for (Object[] row : catCounts) {
            if (row[0] != null) {
                catMap.put((String) row[0], (Long) row[1]);
            }
        }
        stats.setCategoryDistribution(catMap);

        // Department Distribution
        Map<String, Long> deptMap = new HashMap<>();
        List<Object[]> deptCounts = complaintRepository.countComplaintsByDepartment();
        for (Object[] row : deptCounts) {
            if (row[0] != null) {
                deptMap.put((String) row[0], (Long) row[1]);
            }
        }
        stats.setDepartmentDistribution(deptMap);

        // Recent 10 complaints
        stats.setRecentComplaints(complaintService.getAllComplaints(null, null, null, null).stream()
                .limit(10)
                .collect(Collectors.toList()));

        return stats;
    }

    @Override
    @Transactional
    public void deleteComplaint(Long complaintId, UserPrincipal currentUser) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", complaintId));
        complaintRepository.delete(complaint);
    }
}

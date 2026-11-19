package com.civictrack.service.impl;

import com.civictrack.dto.complaint.*;
import com.civictrack.entity.*;
import com.civictrack.exception.ResourceNotFoundException;
import com.civictrack.exception.UnauthorizedException;
import com.civictrack.repository.ComplaintImageRepository;
import com.civictrack.repository.ComplaintRepository;
import com.civictrack.repository.ComplaintUpdateRepository;
import com.civictrack.repository.UserRepository;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.ComplaintService;
import com.civictrack.service.FileStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintImageRepository imageRepository;
    private final ComplaintUpdateRepository updateRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final com.civictrack.service.NotificationService notificationService;

    public ComplaintServiceImpl(ComplaintRepository complaintRepository,
                                ComplaintImageRepository imageRepository,
                                ComplaintUpdateRepository updateRepository,
                                UserRepository userRepository,
                                FileStorageService fileStorageService,
                                com.civictrack.service.NotificationService notificationService) {
        this.complaintRepository = complaintRepository;
        this.imageRepository = imageRepository;
        this.updateRepository = updateRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public ComplaintResponse createComplaint(ComplaintRequest request, MultipartFile file, UserPrincipal currentUser) {
        User citizen = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        Complaint complaint = new Complaint();
        String generatedNumber = "GRV-" + Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        complaint.setComplaintNumber(generatedNumber);
        complaint.setUser(citizen);
        complaint.setTitle(request.getTitle().trim());
        complaint.setDescription(request.getDescription().trim());
        complaint.setCategory(request.getCategory().trim());

        // Assign department based on category or default
        String department = request.getDepartment();
        if (department == null || department.isBlank()) {
            department = resolveDepartmentByCategory(request.getCategory());
        }
        complaint.setDepartment(department);

        complaint.setPriority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM);
        complaint.setStatus(ComplaintStatus.SUBMITTED);
        complaint.setLocationAddress(request.getLocationAddress().trim());
        complaint.setLatitude(request.getLatitude());
        complaint.setLongitude(request.getLongitude());

        Complaint saved = complaintRepository.save(complaint);

        // Store photographic proof attachment if provided
        if (file != null && !file.isEmpty()) {
            String storedFileName = fileStorageService.storeFile(file);
            ComplaintImage image = new ComplaintImage(
                    saved,
                    file.getOriginalFilename(),
                    storedFileName,
                    file.getContentType(),
                    file.getSize()
            );
            imageRepository.save(image);
            saved.getImages().add(image);
        }

        // Log initial registration in audit trail
        ComplaintUpdate initialUpdate = new ComplaintUpdate(
                saved,
                citizen,
                null,
                ComplaintStatus.SUBMITTED.name(),
                "Complaint registered by citizen with geolocation lock and uploaded evidence."
        );
        updateRepository.save(initialUpdate);
        saved.getUpdates().add(initialUpdate);

        // Dispatch initial registration in-app notification
        notificationService.createStatusNotification(
                citizen,
                saved,
                null,
                ComplaintStatus.SUBMITTED.name(),
                "Your grievance has been logged with official reference " + saved.getComplaintNumber() + "."
        );

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintById(Long id, UserPrincipal currentUser) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", id));

        // ROLE-BASED ACCESS CONTROL:
        // Citizens can ONLY view their own complaints
        boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isStaff = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STAFF") || a.getAuthority().equals("ROLE_OFFICIAL"));

        if (!isAdmin && !isStaff) {
            if (!complaint.getUser().getId().equals(currentUser.getId())) {
                throw new UnauthorizedException("Access Denied: Citizens are strictly restricted to inspecting their own complaints.");
            }
        } else if (isStaff && !isAdmin) {
            // Staff can view if assigned to their department
            if (currentUser.getDepartment() != null && !currentUser.getDepartment().equalsIgnoreCase(complaint.getDepartment())) {
                throw new UnauthorizedException("Access Denied: This complaint is routed to a different municipal department.");
            }
        }

        return mapToResponse(complaint);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintByNumber(String complaintNumber) {
        Complaint complaint = complaintRepository.findByComplaintNumber(complaintNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "complaintNumber", complaintNumber));

        return mapToResponse(complaint);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintResponse> getMyComplaints(UserPrincipal currentUser) {
        // STRICT CITIZEN DATA ISOLATION: Query only by citizen user ID
        return complaintRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintResponse> getAssignedComplaints(UserPrincipal currentUser) {
        String department = currentUser.getDepartment();
        if (department == null || department.isBlank()) {
            return complaintRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        return complaintRepository.findByDepartment(department).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintResponse> getAllComplaints(String category, String status, String department, String search) {
        List<Complaint> list = complaintRepository.findAllByOrderByCreatedAtDesc();

        if (category != null && !category.equalsIgnoreCase("ALL") && !category.isBlank()) {
            list = list.stream().filter(c -> c.getCategory().equalsIgnoreCase(category)).collect(Collectors.toList());
        }

        if (status != null && !status.equalsIgnoreCase("ALL") && !status.isBlank()) {
            try {
                ComplaintStatus s = ComplaintStatus.valueOf(status.toUpperCase());
                list = list.stream().filter(c -> c.getStatus() == s).collect(Collectors.toList());
            } catch (IllegalArgumentException ignored) {}
        }

        if (department != null && !department.equalsIgnoreCase("ALL") && !department.isBlank()) {
            list = list.stream().filter(c -> c.getDepartment().equalsIgnoreCase(department)).collect(Collectors.toList());
        }

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase().trim();
            list = list.stream().filter(c ->
                    c.getComplaintNumber().toLowerCase().contains(q) ||
                    c.getTitle().toLowerCase().contains(q) ||
                    c.getDescription().toLowerCase().contains(q) ||
                    c.getLocationAddress().toLowerCase().contains(q) ||
                    (c.getUser() != null && c.getUser().getFullName().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }

        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ComplaintResponse updateStatus(Long id, StatusUpdateRequest request, UserPrincipal currentUser) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", id));

        User actingUser = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        String oldStatus = complaint.getStatus() != null ? complaint.getStatus().name() : null;
        String newStatus = request.getStatus().name();

        complaint.setStatus(request.getStatus());
        if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
            complaint.setAdminRemarks(request.getRemarks().trim());
        }

        if (request.getStatus() == ComplaintStatus.RESOLVED) {
            complaint.setResolvedAt(LocalDateTime.now());
        }

        Complaint saved = complaintRepository.save(complaint);

        // Record history update
        ComplaintUpdate update = new ComplaintUpdate(
                saved,
                actingUser,
                oldStatus,
                newStatus,
                request.getRemarks() != null && !request.getRemarks().isBlank() ? request.getRemarks().trim() : "Status updated to " + newStatus
        );
        updateRepository.save(update);

        // Dispatch in-app notification to the complainant citizen
        if (saved.getUser() != null) {
            notificationService.createStatusNotification(
                    saved.getUser(),
                    saved,
                    oldStatus,
                    newStatus,
                    request.getRemarks()
            );
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintUpdateDto> getComplaintUpdates(Long id, UserPrincipal currentUser) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", id));

        return updateRepository.findByComplaintIdOrderByCreatedAtAsc(complaint.getId()).stream()
                .map(u -> new ComplaintUpdateDto(
                        u.getId(),
                        u.getPreviousStatus(),
                        u.getCurrentStatus(),
                        u.getUpdatedByUser() != null ? u.getUpdatedByUser().getFullName() : "System",
                        u.getRemarks(),
                        u.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    private String resolveDepartmentByCategory(String category) {
        if (category == null) return "Public Works Department (PWD)";
        return switch (category.toLowerCase().trim()) {
            case "garbage collection", "waste management" -> "Solid Waste Management";
            case "water supply", "water leakage" -> "Water Supply & Sewerage Board";
            case "drainage problems", "sewerage" -> "Water Supply & Sewerage Board";
            case "streetlight", "streetlight issues", "electricity" -> "Electricity & Street Lighting";
            case "health", "sanitation" -> "Health & Municipal Sanitation";
            default -> "Public Works Department (PWD)";
        };
    }

    private ComplaintResponse mapToResponse(Complaint c) {
        ComplaintResponse dto = new ComplaintResponse();
        dto.setId(c.getId());
        dto.setComplaintNumber(c.getComplaintNumber());

        if (c.getUser() != null) {
            dto.setUserId(c.getUser().getId());
            dto.setCitizenName(c.getUser().getFullName());
            dto.setCitizenEmail(c.getUser().getEmail());
            dto.setCitizenPhone(c.getUser().getPhoneNumber());
            dto.setCitizenAddress(c.getUser().getAddress());
            dto.setResidentAccountNumber(String.format("CT-RES-%05d", c.getUser().getId()));
        }

        dto.setTitle(c.getTitle());
        dto.setDescription(c.getDescription());
        dto.setCategory(c.getCategory());
        dto.setDepartment(c.getDepartment());
        dto.setPriority(c.getPriority());
        dto.setStatus(c.getStatus());
        dto.setLocationAddress(c.getLocationAddress());
        dto.setLatitude(c.getLatitude());
        dto.setLongitude(c.getLongitude());
        dto.setAdminRemarks(c.getAdminRemarks());
        dto.setResolvedAt(c.getResolvedAt());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());

        // Attached Images
        List<ComplaintImage> images = imageRepository.findByComplaintId(c.getId());
        if (images != null) {
            dto.setImages(images.stream()
                    .map(img -> new ComplaintImageDto(
                            img.getId(),
                            img.getFileName(),
                            img.getFilePath().startsWith("http") ? img.getFilePath() : "/uploads/" + img.getFilePath(),
                            img.getFileType(),
                            img.getFileSize(),
                            img.getUploadedAt()
                    ))
                    .collect(Collectors.toList()));
        }

        // Timeline Updates
        List<ComplaintUpdate> updates = updateRepository.findByComplaintIdOrderByCreatedAtAsc(c.getId());
        if (updates != null) {
            dto.setUpdates(updates.stream()
                    .map(u -> new ComplaintUpdateDto(
                            u.getId(),
                            u.getPreviousStatus(),
                            u.getCurrentStatus(),
                            u.getUpdatedByUser() != null ? u.getUpdatedByUser().getFullName() : "Admin Office",
                            u.getRemarks(),
                            u.getCreatedAt()
                    ))
                    .collect(Collectors.toList()));
        }

        return dto;
    }
}

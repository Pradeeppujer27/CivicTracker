package com.civictrack.service.impl;

import com.civictrack.dto.grievance.*;
import com.civictrack.entity.*;
import com.civictrack.exception.ResourceNotFoundException;
import com.civictrack.repository.*;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.FileStorageService;
import com.civictrack.service.GrievanceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GrievanceServiceImpl implements GrievanceService {

    private final GrievanceRepository grievanceRepository;
    private final CategoryRepository categoryRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;
    private final GrievanceStatusLogRepository statusLogRepository;
    private final FileStorageService fileStorageService;

    public GrievanceServiceImpl(GrievanceRepository grievanceRepository,
                                CategoryRepository categoryRepository,
                                DepartmentRepository departmentRepository,
                                UserRepository userRepository,
                                AttachmentRepository attachmentRepository,
                                GrievanceStatusLogRepository statusLogRepository,
                                FileStorageService fileStorageService) {
        this.grievanceRepository = grievanceRepository;
        this.categoryRepository = categoryRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.attachmentRepository = attachmentRepository;
        this.statusLogRepository = statusLogRepository;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional
    public GrievanceResponse createGrievance(GrievanceRequest request, MultipartFile file, UserPrincipal currentUser) {
        Category category = categoryRepository.findById(request.getCategoryId())
            .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        User citizen = userRepository.findById(currentUser.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        Grievance grievance = new Grievance();
        grievance.setTrackingNumber("GRV-" + Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        grievance.setTitle(request.getTitle());
        grievance.setDescription(request.getDescription());
        grievance.setCategory(category);
        grievance.setDepartment(category.getDepartment());
        grievance.setCitizen(citizen);
        grievance.setPriority(request.getPriority());
        grievance.setLocationAddress(request.getLocationAddress());
        grievance.setLatitude(request.getLatitude());
        grievance.setLongitude(request.getLongitude());
        grievance.setStatus(GrievanceStatus.SUBMITTED);

        Grievance savedGrievance = grievanceRepository.save(grievance);

        if (file != null && !file.isEmpty()) {
            String storedFileName = fileStorageService.storeFile(file);
            Attachment attachment = new Attachment(
                savedGrievance,
                file.getOriginalFilename(),
                storedFileName,
                file.getContentType(),
                file.getSize()
            );
            attachmentRepository.save(attachment);
            savedGrievance.getAttachments().add(attachment);
        }

        // Create initial status log
        GrievanceStatusLog initialLog = new GrievanceStatusLog(
            savedGrievance,
            citizen,
            null,
            GrievanceStatus.SUBMITTED.name(),
            "Grievance submitted by citizen"
        );
        statusLogRepository.save(initialLog);

        return mapToResponse(savedGrievance);
    }

    @Override
    @Transactional(readOnly = true)
    public GrievanceResponse getGrievanceById(Long id) {
        Grievance grievance = grievanceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Grievance", "id", id));
        return mapToResponse(grievance);
    }

    @Override
    @Transactional(readOnly = true)
    public GrievanceResponse getGrievanceByTrackingNumber(String trackingNumber) {
        Grievance grievance = grievanceRepository.findByTrackingNumber(trackingNumber)
            .orElseThrow(() -> new ResourceNotFoundException("Grievance", "trackingNumber", trackingNumber));
        return mapToResponse(grievance);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GrievanceResponse> getMyGrievances(Long citizenId) {
        return grievanceRepository.findByCitizenIdOrderByCreatedAtDesc(citizenId).stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GrievanceResponse> getAllGrievances() {
        return grievanceRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GrievanceResponse updateGrievanceStatus(Long id, StatusUpdateRequest request, UserPrincipal currentUser) {
        Grievance grievance = grievanceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Grievance", "id", id));

        User actingUser = userRepository.findById(currentUser.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        String oldStatus = grievance.getStatus() != null ? grievance.getStatus().name() : null;
        String newStatus = request.getStatus().name();

        grievance.setStatus(request.getStatus());
        if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
            grievance.setResolutionNotes(request.getRemarks());
        }

        if (request.getStatus() == GrievanceStatus.RESOLVED) {
            grievance.setResolvedAt(LocalDateTime.now());
        }

        Grievance updatedGrievance = grievanceRepository.save(grievance);

        // Record history log
        GrievanceStatusLog log = new GrievanceStatusLog(
            updatedGrievance,
            actingUser,
            oldStatus,
            newStatus,
            request.getRemarks() != null && !request.getRemarks().isBlank() ? request.getRemarks() : "Status updated to " + newStatus
        );
        statusLogRepository.save(log);

        return mapToResponse(updatedGrievance);
    }

    @Override
    @Transactional
    public GrievanceResponse assignDepartment(Long id, DepartmentAssignRequest request, UserPrincipal currentUser) {
        Grievance grievance = grievanceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Grievance", "id", id));

        Department department = departmentRepository.findById(request.getDepartmentId())
            .orElseThrow(() -> new ResourceNotFoundException("Department", "id", request.getDepartmentId()));

        User actingUser = userRepository.findById(currentUser.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        String oldStatus = grievance.getStatus() != null ? grievance.getStatus().name() : null;
        grievance.setDepartment(department);

        // Automatically mark as ASSIGNED if currently SUBMITTED or UNDER_REVIEW
        if (grievance.getStatus() == GrievanceStatus.SUBMITTED || grievance.getStatus() == GrievanceStatus.UNDER_REVIEW) {
            grievance.setStatus(GrievanceStatus.ASSIGNED);
        }

        String note = "Assigned to department: " + department.getName();
        if (request.getRemarks() != null && !request.getRemarks().isBlank()) {
            note += " - Notes: " + request.getRemarks();
            grievance.setResolutionNotes(note);
        }

        Grievance updatedGrievance = grievanceRepository.save(grievance);

        GrievanceStatusLog log = new GrievanceStatusLog(
            updatedGrievance,
            actingUser,
            oldStatus,
            grievance.getStatus().name(),
            note
        );
        statusLogRepository.save(log);

        return mapToResponse(updatedGrievance);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatusLogDto> getGrievanceHistory(Long id) {
        return statusLogRepository.findByGrievanceIdOrderByCreatedAtAsc(id).stream()
            .map(l -> new StatusLogDto(
                l.getId(),
                l.getOldStatus(),
                l.getNewStatus(),
                l.getChangedBy() != null ? l.getChangedBy().getFullName() : "System",
                l.getRemarks(),
                l.getCreatedAt()
            ))
            .collect(Collectors.toList());
    }

    private GrievanceResponse mapToResponse(Grievance g) {
        GrievanceResponse res = new GrievanceResponse();
        res.setId(g.getId());
        res.setTrackingNumber(g.getTrackingNumber());
        res.setTitle(g.getTitle());
        res.setDescription(g.getDescription());
        
        if (g.getCategory() != null) {
            res.setCategoryId(g.getCategory().getId());
            res.setCategoryName(g.getCategory().getName());
        }
        
        if (g.getDepartment() != null) {
            res.setDepartmentId(g.getDepartment().getId());
            res.setDepartmentName(g.getDepartment().getName());
        }
        
        if (g.getCitizen() != null) {
            res.setCitizenId(g.getCitizen().getId());
            res.setCitizenName(g.getCitizen().getFullName());
            res.setCitizenEmail(g.getCitizen().getEmail());
            res.setCitizenPhone(g.getCitizen().getPhoneNumber());
            res.setCitizenAddress(g.getCitizen().getAddress());
        }
        
        res.setStatus(g.getStatus());
        res.setPriority(g.getPriority());
        res.setLocationAddress(g.getLocationAddress());
        res.setLatitude(g.getLatitude());
        res.setLongitude(g.getLongitude());
        res.setResolutionNotes(g.getResolutionNotes());
        res.setResolvedAt(g.getResolvedAt());
        res.setCreatedAt(g.getCreatedAt());

        if (g.getAttachments() != null) {
            List<AttachmentDto> attDtos = g.getAttachments().stream()
                .map(a -> new AttachmentDto(
                    a.getId(),
                    a.getFileName(),
                    "/uploads/" + a.getFilePath(),
                    a.getFileType(),
                    a.getFileSize(),
                    a.getUploadedAt()
                ))
                .collect(Collectors.toList());
            res.setAttachments(attDtos);
        }

        // Fetch logs for detail view
        List<GrievanceStatusLog> logs = statusLogRepository.findByGrievanceIdOrderByCreatedAtAsc(g.getId());
        if (logs != null && !logs.isEmpty()) {
            List<StatusLogDto> logDtos = logs.stream()
                .map(l -> new StatusLogDto(
                    l.getId(),
                    l.getOldStatus(),
                    l.getNewStatus(),
                    l.getChangedBy() != null ? l.getChangedBy().getFullName() : "System",
                    l.getRemarks(),
                    l.getCreatedAt()
                ))
                .collect(Collectors.toList());
            res.setStatusLogs(logDtos);
        }

        return res;
    }
}

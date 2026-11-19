package com.civictrack.service;

import com.civictrack.dto.grievance.*;
import com.civictrack.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface GrievanceService {
    GrievanceResponse createGrievance(GrievanceRequest request, MultipartFile file, UserPrincipal currentUser);
    GrievanceResponse getGrievanceById(Long id);
    GrievanceResponse getGrievanceByTrackingNumber(String trackingNumber);
    List<GrievanceResponse> getMyGrievances(Long citizenId);
    List<GrievanceResponse> getAllGrievances();
    GrievanceResponse updateGrievanceStatus(Long id, StatusUpdateRequest request, UserPrincipal currentUser);
    GrievanceResponse assignDepartment(Long id, DepartmentAssignRequest request, UserPrincipal currentUser);
    List<StatusLogDto> getGrievanceHistory(Long id);
}

package com.civictrack.service;

import com.civictrack.dto.complaint.ComplaintRequest;
import com.civictrack.dto.complaint.ComplaintResponse;
import com.civictrack.dto.complaint.ComplaintUpdateDto;
import com.civictrack.dto.complaint.StatusUpdateRequest;
import com.civictrack.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ComplaintService {

    ComplaintResponse createComplaint(ComplaintRequest request, MultipartFile file, UserPrincipal currentUser);

    ComplaintResponse getComplaintById(Long id, UserPrincipal currentUser);

    ComplaintResponse getComplaintByNumber(String complaintNumber);

    List<ComplaintResponse> getMyComplaints(UserPrincipal currentUser);

    List<ComplaintResponse> getAssignedComplaints(UserPrincipal currentUser);

    List<ComplaintResponse> getAllComplaints(String category, String status, String department, String search);

    ComplaintResponse updateStatus(Long id, StatusUpdateRequest request, UserPrincipal currentUser);

    List<ComplaintUpdateDto> getComplaintUpdates(Long id, UserPrincipal currentUser);
}

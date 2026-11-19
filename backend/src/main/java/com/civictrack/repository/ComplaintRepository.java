package com.civictrack.repository;

import com.civictrack.entity.Complaint;
import com.civictrack.entity.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    Optional<Complaint> findByComplaintNumber(String complaintNumber);

    List<Complaint> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Complaint> findAllByOrderByCreatedAtDesc();

    List<Complaint> findByStatusOrderByCreatedAtDesc(ComplaintStatus status);

    List<Complaint> findByCategory(String category);

    List<Complaint> findByDepartment(String department);

    Long countByStatus(ComplaintStatus status);

    Long countByCategory(String category);

    Long countByDepartment(String department);

    @Query("SELECT c FROM Complaint c WHERE " +
           "LOWER(c.complaintNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.locationAddress) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.user.fullName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY c.createdAt DESC")
    List<Complaint> searchComplaints(@Param("query") String query);

    @Query("SELECT c.category, COUNT(c) FROM Complaint c GROUP BY c.category")
    List<Object[]> countComplaintsByCategory();

    @Query("SELECT c.status, COUNT(c) FROM Complaint c GROUP BY c.status")
    List<Object[]> countComplaintsByStatus();

    @Query("SELECT c.department, COUNT(c) FROM Complaint c GROUP BY c.department")
    List<Object[]> countComplaintsByDepartment();
}

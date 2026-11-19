package com.civictrack.repository;

import com.civictrack.entity.Grievance;
import com.civictrack.entity.GrievanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrievanceRepository extends JpaRepository<Grievance, Long> {
    Optional<Grievance> findByTrackingNumber(String trackingNumber);
    List<Grievance> findByCitizenIdOrderByCreatedAtDesc(Long citizenId);
    List<Grievance> findByDepartmentIdOrderByCreatedAtDesc(Long departmentId);
    List<Grievance> findByStatusOrderByCreatedAtDesc(GrievanceStatus status);
    List<Grievance> findAllByOrderByCreatedAtDesc();
    long countByStatus(GrievanceStatus status);
}

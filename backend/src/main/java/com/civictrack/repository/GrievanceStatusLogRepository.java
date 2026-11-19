package com.civictrack.repository;

import com.civictrack.entity.GrievanceStatusLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrievanceStatusLogRepository extends JpaRepository<GrievanceStatusLog, Long> {
    List<GrievanceStatusLog> findByGrievanceIdOrderByCreatedAtAsc(Long grievanceId);
}

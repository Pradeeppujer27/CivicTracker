package com.civictrack.service.impl;

import com.civictrack.dto.notification.NotificationResponse;
import com.civictrack.entity.Complaint;
import com.civictrack.entity.Notification;
import com.civictrack.entity.User;
import com.civictrack.exception.ResourceNotFoundException;
import com.civictrack.repository.NotificationRepository;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    @Transactional
    public void createStatusNotification(User citizen, Complaint complaint, String previousStatus, String newStatus, String adminRemarks) {
        if (citizen == null || complaint == null) {
            return;
        }

        String trackingNo = complaint.getComplaintNumber();
        String formattedStatus = newStatus != null ? newStatus.replace('_', ' ') : "UPDATED";
        String title = "Complaint Status: " + formattedStatus;

        StringBuilder messageBuilder = new StringBuilder();
        messageBuilder.append("Your grievance #").append(trackingNo);
        if (complaint.getTitle() != null && !complaint.getTitle().isBlank()) {
            messageBuilder.append(" (\"").append(complaint.getTitle()).append("\")");
        }
        messageBuilder.append(" was transitioned to ").append(formattedStatus).append(".");

        if (adminRemarks != null && !adminRemarks.isBlank()) {
            messageBuilder.append(" Note: ").append(adminRemarks.trim());
        }

        Notification notification = new Notification(
                citizen,
                complaint,
                trackingNo,
                title,
                messageBuilder.toString(),
                previousStatus,
                newStatus,
                adminRemarks != null ? adminRemarks.trim() : null
        );

        notificationRepository.save(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(UserPrincipal currentUser) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(UserPrincipal currentUser) {
        return notificationRepository.countByUserIdAndIsReadFalse(currentUser.getId());
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long notificationId, UserPrincipal currentUser) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }

        return mapToResponse(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(UserPrincipal currentUser) {
        notificationRepository.markAllAsReadByUserId(currentUser.getId(), LocalDateTime.now());
    }

    private NotificationResponse mapToResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getUser() != null ? n.getUser().getId() : null,
                n.getComplaint() != null ? n.getComplaint().getId() : null,
                n.getComplaintNumber(),
                n.getTitle(),
                n.getMessage(),
                n.getPreviousStatus(),
                n.getNewStatus(),
                n.getAdminRemarks(),
                n.isRead(),
                n.getReadAt(),
                n.getCreatedAt()
        );
    }
}

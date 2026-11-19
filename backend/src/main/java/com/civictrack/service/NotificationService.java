package com.civictrack.service;

import com.civictrack.dto.notification.NotificationResponse;
import com.civictrack.entity.Complaint;
import com.civictrack.entity.User;
import com.civictrack.security.UserPrincipal;

import java.util.List;

public interface NotificationService {

    void createStatusNotification(User citizen, Complaint complaint, String previousStatus, String newStatus, String adminRemarks);

    List<NotificationResponse> getUserNotifications(UserPrincipal currentUser);

    long getUnreadCount(UserPrincipal currentUser);

    NotificationResponse markAsRead(Long notificationId, UserPrincipal currentUser);

    void markAllAsRead(UserPrincipal currentUser);
}

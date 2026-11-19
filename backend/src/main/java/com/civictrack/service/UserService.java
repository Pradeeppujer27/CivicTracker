package com.civictrack.service;

import com.civictrack.dto.user.UserProfileResponse;
import com.civictrack.dto.user.UserUpdateRequest;
import com.civictrack.entity.User;
import com.civictrack.security.UserPrincipal;

import java.util.List;

public interface UserService {

    User getUserById(Long id);

    User getUserByEmail(String email);

    UserProfileResponse getProfile(UserPrincipal currentUser);

    UserProfileResponse getUserProfileById(Long id);

    UserProfileResponse updateProfile(UserUpdateRequest request, UserPrincipal currentUser);

    List<UserProfileResponse> getAllUsers();
}

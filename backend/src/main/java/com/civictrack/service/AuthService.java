package com.civictrack.service;

import com.civictrack.dto.auth.JwtAuthResponse;
import com.civictrack.dto.auth.LoginRequest;
import com.civictrack.dto.auth.RegisterRequest;

public interface AuthService {

    JwtAuthResponse login(LoginRequest loginRequest);

    JwtAuthResponse loginCitizen(LoginRequest loginRequest);

    JwtAuthResponse loginAdmin(LoginRequest loginRequest);

    JwtAuthResponse loginStaff(LoginRequest loginRequest);

    JwtAuthResponse registerCitizen(RegisterRequest registerRequest);

    String register(RegisterRequest registerRequest);
}

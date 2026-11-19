package com.civictrack.controller;

import com.civictrack.dto.auth.JwtAuthResponse;
import com.civictrack.dto.auth.LoginRequest;
import com.civictrack.dto.auth.RegisterRequest;
import com.civictrack.dto.common.ApiResponse;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Unified Login endpoint for all users
     */
    @PostMapping("/login")
    public ResponseEntity<JwtAuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthResponse response = authService.login(loginRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Dedicated Citizen Login endpoint
     */
    @PostMapping("/login/citizen")
    public ResponseEntity<JwtAuthResponse> loginCitizen(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthResponse response = authService.loginCitizen(loginRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Dedicated Administrator Login endpoint
     */
    @PostMapping("/login/admin")
    public ResponseEntity<JwtAuthResponse> loginAdmin(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthResponse response = authService.loginAdmin(loginRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Dedicated Staff / Official Login endpoint
     */
    @PostMapping("/login/staff")
    public ResponseEntity<JwtAuthResponse> loginStaff(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthResponse response = authService.loginStaff(loginRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Public Citizen Registration endpoint
     * STRICT SECURITY: Forces ROLE_CITIZEN. Public users cannot register as ADMIN or STAFF.
     */
    @PostMapping("/register")
    public ResponseEntity<JwtAuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        JwtAuthResponse response = authService.registerCitizen(registerRequest);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Explicit Citizen Registration alias
     */
    @PostMapping("/register/citizen")
    public ResponseEntity<JwtAuthResponse> registerCitizen(@Valid @RequestBody RegisterRequest registerRequest) {
        JwtAuthResponse response = authService.registerCitizen(registerRequest);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Secure Logout endpoint
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Successfully logged out. Please clear your client token.", "OK"));
    }

    /**
     * Get Current Authenticated User Session Details
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Map<String, Object> details = new HashMap<>();
        details.put("id", currentUser.getId());
        details.put("email", currentUser.getEmail());
        details.put("fullName", currentUser.getFullName());
        details.put("department", currentUser.getDepartment());
        details.put("authorities", currentUser.getAuthorities());

        return ResponseEntity.ok(details);
    }
}

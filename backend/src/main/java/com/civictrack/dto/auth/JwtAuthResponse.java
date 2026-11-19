package com.civictrack.dto.auth;

import java.util.Collections;
import java.util.List;

public class JwtAuthResponse {

    private String accessToken;
    private String token;
    private String tokenType = "Bearer";
    private Long userId;
    private String email;
    private String fullName;
    private String role;
    private List<String> roles;
    private String department;
    private String accountNumber;
    private String phoneNumber;
    private String address;

    public JwtAuthResponse() {}

    public JwtAuthResponse(String accessToken, Long userId, String email, String fullName, String role, String department) {
        this(accessToken, userId, email, fullName, role, department, null, null, userId != null ? String.format("CT-RES-%05d", userId) : null);
    }

    public JwtAuthResponse(String accessToken, Long userId, String email, String fullName, String role, String department, String phoneNumber, String address, String accountNumber) {
        this.accessToken = accessToken;
        this.token = accessToken;
        this.tokenType = "Bearer";
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.roles = role != null ? Collections.singletonList(role) : Collections.emptyList();
        this.department = department;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.accountNumber = accountNumber != null ? accountNumber : (userId != null ? String.format("CT-RES-%05d", userId) : null);
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
        this.token = accessToken;
    }

    public String getToken() {
        return token != null ? token : accessToken;
    }

    public void setToken(String token) {
        this.token = token;
        this.accessToken = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
        this.roles = role != null ? Collections.singletonList(role) : Collections.emptyList();
    }

    public List<String> getRoles() {
        return roles != null ? roles : (role != null ? Collections.singletonList(role) : Collections.emptyList());
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}

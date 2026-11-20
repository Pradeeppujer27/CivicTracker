package com.civictrack.security;

import com.civictrack.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String fullName;
    private final String email;
    private final String password;
    private final String phoneNumber;
    private final String address;
    private final String department;
    private final String accountNumber;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean isActive;

    public UserPrincipal(Long id, String fullName, String email, String password, String department,
                         Collection<? extends GrantedAuthority> authorities, boolean isActive) {
        this(id, fullName, email, password, null, null, department, id != null ? String.format("CT-RES-%05d", id) : null, authorities, isActive);
    }

    public UserPrincipal(Long id, String fullName, String email, String password, String phoneNumber, String address, String department,
                         String accountNumber, Collection<? extends GrantedAuthority> authorities, boolean isActive) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.department = department;
        this.accountNumber = accountNumber != null ? accountNumber : (id != null ? String.format("CT-RES-%05d", id) : null);
        this.authorities = authorities;
        this.isActive = isActive;
    }

    public static UserPrincipal create(User user) {
        java.util.List<GrantedAuthority> authorities = new java.util.ArrayList<>();
        String roleName = user.getRole() != null ? user.getRole().name() : "ROLE_CITIZEN";
        authorities.add(new SimpleGrantedAuthority(roleName));
        if ("ROLE_STAFF".equals(roleName)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_OFFICIAL"));
        } else if ("ROLE_OFFICIAL".equals(roleName)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_STAFF"));
        }

        String accNo = user.getId() != null ? String.format("CT-RES-%05d", user.getId()) : "";

        return new UserPrincipal(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getPhoneNumber(),
                user.getAddress(),
                user.getDepartment(),
                accNo,
                authorities,
                user.getIsActive() != null ? user.getIsActive() : true
        );
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getAddress() {
        return address;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getDepartment() {
        return department;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive;
    }
}

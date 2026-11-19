package com.civictrack.service.impl;

import com.civictrack.dto.auth.JwtAuthResponse;
import com.civictrack.dto.auth.LoginRequest;
import com.civictrack.dto.auth.RegisterRequest;
import com.civictrack.entity.Role;
import com.civictrack.entity.User;
import com.civictrack.exception.BadRequestException;
import com.civictrack.exception.UnauthorizedException;
import com.civictrack.repository.UserRepository;
import com.civictrack.security.JwtTokenProvider;
import com.civictrack.security.UserPrincipal;
import com.civictrack.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                           UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Override
    public JwtAuthResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticate(loginRequest.getEmail(), loginRequest.getPassword());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        String primaryRole = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_CITIZEN");

        return new JwtAuthResponse(
                jwt,
                userPrincipal.getId(),
                userPrincipal.getEmail(),
                userPrincipal.getFullName(),
                primaryRole,
                userPrincipal.getDepartment(),
                userPrincipal.getPhoneNumber(),
                userPrincipal.getAddress(),
                userPrincipal.getAccountNumber()
        );
    }

    @Override
    public JwtAuthResponse loginCitizen(LoginRequest loginRequest) {
        JwtAuthResponse response = login(loginRequest);
        if (!"ROLE_CITIZEN".equals(response.getRole())) {
            throw new UnauthorizedException("Access Denied: This portal is reserved for citizens. Please use the administrative or staff portal.");
        }
        return response;
    }

    @Override
    public JwtAuthResponse loginAdmin(LoginRequest loginRequest) {
        JwtAuthResponse response = login(loginRequest);
        if (!"ROLE_ADMIN".equals(response.getRole())) {
            throw new UnauthorizedException("Access Denied: You do not have administrator privileges to access this console.");
        }
        return response;
    }

    @Override
    public JwtAuthResponse loginStaff(LoginRequest loginRequest) {
        JwtAuthResponse response = login(loginRequest);
        if (!"ROLE_STAFF".equals(response.getRole()) && !"ROLE_OFFICIAL".equals(response.getRole())) {
            throw new UnauthorizedException("Access Denied: You do not have municipal staff or official privileges.");
        }
        return response;
    }

    @Override
    @Transactional
    public JwtAuthResponse registerCitizen(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email address already exists. Please log in.");
        }

        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            if (userRepository.existsByPhoneNumber(request.getPhoneNumber().trim())) {
                throw new BadRequestException("An account with this mobile phone number is already registered.");
            }
        }

        // STRICT SECURITY: Public registration is strictly restricted to ROLE_CITIZEN.
        // Users can never register as ADMIN or STAFF through public registration.
        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
        user.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.ROLE_CITIZEN);
        user.setIsActive(true);

        User savedUser = userRepository.save(user);

        // Automatically authenticate and issue JWT
        Authentication authentication = authenticate(email, request.getPassword());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);

        return new JwtAuthResponse(
                jwt,
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                Role.ROLE_CITIZEN.name(),
                null
        );
    }

    @Override
    @Transactional
    public String register(RegisterRequest registerRequest) {
        registerCitizen(registerRequest);
        return "Citizen account registered successfully!";
    }

    private Authentication authenticate(String email, String password) {
        try {
            return authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email.toLowerCase().trim(), password)
            );
        } catch (BadCredentialsException ex) {
            throw new BadRequestException("Invalid email address or password. Please verify your credentials.");
        }
    }
}

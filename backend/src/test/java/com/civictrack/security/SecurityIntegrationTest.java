package com.civictrack.security;

import com.civictrack.dto.auth.LoginRequest;
import com.civictrack.dto.auth.RegisterRequest;
import com.civictrack.entity.Complaint;
import com.civictrack.entity.ComplaintStatus;
import com.civictrack.entity.Priority;
import com.civictrack.entity.Role;
import com.civictrack.entity.User;
import com.civictrack.exception.UnauthorizedException;
import com.civictrack.repository.ComplaintRepository;
import com.civictrack.repository.UserRepository;
import com.civictrack.service.AuthService;
import com.civictrack.service.ComplaintService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class SecurityIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User citizen1;
    private User citizen2;
    private User adminUser;
    private User staffUser;
    private Complaint complaint1;

    @BeforeEach
    public void setup() {
        // Create Citizen 1
        citizen1 = new User("Alice Citizen", "alice.security@test.com", "9876543210", "123 Street",
                passwordEncoder.encode("Password123!"), Role.ROLE_CITIZEN);
        citizen1 = userRepository.save(citizen1);

        // Create Citizen 2
        citizen2 = new User("Bob Citizen", "bob.security@test.com", "9876543211", "456 Avenue",
                passwordEncoder.encode("Password123!"), Role.ROLE_CITIZEN);
        citizen2 = userRepository.save(citizen2);

        // Create Admin
        adminUser = new User("Admin Chief", "admin.security@test.com", "9876543212", "City Hall",
                passwordEncoder.encode("Password123!"), Role.ROLE_ADMIN);
        adminUser = userRepository.save(adminUser);

        // Create Staff
        staffUser = new User("Staff Officer", "staff.security@test.com", "9876543213", "PWD Depot",
                passwordEncoder.encode("Password123!"), Role.ROLE_STAFF);
        staffUser.setDepartment("Public Works Department (PWD)");
        staffUser = userRepository.save(staffUser);

        // Create Complaint belonging to Citizen 1
        complaint1 = new Complaint();
        complaint1.setComplaintNumber("GRV-TEST-0001");
        complaint1.setUser(citizen1);
        complaint1.setTitle("Broken Water Pipe");
        complaint1.setDescription("Flooding on Main St.");
        complaint1.setCategory("Water Supply");
        complaint1.setDepartment("Public Works Department (PWD)");
        complaint1.setPriority(Priority.HIGH);
        complaint1.setStatus(ComplaintStatus.SUBMITTED);
        complaint1.setLocationAddress("Main St.");
        complaint1 = complaintRepository.save(complaint1);
    }

    @Test
    @DisplayName("Registration enforces ROLE_CITIZEN and prevents admin escalation")
    public void testCitizenRegistrationSecurity() {
        RegisterRequest req = new RegisterRequest("New Citizen", "new.citizen@test.com", "9988776655", "789 Blvd", "Secret123!");
        authService.registerCitizen(req);

        User saved = userRepository.findByEmail("new.citizen@test.com").orElse(null);
        Assertions.assertNotNull(saved);
        Assertions.assertEquals(Role.ROLE_CITIZEN, saved.getRole());
        Assertions.assertTrue(passwordEncoder.matches("Secret123!", saved.getPasswordHash()));
    }

    @Test
    @DisplayName("Admin login rejects citizen credentials")
    public void testAdminLoginRejectsCitizen() {
        LoginRequest req = new LoginRequest("alice.security@test.com", "Password123!");
        Assertions.assertThrows(UnauthorizedException.class, () -> {
            authService.loginAdmin(req);
        });
    }

    @Test
    @DisplayName("Citizen cannot inspect another citizen's complaint")
    public void testCitizenCannotAccessOtherCitizenComplaint() {
        UserPrincipal bobPrincipal = UserPrincipal.create(citizen2);
        Assertions.assertThrows(UnauthorizedException.class, () -> {
            complaintService.getComplaintById(complaint1.getId(), bobPrincipal);
        });
    }

    @Test
    @DisplayName("Citizen can access their own complaint")
    public void testCitizenCanAccessOwnComplaint() {
        UserPrincipal alicePrincipal = UserPrincipal.create(citizen1);
        var resp = complaintService.getComplaintById(complaint1.getId(), alicePrincipal);
        Assertions.assertNotNull(resp);
        Assertions.assertEquals("GRV-TEST-0001", resp.getComplaintNumber());
    }

    @Test
    @DisplayName("Admin can access any complaint")
    public void testAdminCanAccessAnyComplaint() {
        UserPrincipal adminPrincipal = UserPrincipal.create(adminUser);
        var resp = complaintService.getComplaintById(complaint1.getId(), adminPrincipal);
        Assertions.assertNotNull(resp);
        Assertions.assertEquals("GRV-TEST-0001", resp.getComplaintNumber());
    }

    @Test
    @DisplayName("Staff can access complaint assigned to their department")
    public void testStaffAccessAssignedComplaint() {
        UserPrincipal staffPrincipal = UserPrincipal.create(staffUser);
        var resp = complaintService.getComplaintById(complaint1.getId(), staffPrincipal);
        Assertions.assertNotNull(resp);
        Assertions.assertEquals("GRV-TEST-0001", resp.getComplaintNumber());
    }
}

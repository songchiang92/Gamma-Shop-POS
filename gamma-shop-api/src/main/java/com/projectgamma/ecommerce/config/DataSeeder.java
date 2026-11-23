package com.projectgamma.ecommerce.config;

import com.projectgamma.ecommerce.user.Role;
import com.projectgamma.ecommerce.user.User;
import com.projectgamma.ecommerce.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates three demo accounts on first start (passwords are BCrypt-hashed).
 * Disable with app.seed.enabled=false in application.yml.
 *
 *   admin@gammashop.local    / Admin123!
 *   staff@gammashop.local    / Staff123!
 *   customer@gammashop.local / Customer123!
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.enabled}")
    private boolean seedEnabled;

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }
        seedUser("admin@gammashop.local", "Admin123!", "Admin One", Role.ADMIN);
        seedUser("staff@gammashop.local", "Staff123!", "Staff One", Role.STAFF);
        seedUser("customer@gammashop.local", "Customer123!", "Customer One", Role.CUSTOMER);
    }

    private void seedUser(String email, String rawPassword, String fullName, Role role) {
        if (userRepository.existsByEmail(email)) {
            return;
        }
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .role(role)
                .enabled(true)
                .build();
        userRepository.save(user);
        log.info("Seeded demo user {} with role {}", email, role);
    }
}

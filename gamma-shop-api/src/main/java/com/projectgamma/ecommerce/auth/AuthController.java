package com.projectgamma.ecommerce.auth;

import com.projectgamma.ecommerce.auth.dto.*;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public authentication endpoints.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@AuthenticationPrincipal CustomUserDetails principal) {
        if (principal != null) {
            authService.logout(principal.getUser());
        }
        return Map.of("message", "Logged out");
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return Map.of("message", "Password updated. Please log in with your new password.");
    }

    @PostMapping("/guest")
    @ResponseStatus(HttpStatus.CREATED)
    public GuestSessionResponse createGuestSession() {
        return authService.createGuestSession();
    }

    @PostMapping("/guest/convert")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse convertGuestToUser(@Valid @RequestBody ConvertGuestRequest request) {
        return authService.convertGuestToUser(request);
    }
}

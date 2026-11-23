package com.projectgamma.ecommerce.auth;

import com.projectgamma.ecommerce.audit.AuditService;
import com.projectgamma.ecommerce.auth.dto.*;
import com.projectgamma.ecommerce.cart.CartService;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.notification.NotificationService;
import com.projectgamma.ecommerce.security.JwtService;
import com.projectgamma.ecommerce.user.Role;
import com.projectgamma.ecommerce.user.User;
import com.projectgamma.ecommerce.user.UserRepository;
import com.projectgamma.ecommerce.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Authentication module: register, loginUser, logoutUser, refreshToken,
 * forgotPassword, resetPassword. Guest checkout module: createGuestSession,
 * convertGuestToUser.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final GuestSessionRepository guestSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CartService cartService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshTokenDays;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw ApiException.conflict("An account with this email already exists");
        }
        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .phone(request.phone())
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();
        user = userRepository.save(user);
        auditService.track(user, "REGISTER", "New account registered");
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        auditService.track(user, "LOGIN", "User logged in");
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> ApiException.unauthorized("Unknown refresh token"));
        if (stored.isRevoked() || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw ApiException.unauthorized("Refresh token is expired or revoked. Please log in again.");
        }
        // rotate: revoke the old token, issue a fresh pair
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return buildAuthResponse(stored.getUser());
    }

    @Transactional
    public void logout(User user) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedFalse(user.getId());
        for (RefreshToken token : tokens) {
            token.setRevoked(true);
        }
        refreshTokenRepository.saveAll(tokens);
        auditService.track(user, "LOGOUT", "User logged out");
    }

    /**
     * Creates a reset token valid for 30 minutes. In production the token is
     * emailed; here it is also returned in the response so the flow can be
     * tested without an SMTP server (see README, "Limitations").
     */
    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.email()).orElse(null);
        if (user == null) {
            // do not reveal whether the email exists
            return Map.of("message", "If the email exists, a reset link has been sent.");
        }
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();
        passwordResetTokenRepository.save(token);
        notificationService.passwordReset(user, token.getToken());
        return Map.of(
                "message", "If the email exists, a reset link has been sent.",
                "devResetToken", token.getToken());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = passwordResetTokenRepository.findByToken(request.token())
                .orElseThrow(() -> ApiException.badRequest("Invalid reset token"));
        if (token.isUsed() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("Reset token is expired or already used");
        }
        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        token.setUsed(true);
        passwordResetTokenRepository.save(token);
        // force re-login everywhere
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedFalse(user.getId());
        for (RefreshToken refreshToken : tokens) {
            refreshToken.setRevoked(true);
        }
        refreshTokenRepository.saveAll(tokens);
    }

    @Transactional
    public GuestSessionResponse createGuestSession() {
        GuestSession session = GuestSession.builder()
                .token(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        guestSessionRepository.save(session);
        return new GuestSessionResponse(session.getToken(), session.getExpiresAt(),
                "Send this value in the X-Guest-Token header on /api/cart endpoints.");
    }

    @Transactional
    public AuthResponse convertGuestToUser(ConvertGuestRequest request) {
        GuestSession session = guestSessionRepository.findByToken(request.guestToken())
                .orElseThrow(() -> ApiException.notFound("Guest session not found"));
        if (session.getConvertedUser() != null) {
            throw ApiException.conflict("This guest session was already converted to an account");
        }
        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw ApiException.badRequest("Guest session has expired");
        }
        AuthResponse response = register(new RegisterRequest(
                request.email(), request.password(), request.fullName(), request.phone()));
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> ApiException.notFound("User not found after registration"));
        cartService.mergeGuestCartIntoUser(request.guestToken(), user);
        session.setConvertedUser(user);
        guestSessionRepository.save(session);
        return response;
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusDays(refreshTokenDays))
                .build();
        refreshTokenRepository.save(refreshToken);
        return AuthResponse.of(accessToken, refreshToken.getToken(), UserResponse.from(user));
    }
}

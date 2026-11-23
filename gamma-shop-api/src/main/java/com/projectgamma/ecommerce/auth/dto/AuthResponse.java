package com.projectgamma.ecommerce.auth.dto;

import com.projectgamma.ecommerce.user.dto.UserResponse;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UserResponse user
) {
    public static AuthResponse of(String accessToken, String refreshToken, UserResponse user) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", user);
    }
}

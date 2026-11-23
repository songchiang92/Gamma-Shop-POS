package com.projectgamma.ecommerce.user.dto;

import com.projectgamma.ecommerce.user.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        String phone,
        String address,
        String city,
        String role,
        boolean enabled,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(),
                user.getPhone(), user.getAddress(), user.getCity(), user.getRole().name(),
                user.isEnabled(), user.getCreatedAt());
    }
}

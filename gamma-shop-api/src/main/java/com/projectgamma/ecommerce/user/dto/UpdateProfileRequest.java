package com.projectgamma.ecommerce.user.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
        @NotBlank String fullName,
        String phone,
        String address,
        String city
) {
}

package com.projectgamma.ecommerce.audit.dto;

import java.time.LocalDateTime;

public record UserActionEntry(
        Long id,
        Long userId,
        String action,
        String details,
        LocalDateTime createdAt
) {
}

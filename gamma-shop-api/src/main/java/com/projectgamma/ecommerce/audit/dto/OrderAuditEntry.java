package com.projectgamma.ecommerce.audit.dto;

import java.time.LocalDateTime;

public record OrderAuditEntry(
        Long id,
        Long actorId,
        String action,
        String fromStatus,
        String toStatus,
        String details,
        LocalDateTime createdAt
) {
}

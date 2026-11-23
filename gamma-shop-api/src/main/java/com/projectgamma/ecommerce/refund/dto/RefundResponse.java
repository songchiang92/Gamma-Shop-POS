package com.projectgamma.ecommerce.refund.dto;

import java.time.LocalDateTime;

public record RefundResponse(
        Long id,
        Long orderId,
        String orderNumber,
        String requestedByEmail,
        String reason,
        String status,
        String reviewNote,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
}

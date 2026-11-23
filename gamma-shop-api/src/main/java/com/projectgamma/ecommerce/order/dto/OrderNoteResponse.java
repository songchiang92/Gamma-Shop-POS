package com.projectgamma.ecommerce.order.dto;

import java.time.LocalDateTime;

public record OrderNoteResponse(
        Long id,
        String authorEmail,
        String note,
        LocalDateTime createdAt
) {
}

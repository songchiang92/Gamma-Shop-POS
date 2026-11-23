package com.projectgamma.ecommerce.auth.dto;

import java.time.LocalDateTime;

public record GuestSessionResponse(
        String guestToken,
        LocalDateTime expiresAt,
        String usage
) {
}

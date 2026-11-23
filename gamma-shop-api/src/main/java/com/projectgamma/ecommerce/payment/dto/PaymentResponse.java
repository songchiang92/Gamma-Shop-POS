package com.projectgamma.ecommerce.payment.dto;

import com.projectgamma.ecommerce.payment.Payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long id,
        String intentId,
        BigDecimal amount,
        String currency,
        String status,
        String gatewayRef,
        int attempts,
        LocalDateTime createdAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(payment.getId(), payment.getIntentId(), payment.getAmount(),
                payment.getCurrency(), payment.getStatus().name(), payment.getGatewayRef(),
                payment.getAttempts(), payment.getCreatedAt());
    }
}

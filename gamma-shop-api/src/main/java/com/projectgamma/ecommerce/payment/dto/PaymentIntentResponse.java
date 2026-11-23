package com.projectgamma.ecommerce.payment.dto;

import java.math.BigDecimal;

public record PaymentIntentResponse(
        Long paymentId,
        String intentId,
        BigDecimal amount,
        String currency,
        String redirectUrl,
        String status
) {
}

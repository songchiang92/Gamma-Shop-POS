package com.projectgamma.ecommerce.refund.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRefundRequest(
        @NotNull Long orderId,
        @NotBlank String reason
) {
}

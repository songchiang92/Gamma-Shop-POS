package com.projectgamma.ecommerce.promotion.dto;

import com.projectgamma.ecommerce.promotion.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PromotionRequest(
        @NotBlank String code,
        @NotBlank String name,
        String description,
        @NotNull DiscountType discountType,
        @NotNull @DecimalMin(value = "0.01") BigDecimal discountValue,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        Boolean active
) {
}

package com.projectgamma.ecommerce.product.dto;

import jakarta.validation.constraints.Min;

public record SlotUpdateRequest(
        @Min(0) int quantity
) {
}

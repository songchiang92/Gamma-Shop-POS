package com.projectgamma.ecommerce.cart.dto;

import jakarta.validation.constraints.Min;

public record UpdateQuantityRequest(
        @Min(0) int quantity
) {
}

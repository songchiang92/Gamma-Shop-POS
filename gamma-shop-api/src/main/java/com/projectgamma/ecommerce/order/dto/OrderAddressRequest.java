package com.projectgamma.ecommerce.order.dto;

import jakarta.validation.constraints.NotBlank;

/** Staff correction of an order's delivery address/city (e.g. fixing a typo). */
public record OrderAddressRequest(
        @NotBlank String shippingAddress,
        @NotBlank String shippingCity
) {
}

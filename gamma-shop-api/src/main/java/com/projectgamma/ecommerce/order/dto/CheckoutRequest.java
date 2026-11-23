package com.projectgamma.ecommerce.order.dto;

public record CheckoutRequest(
        String promotionCode,
        /** Optional override; falls back to the customer's saved profile address/city if omitted. */
        String shippingAddress,
        String shippingCity
) {
}

package com.projectgamma.ecommerce.cart.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CartResponse(
        Long cartId,
        List<CartItemResponse> items,
        BigDecimal subtotal,
        LocalDateTime updatedAt
) {
}

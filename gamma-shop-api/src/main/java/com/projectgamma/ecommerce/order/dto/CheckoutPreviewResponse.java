package com.projectgamma.ecommerce.order.dto;

import java.math.BigDecimal;

public record CheckoutPreviewResponse(
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal grandTotal,
        String promotionCode
) {
}

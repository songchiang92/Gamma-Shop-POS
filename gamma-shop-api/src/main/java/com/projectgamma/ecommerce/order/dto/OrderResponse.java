package com.projectgamma.ecommerce.order.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        String status,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal grandTotal,
        String promotionCode,
        String userEmail,
        String assignedStaffEmail,
        String shippingAddress,
        String shippingCity,
        Long shipmentId,
        LocalDateTime createdAt,
        List<OrderItemResponse> items
) {
}

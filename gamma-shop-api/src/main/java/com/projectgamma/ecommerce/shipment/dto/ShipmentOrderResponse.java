package com.projectgamma.ecommerce.shipment.dto;

import com.projectgamma.ecommerce.order.Order;

import java.math.BigDecimal;

public record ShipmentOrderResponse(
        Long orderId,
        String orderNumber,
        String status,
        String userEmail,
        String shippingAddress,
        String shippingCity,
        int itemCount,
        BigDecimal grandTotal
) {
    public static ShipmentOrderResponse from(Order order) {
        int itemCount = order.getItems().stream().mapToInt(item -> item.getQuantity()).sum();
        return new ShipmentOrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name(),
                order.getUser().getEmail(),
                order.getShippingAddress(),
                order.getShippingCity(),
                itemCount,
                order.getGrandTotal());
    }
}

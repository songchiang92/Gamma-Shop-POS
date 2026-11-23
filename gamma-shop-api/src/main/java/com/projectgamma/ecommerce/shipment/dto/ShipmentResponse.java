package com.projectgamma.ecommerce.shipment.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ShipmentResponse(
        Long id,
        String vanLabel,
        String city,
        int capacity,
        String status,
        List<ShipmentOrderResponse> orders,
        int loadedCount,
        LocalDateTime createdAt,
        LocalDateTime dispatchedAt
) {
}

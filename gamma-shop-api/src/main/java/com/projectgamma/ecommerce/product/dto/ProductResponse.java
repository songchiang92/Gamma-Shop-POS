package com.projectgamma.ecommerce.product.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String description,
        BigDecimal price,
        int slotQuantity,
        int availableQuantity,
        boolean active,
        List<ProductImageResponse> images,
        List<String> promotionCodes,
        LocalDateTime createdAt
) {
}

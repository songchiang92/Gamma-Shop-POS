package com.projectgamma.ecommerce.promotion.dto;

import com.projectgamma.ecommerce.product.Product;
import com.projectgamma.ecommerce.promotion.Promotion;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PromotionResponse(
        Long id,
        String code,
        String name,
        String description,
        String discountType,
        BigDecimal discountValue,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        boolean active,
        boolean currentlyValid,
        List<Long> productIds
) {
    public static PromotionResponse from(Promotion promotion) {
        return new PromotionResponse(
                promotion.getId(),
                promotion.getCode(),
                promotion.getName(),
                promotion.getDescription(),
                promotion.getDiscountType().name(),
                promotion.getDiscountValue(),
                promotion.getStartsAt(),
                promotion.getEndsAt(),
                promotion.isActive(),
                promotion.isCurrentlyValid(),
                promotion.getProducts().stream().map(Product::getId).toList());
    }
}

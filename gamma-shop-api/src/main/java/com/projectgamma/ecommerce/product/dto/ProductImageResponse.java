package com.projectgamma.ecommerce.product.dto;

import com.projectgamma.ecommerce.product.ProductImage;

public record ProductImageResponse(
        Long id,
        String imageUrl,
        int sortOrder
) {
    public static ProductImageResponse from(ProductImage image) {
        return new ProductImageResponse(image.getId(), image.getImageUrl(), image.getSortOrder());
    }
}

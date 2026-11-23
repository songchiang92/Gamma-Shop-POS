package com.projectgamma.ecommerce.order.dto;

public record StockIssue(
        Long productId,
        String productName,
        int requested,
        int available
) {
}

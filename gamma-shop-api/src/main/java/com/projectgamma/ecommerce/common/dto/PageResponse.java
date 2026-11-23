package com.projectgamma.ecommerce.common.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Simple wrapper for paginated results, easier to read than Spring's Page JSON.
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}

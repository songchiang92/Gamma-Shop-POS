package com.projectgamma.ecommerce.order.dto;

import jakarta.validation.constraints.NotNull;

public record AssignStaffRequest(
        @NotNull Long staffId
) {
}

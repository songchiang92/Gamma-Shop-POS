package com.projectgamma.ecommerce.order.dto;

import com.projectgamma.ecommerce.order.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
        @NotNull OrderStatus status
) {
}

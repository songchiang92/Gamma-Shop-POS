package com.projectgamma.ecommerce.shipment.dto;

import jakarta.validation.constraints.Min;

public record UpdateCapacityRequest(
        @Min(1) int capacity
) {
}

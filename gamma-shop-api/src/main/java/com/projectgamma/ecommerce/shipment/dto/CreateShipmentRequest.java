package com.projectgamma.ecommerce.shipment.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateShipmentRequest(
        @NotBlank String vanLabel,
        /** Optional - if omitted, locked in from the first order loaded onto this van. */
        String city,
        /** Optional - defaults to 12 orders/packages if omitted. */
        Integer capacity
) {
}

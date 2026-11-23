package com.projectgamma.ecommerce.order.dto;

import jakarta.validation.constraints.NotBlank;

public record OrderNoteRequest(
        @NotBlank String note
) {
}

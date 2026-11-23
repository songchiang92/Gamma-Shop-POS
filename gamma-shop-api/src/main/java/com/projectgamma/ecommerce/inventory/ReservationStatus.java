package com.projectgamma.ecommerce.inventory;

public enum ReservationStatus {
    RESERVED,   // stock is locked for a pending order
    RELEASED,   // lock removed (cancelled / timed out)
    CONSUMED    // payment succeeded; stock was actually deducted
}

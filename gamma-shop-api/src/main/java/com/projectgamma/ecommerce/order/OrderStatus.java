package com.projectgamma.ecommerce.order;

/**
 * Order lifecycle. PACKED and SHIPPED extend the spreadsheet's base list to
 * support the Middle Office functions markOrderPacked/markOrderShipped.
 */
public enum OrderStatus {
    PENDING_PAYMENT,
    PAID,
    PROCESSING,
    PACKED,
    SHIPPED,
    COMPLETED,
    CANCELLED,
    REFUNDED
}

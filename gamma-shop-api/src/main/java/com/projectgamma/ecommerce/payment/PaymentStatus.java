package com.projectgamma.ecommerce.payment;

public enum PaymentStatus {
    CREATED,   // intent created, waiting for the customer to pay
    PENDING,   // gateway is processing
    SUCCESS,   // paid
    FAILED,    // gateway reported failure
    TIMEOUT,   // customer never completed payment in time
    REFUNDED   // money returned after a refund approval
}

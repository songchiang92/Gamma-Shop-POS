package com.projectgamma.ecommerce.payment.dto;

/**
 * Payload the gateway sends to our webhook. The X-Signature header must be
 * HMAC-SHA256(intentId|status|timestamp, webhook-secret) in hex.
 */
public record WebhookRequest(
        String intentId,
        String status,
        String gatewayRef,
        long timestamp
) {
}

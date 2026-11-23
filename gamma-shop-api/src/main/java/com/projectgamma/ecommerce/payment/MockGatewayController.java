package com.projectgamma.ecommerce.payment;

import com.projectgamma.ecommerce.payment.dto.WebhookRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Simulates the EXTERNAL payment gateway so the whole flow can be tested
 * locally without a real provider:
 *
 *   1. Create an intent: POST /api/payments/intent/{orderId} -> redirectUrl
 *   2. "Visit" the gateway: GET  /api/mock-gateway/pay/{intentId}
 *   3. Simulate paying:     POST /api/mock-gateway/pay/{intentId}/complete?outcome=success
 *      (or outcome=fail) -> the mock gateway signs a webhook payload with the
 *      shared secret and delivers it to our webhook handler.
 */
@RestController
@RequestMapping("/api/mock-gateway")
@RequiredArgsConstructor
public class MockGatewayController {

    private final PaymentService paymentService;

    @GetMapping("/pay/{intentId}")
    public Map<String, String> paymentPage(@PathVariable String intentId) {
        return Map.of(
                "gateway", "Gamma Mock Gateway",
                "intentId", intentId,
                "instructions", "This simulates the hosted payment page. To finish, call "
                        + "POST /api/mock-gateway/pay/" + intentId + "/complete?outcome=success "
                        + "(or outcome=fail).");
    }

    @PostMapping("/pay/{intentId}/complete")
    public Map<String, String> complete(@PathVariable String intentId,
                                        @RequestParam(defaultValue = "success") String outcome) {
        String status = "success".equalsIgnoreCase(outcome) ? "SUCCESS" : "FAILED";
        long timestamp = System.currentTimeMillis();
        String gatewayRef = "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String signature = paymentService.computeSignature(intentId, status, timestamp);
        paymentService.handleWebhook(new WebhookRequest(intentId, status, gatewayRef, timestamp), signature);
        return Map.of(
                "intentId", intentId,
                "outcome", status,
                "gatewayRef", gatewayRef,
                "message", "Webhook delivered and verified via HMAC signature");
    }
}

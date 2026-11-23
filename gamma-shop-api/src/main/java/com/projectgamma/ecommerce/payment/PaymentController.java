package com.projectgamma.ecommerce.payment;

import com.projectgamma.ecommerce.payment.dto.PaymentIntentResponse;
import com.projectgamma.ecommerce.payment.dto.PaymentResponse;
import com.projectgamma.ecommerce.payment.dto.WebhookRequest;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Customer payment endpoints + the public webhook the gateway calls.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/intent/{orderId}")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentIntentResponse createIntent(@AuthenticationPrincipal CustomUserDetails principal,
                                              @PathVariable Long orderId) {
        return paymentService.createPaymentIntent(principal.getUser(), orderId);
    }

    @PostMapping("/retry/{orderId}")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentIntentResponse retry(@AuthenticationPrincipal CustomUserDetails principal,
                                       @PathVariable Long orderId) {
        return paymentService.retryPayment(principal.getUser(), orderId);
    }

    @GetMapping("/order/{orderId}")
    public List<PaymentResponse> listForOrder(@AuthenticationPrincipal CustomUserDetails principal,
                                              @PathVariable Long orderId) {
        return paymentService.listForOrder(principal.getUser(), orderId);
    }

    /**
     * Public endpoint the payment gateway calls (server-to-server).
     * Security comes from the HMAC signature, not from a JWT.
     */
    @PostMapping("/webhook")
    public Map<String, Object> webhook(@RequestBody WebhookRequest payload,
                                       @RequestHeader(value = "X-Signature", required = false) String signature) {
        paymentService.handleWebhook(payload, signature);
        return Map.of("received", true);
    }
}

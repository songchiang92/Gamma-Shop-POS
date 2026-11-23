package com.projectgamma.ecommerce.payment;

import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.inventory.InventoryService;
import com.projectgamma.ecommerce.notification.NotificationService;
import com.projectgamma.ecommerce.order.Order;
import com.projectgamma.ecommerce.order.OrderRepository;
import com.projectgamma.ecommerce.order.OrderService;
import com.projectgamma.ecommerce.order.OrderStatus;
import com.projectgamma.ecommerce.payment.dto.PaymentIntentResponse;
import com.projectgamma.ecommerce.payment.dto.PaymentResponse;
import com.projectgamma.ecommerce.payment.dto.WebhookRequest;
import com.projectgamma.ecommerce.user.Role;
import com.projectgamma.ecommerce.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Payment gateway module: createPaymentIntent, redirectToPaymentGateway
 * (the redirectUrl), verifyPaymentResponse / handlePaymentCallbackWebhook,
 * validatePaymentSignature, updateOrderPaymentStatus, handlePaymentFailure,
 * handlePaymentTimeout, retryPayment and reconcilePaymentRecords.
 *
 * A real gateway (Stripe, Billplz, iPay88, ...) would host the payment page;
 * here MockGatewayController plays that role and calls the same webhook.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;

    @Value("${app.payment.webhook-secret}")
    private String webhookSecret;

    @Value("${app.payment.gateway-base-url}")
    private String gatewayBaseUrl;

    @Value("${app.payment.timeout-minutes}")
    private long timeoutMinutes;

    @Value("${app.payment.currency}")
    private String currency;

    // ---------- intent ----------

    /** createPaymentIntent() + redirectToPaymentGateway(): returns the URL to pay at. */
    @Transactional
    public PaymentIntentResponse createPaymentIntent(User requester, Long orderId) {
        Order order = requireOwnedOrder(requester, orderId);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw ApiException.conflict("Order is " + order.getStatus() + ", not awaiting payment");
        }
        // reuse an open intent if one exists
        List<Payment> history = paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
        for (Payment payment : history) {
            if (payment.getStatus() == PaymentStatus.CREATED || payment.getStatus() == PaymentStatus.PENDING) {
                return toIntentResponse(payment);
            }
        }
        Payment payment = newPayment(order, history.size() + 1);
        return toIntentResponse(payment);
    }

    /** retryPayment(): after a FAILED or TIMEOUT attempt, try again. */
    @Transactional
    public PaymentIntentResponse retryPayment(User requester, Long orderId) {
        Order order = requireOwnedOrder(requester, orderId);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw ApiException.conflict("Order is " + order.getStatus() + ", nothing to retry");
        }
        List<Payment> history = paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
        if (history.isEmpty()) {
            throw ApiException.badRequest("No previous payment attempt. Use POST /api/payments/intent/" + orderId);
        }
        PaymentStatus last = history.get(0).getStatus();
        if (last != PaymentStatus.FAILED && last != PaymentStatus.TIMEOUT) {
            throw ApiException.conflict("Last payment attempt is " + last + "; retry is only possible after FAILED or TIMEOUT");
        }
        // a timeout releases the stock lock, so re-reserve if needed
        if (inventoryService.activeReservationCount(order) == 0) {
            inventoryService.reserveForOrder(order);
        }
        Payment payment = newPayment(order, history.size() + 1);
        return toIntentResponse(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> listForOrder(User requester, Long orderId) {
        requireOwnedOrder(requester, orderId);
        return paymentRepository.findByOrderIdOrderByCreatedAtDesc(orderId)
                .stream().map(PaymentResponse::from).toList();
    }

    // ---------- webhook ----------

    /** validatePaymentSignature(): HMAC-SHA256 over "intentId|status|timestamp". */
    public String computeSignature(String intentId, String status, long timestamp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal((intentId + "|" + status + "|" + timestamp)
                    .getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not compute payment signature", ex);
        }
    }

    /** verifyPaymentResponse() + handlePaymentCallbackWebhook() + updateOrderPaymentStatus(). */
    @Transactional
    public void handleWebhook(WebhookRequest payload, String signature) {
        String expected = computeSignature(payload.intentId(), payload.status(), payload.timestamp());
        byte[] provided = signature == null ? new byte[0] : signature.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), provided)) {
            throw ApiException.unauthorized("Invalid payment signature");
        }
        Payment payment = paymentRepository.findByIntentId(payload.intentId())
                .orElseThrow(() -> ApiException.notFound("Unknown payment intent"));
        if (payment.getStatus() == PaymentStatus.SUCCESS || payment.getStatus() == PaymentStatus.REFUNDED) {
            log.info("Webhook for {} ignored (already {})", payload.intentId(), payment.getStatus());
            return; // idempotent
        }
        if ("SUCCESS".equalsIgnoreCase(payload.status())) {
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setGatewayRef(payload.gatewayRef());
            paymentRepository.save(payment);
            orderService.markPaid(payment.getOrder(), null);
        } else {
            handlePaymentFailure(payment, payload.gatewayRef());
        }
    }

    /** handlePaymentFailure(): the order stays PENDING_PAYMENT so it can be retried. */
    @Transactional
    public void handlePaymentFailure(Payment payment, String gatewayRef) {
        payment.setStatus(PaymentStatus.FAILED);
        payment.setGatewayRef(gatewayRef);
        paymentRepository.save(payment);
        orderService.audit(payment.getOrder(), null, "PAYMENT_FAILED", null, null,
                "Gateway reported failure for intent " + payment.getIntentId());
        log.info("Payment {} marked FAILED", payment.getIntentId());
    }

    // ---------- timeout & refund ----------

    /** handlePaymentTimeout(): scheduled; frees the stock lock so others can buy. */
    @Transactional
    public void handlePaymentTimeouts() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(timeoutMinutes);
        List<Payment> stale = paymentRepository.findByStatusInAndCreatedAtBefore(
                List.of(PaymentStatus.CREATED, PaymentStatus.PENDING), cutoff);
        for (Payment payment : stale) {
            payment.setStatus(PaymentStatus.TIMEOUT);
            paymentRepository.save(payment);
            Order order = payment.getOrder();
            inventoryService.releaseForOrder(order);
            orderService.audit(order, null, "PAYMENT_TIMEOUT", null, null,
                    "Intent " + payment.getIntentId() + " timed out; reservations released");
        }
        if (!stale.isEmpty()) {
            log.info("Marked {} payments as TIMEOUT", stale.size());
        }
    }

    /** Called by RefundService when a refund is approved. */
    @Transactional
    public void markOrderRefunded(Order order) {
        List<Payment> history = paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
        for (Payment payment : history) {
            if (payment.getStatus() == PaymentStatus.SUCCESS) {
                payment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(payment);
                return;
            }
        }
    }

    // ---------- reconciliation ----------

    /** reconcilePaymentRecords(): finds orders and payments that disagree. */
    @Transactional(readOnly = true)
    public Map<String, Object> reconcilePaymentRecords() {
        List<String> paidOrdersWithoutSuccess = new ArrayList<>();
        List<String> successPaymentsWithUnpaidOrders = new ArrayList<>();

        for (Order order : orderRepository.findAll()) {
            boolean moneyCaptured = switch (order.getStatus()) {
                case PAID, PROCESSING, PACKED, SHIPPED, COMPLETED, REFUNDED -> true;
                default -> false;
            };
            boolean hasSuccess = paymentRepository.findByOrderIdOrderByCreatedAtDesc(order.getId())
                    .stream()
                    .anyMatch(p -> p.getStatus() == PaymentStatus.SUCCESS || p.getStatus() == PaymentStatus.REFUNDED);
            if (moneyCaptured && !hasSuccess) {
                paidOrdersWithoutSuccess.add(order.getOrderNumber());
            }
            if (!moneyCaptured && hasSuccess) {
                successPaymentsWithUnpaidOrders.add(order.getOrderNumber());
            }
        }
        return Map.of(
                "paidOrdersWithoutSuccessfulPayment", paidOrdersWithoutSuccess,
                "successfulPaymentsWithUnpaidOrders", successPaymentsWithUnpaidOrders,
                "consistent", paidOrdersWithoutSuccess.isEmpty() && successPaymentsWithUnpaidOrders.isEmpty());
    }

    // ---------- helpers ----------

    private Payment newPayment(Order order, int attemptNumber) {
        Payment payment = Payment.builder()
                .order(order)
                .intentId("pi_" + UUID.randomUUID().toString().replace("-", ""))
                .amount(order.getGrandTotal())
                .currency(currency)
                .status(PaymentStatus.CREATED)
                .attempts(attemptNumber)
                .build();
        return paymentRepository.save(payment);
    }

    private PaymentIntentResponse toIntentResponse(Payment payment) {
        String redirectUrl = gatewayBaseUrl + "/pay/" + payment.getIntentId();
        return new PaymentIntentResponse(payment.getId(), payment.getIntentId(), payment.getAmount(),
                payment.getCurrency(), redirectUrl, payment.getStatus().name());
    }

    private Order requireOwnedOrder(User requester, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        boolean isStaff = requester.getRole() == Role.STAFF || requester.getRole() == Role.ADMIN;
        if (!isStaff && !order.getUser().getId().equals(requester.getId())) {
            throw ApiException.forbidden("This order belongs to another customer");
        }
        return order;
    }
}

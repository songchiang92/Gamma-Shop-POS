package com.projectgamma.ecommerce.notification;

import com.projectgamma.ecommerce.order.Order;
import com.projectgamma.ecommerce.promotion.Promotion;
import com.projectgamma.ecommerce.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Back Office notification module: sendOrderConfirmationEmail,
 * sendPaymentSuccessNotification, sendOrderStatusUpdate,
 * sendPromotionNotification, sendAbandonedCartReminder (+ password reset).
 *
 * Every notification is persisted. Real emailing is optional:
 * set app.mail.enabled=true and configure spring.mail.* to activate it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled}")
    private boolean mailEnabled;

    @Value("${app.mail.from}")
    private String from;

    // ---------- typed helpers ----------

    @Transactional
    public void orderConfirmation(Order order) {
        send(order.getUser(), "ORDER_CONFIRMATION",
                "Order " + order.getOrderNumber() + " received",
                "Thank you for your order " + order.getOrderNumber() + ". Total: MYR "
                        + order.getGrandTotal() + ". Please complete the payment to confirm it.");
    }

    @Transactional
    public void paymentSuccess(Order order) {
        send(order.getUser(), "PAYMENT_SUCCESS",
                "Payment received for " + order.getOrderNumber(),
                "We received your payment of MYR " + order.getGrandTotal()
                        + " for order " + order.getOrderNumber() + ". We will start processing it shortly.");
    }

    @Transactional
    public void orderStatusUpdate(Order order, String fromStatus, String toStatus) {
        send(order.getUser(), "ORDER_STATUS_UPDATE",
                "Order " + order.getOrderNumber() + " is now " + toStatus,
                "Your order " + order.getOrderNumber() + " moved from " + fromStatus + " to " + toStatus + ".");
    }

    @Transactional
    public void promotionNotification(User user, Promotion promotion) {
        send(user, "PROMOTION",
                "New promotion: " + promotion.getName(),
                "Use code " + promotion.getCode() + " - " + promotion.getDescription());
    }

    @Transactional
    public void abandonedCartReminder(User user, int itemCount) {
        send(user, "ABANDONED_CART",
                "You left " + itemCount + " item(s) in your cart",
                "Your Gamma Shop cart is still waiting for you. Complete your checkout before items sell out!");
    }

    @Transactional
    public void passwordReset(User user, String token) {
        send(user, "PASSWORD_RESET",
                "Reset your Gamma Shop password",
                "Use this token with POST /api/auth/reset-password within 30 minutes: " + token);
    }

    // ---------- core ----------

    @Transactional
    public void send(User user, String type, String subject, String body) {
        Notification notification = Notification.builder()
                .user(user)
                .recipientEmail(user == null ? null : user.getEmail())
                .type(type)
                .subject(subject)
                .body(body)
                .status("PENDING")
                .build();
        notification = notificationRepository.save(notification);

        if (!mailEnabled) {
            notification.setStatus("LOGGED");
            notificationRepository.save(notification);
            log.info("[NOTIFICATION:{}] to={} subject='{}' body='{}'", type,
                    notification.getRecipientEmail(), subject, body);
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            notification.setStatus("FAILED");
            notificationRepository.save(notification);
            log.warn("app.mail.enabled=true but no spring.mail.* configuration found");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(notification.getRecipientEmail());
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            notification.setStatus("SENT");
            notification.setSentAt(LocalDateTime.now());
        } catch (Exception ex) {
            notification.setStatus("FAILED");
            log.warn("Could not send email: {}", ex.getMessage());
        }
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> listForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}

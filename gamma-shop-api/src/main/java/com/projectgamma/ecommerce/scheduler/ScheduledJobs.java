package com.projectgamma.ecommerce.scheduler;

import com.projectgamma.ecommerce.cart.CartService;
import com.projectgamma.ecommerce.inventory.InventoryService;
import com.projectgamma.ecommerce.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Background jobs (enabled by @EnableScheduling on the application class):
 *  - payment timeouts: pending payments older than app.payment.timeout-minutes
 *  - reservation expiry: stock locks past app.reservation.expiry-minutes
 *  - abandoned carts: one reminder for carts untouched for 24 hours
 */
@Component
@RequiredArgsConstructor
public class ScheduledJobs {

    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    private final CartService cartService;

    @Scheduled(fixedDelayString = "PT5M")
    public void handlePaymentTimeouts() {
        paymentService.handlePaymentTimeouts();
    }

    @Scheduled(fixedDelayString = "PT5M")
    public void releaseExpiredReservations() {
        inventoryService.releaseExpiredReservations();
    }

    @Scheduled(fixedDelayString = "PT1H")
    public void abandonedCartReminders() {
        cartService.sendAbandonedCartReminders();
    }
}

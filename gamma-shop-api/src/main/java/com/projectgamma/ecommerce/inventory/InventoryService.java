package com.projectgamma.ecommerce.inventory;

import com.projectgamma.ecommerce.order.Order;
import com.projectgamma.ecommerce.order.OrderItem;
import com.projectgamma.ecommerce.product.Product;
import com.projectgamma.ecommerce.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Slot locking module: reserveInventory / releaseInventory, plus
 * reduceSlotAfterOrder (called "consume" here, done on payment success).
 *
 * available = slotQuantity (physical stock) - sum of active reservations
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryReservationRepository reservationRepository;
    private final ProductRepository productRepository;

    @Value("${app.reservation.expiry-minutes}")
    private long reservationExpiryMinutes;

    @Transactional(readOnly = true)
    public int availableQuantity(Product product) {
        long reserved = reservationRepository.sumByProductAndStatus(product.getId(), ReservationStatus.RESERVED);
        return (int) Math.max(0, product.getSlotQuantity() - reserved);
    }

    /** reserveInventory(): locks stock for every item of a new order. */
    @Transactional
    public void reserveForOrder(Order order) {
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(reservationExpiryMinutes);
        for (OrderItem item : order.getItems()) {
            InventoryReservation reservation = InventoryReservation.builder()
                    .product(item.getProduct())
                    .order(order)
                    .quantity(item.getQuantity())
                    .status(ReservationStatus.RESERVED)
                    .expiresAt(expiry)
                    .build();
            reservationRepository.save(reservation);
        }
    }

    /** releaseInventory(): unlock stock (order cancelled or payment timed out). */
    @Transactional
    public void releaseForOrder(Order order) {
        List<InventoryReservation> reservations =
                reservationRepository.findByOrderIdAndStatus(order.getId(), ReservationStatus.RESERVED);
        for (InventoryReservation reservation : reservations) {
            reservation.setStatus(ReservationStatus.RELEASED);
        }
        reservationRepository.saveAll(reservations);
    }

    /** reduceSlotAfterOrder(): payment succeeded, deduct the physical stock. */
    @Transactional
    public void consumeForOrder(Order order) {
        List<InventoryReservation> reservations =
                reservationRepository.findByOrderIdAndStatus(order.getId(), ReservationStatus.RESERVED);
        for (InventoryReservation reservation : reservations) {
            reservation.setStatus(ReservationStatus.CONSUMED);
        }
        reservationRepository.saveAll(reservations);
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setSlotQuantity(Math.max(0, product.getSlotQuantity() - item.getQuantity()));
            productRepository.save(product);
        }
    }

    @Transactional(readOnly = true)
    public int activeReservationCount(Order order) {
        return reservationRepository.findByOrderIdAndStatus(order.getId(), ReservationStatus.RESERVED).size();
    }

    /** Scheduled job: reservations past their expiry are released. */
    @Transactional
    public void releaseExpiredReservations() {
        List<InventoryReservation> expired =
                reservationRepository.findByStatusAndExpiresAtBefore(ReservationStatus.RESERVED, LocalDateTime.now());
        if (expired.isEmpty()) {
            return;
        }
        for (InventoryReservation reservation : expired) {
            reservation.setStatus(ReservationStatus.RELEASED);
        }
        reservationRepository.saveAll(expired);
        log.info("Released {} expired inventory reservations", expired.size());
    }
}

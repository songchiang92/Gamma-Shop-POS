package com.projectgamma.ecommerce.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    boolean existsByOrderNumber(String orderNumber);

    Page<Order> findByUserId(Long userId, Pageable pageable);

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    Page<Order> findByUserIdAndStatus(Long userId, OrderStatus status, Pageable pageable);

    boolean existsByUserId(Long userId);

    boolean existsByPromotionId(Long promotionId);

    /** Orders ready to be routed onto a shipment: paid/being handled, and not already loaded on a van. */
    List<Order> findByShipmentIsNullAndStatusIn(List<OrderStatus> statuses);

    List<Order> findByShipmentId(Long shipmentId);
}

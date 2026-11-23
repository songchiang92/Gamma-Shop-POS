package com.projectgamma.ecommerce.payment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByIntentId(String intentId);

    List<Payment> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    List<Payment> findByStatusInAndCreatedAtBefore(List<PaymentStatus> statuses, LocalDateTime cutoff);

    long countByOrderId(Long orderId);
}

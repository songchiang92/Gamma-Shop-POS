package com.projectgamma.ecommerce.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderAuditLogRepository extends JpaRepository<OrderAuditLog, Long> {

    List<OrderAuditLog> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}

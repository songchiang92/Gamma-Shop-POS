package com.projectgamma.ecommerce.refund;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    boolean existsByOrderIdAndStatus(Long orderId, RefundStatus status);

    List<RefundRequest> findByRequestedByIdOrderByCreatedAtDesc(Long userId);

    Page<RefundRequest> findByStatus(RefundStatus status, Pageable pageable);
}

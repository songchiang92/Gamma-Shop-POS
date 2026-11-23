package com.projectgamma.ecommerce.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface InventoryReservationRepository extends JpaRepository<InventoryReservation, Long> {

    @Query("select coalesce(sum(r.quantity), 0) from InventoryReservation r "
            + "where r.product.id = :productId and r.status = :status")
    long sumByProductAndStatus(@Param("productId") Long productId,
                               @Param("status") ReservationStatus status);

    List<InventoryReservation> findByOrderIdAndStatus(Long orderId, ReservationStatus status);

    List<InventoryReservation> findByStatusAndExpiresAtBefore(ReservationStatus status, LocalDateTime cutoff);
}

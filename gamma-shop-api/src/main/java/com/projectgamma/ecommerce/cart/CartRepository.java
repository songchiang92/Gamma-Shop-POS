package com.projectgamma.ecommerce.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    Optional<Cart> findByUserId(Long userId);

    Optional<Cart> findByGuestSessionId(Long guestSessionId);

    /** Carts of registered users that still contain items and were not touched since the cutoff. */
    @Query("select c from Cart c where c.user is not null and c.updatedAt < :cutoff "
            + "and (c.reminderSentAt is null or c.reminderSentAt < c.updatedAt) "
            + "and size(c.items) > 0")
    List<Cart> findAbandoned(@Param("cutoff") LocalDateTime cutoff);
}

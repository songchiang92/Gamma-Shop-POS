package com.projectgamma.ecommerce.shipment;

import com.projectgamma.ecommerce.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Shipment module: a van load of orders routed to a single delivery city,
 * capped at a staff-adjustable capacity (defaults to 12 orders/packages).
 */
@Entity
@Table(name = "shipments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "van_label", nullable = false, length = 100)
    private String vanLabel;

    /** Locked in from the first order loaded; every later order must match it. */
    private String city;

    @Builder.Default
    @Column(nullable = false)
    private int capacity = 12;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShipmentStatus status = ShipmentStatus.PLANNING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

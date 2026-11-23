package com.projectgamma.ecommerce.shipment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    List<Shipment> findByStatus(ShipmentStatus status);
}

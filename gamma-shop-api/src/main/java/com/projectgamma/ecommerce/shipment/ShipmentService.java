package com.projectgamma.ecommerce.shipment;

import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.order.Order;
import com.projectgamma.ecommerce.order.OrderRepository;
import com.projectgamma.ecommerce.order.OrderService;
import com.projectgamma.ecommerce.order.OrderStatus;
import com.projectgamma.ecommerce.shipment.dto.CreateShipmentRequest;
import com.projectgamma.ecommerce.shipment.dto.ShipmentOrderResponse;
import com.projectgamma.ecommerce.shipment.dto.ShipmentResponse;
import com.projectgamma.ecommerce.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Shipment module: groups paid orders into van loads by delivery city
 * instead of by transaction, so one van can deliver everything for one
 * city in a single run. A van (shipment) is capped at a staff-adjustable
 * capacity - orders/packages, not product units - and every order on it
 * must ship to the same city.
 */
@Service
@RequiredArgsConstructor
public class ShipmentService {

    /** Orders in these statuses are paid and being handled, but haven't left the building yet. */
    private static final Set<OrderStatus> ELIGIBLE_STATUSES =
            Set.of(OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.PACKED);

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    @Transactional(readOnly = true)
    public List<ShipmentOrderResponse> listUnassignedOrders(String city) {
        List<Order> orders = orderRepository.findByShipmentIsNullAndStatusIn(List.copyOf(ELIGIBLE_STATUSES));
        return orders.stream()
                .filter(o -> city == null || city.isBlank() || city.equalsIgnoreCase(o.getShippingCity()))
                .sorted(Comparator
                        .comparing((Order o) -> o.getShippingCity() == null ? "" : o.getShippingCity(),
                                String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Order::getCreatedAt))
                .map(ShipmentOrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShipmentResponse> listShipments(ShipmentStatus status) {
        List<Shipment> shipments = status == null ? shipmentRepository.findAll() : shipmentRepository.findByStatus(status);
        return shipments.stream()
                .sorted(Comparator.comparing(Shipment::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShipmentResponse getShipment(Long id) {
        return toResponse(find(id));
    }

    @Transactional
    public ShipmentResponse createShipment(CreateShipmentRequest request, User staff) {
        Shipment shipment = Shipment.builder()
                .vanLabel(request.vanLabel().trim())
                .city(blankToNull(request.city()))
                .capacity(request.capacity() == null ? 12 : request.capacity())
                .status(ShipmentStatus.PLANNING)
                .createdBy(staff)
                .build();
        if (shipment.getCapacity() < 1) {
            throw ApiException.badRequest("Capacity must be at least 1.");
        }
        return toResponse(shipmentRepository.save(shipment));
    }

    /** Loads one order onto a van - checked into the shipment, not dragged. */
    @Transactional
    public ShipmentResponse addOrder(Long shipmentId, Long orderId) {
        Shipment shipment = find(shipmentId);
        requirePlanning(shipment);

        Order order = orderService.find(orderId);
        if (order.getShipment() != null) {
            throw ApiException.conflict(
                    "Order " + order.getOrderNumber() + " is already loaded on van " + order.getShipment().getVanLabel() + ".");
        }
        if (!ELIGIBLE_STATUSES.contains(order.getStatus())) {
            throw ApiException.badRequest(
                    "Order " + order.getOrderNumber() + " isn't ready to ship yet (status " + order.getStatus() + ").");
        }
        if (order.getShippingCity() == null || order.getShippingCity().isBlank()) {
            throw ApiException.badRequest(
                    "Order " + order.getOrderNumber() + " has no delivery address yet - add one before routing it.");
        }

        long loaded = orderRepository.findByShipmentId(shipmentId).size();
        if (loaded >= shipment.getCapacity()) {
            throw ApiException.conflict("Van " + shipment.getVanLabel() + " is full (" + shipment.getCapacity()
                    + " orders). Raise its capacity or start another van.");
        }

        if (shipment.getCity() == null) {
            shipment.setCity(order.getShippingCity());
            shipmentRepository.save(shipment);
        } else if (!shipment.getCity().equalsIgnoreCase(order.getShippingCity())) {
            throw ApiException.conflict("Van " + shipment.getVanLabel() + " is routed to " + shipment.getCity()
                    + ", but order " + order.getOrderNumber() + " delivers to " + order.getShippingCity() + ".");
        }

        order.setShipment(shipment);
        orderRepository.save(order);
        return toResponse(find(shipmentId));
    }

    /** Un-checks an order from a van (mistakes, re-routing) while it's still planning. */
    @Transactional
    public ShipmentResponse removeOrder(Long shipmentId, Long orderId) {
        Shipment shipment = find(shipmentId);
        requirePlanning(shipment);

        Order order = orderService.find(orderId);
        if (order.getShipment() == null || !order.getShipment().getId().equals(shipmentId)) {
            throw ApiException.badRequest("That order isn't loaded on this van.");
        }
        order.setShipment(null);
        orderRepository.save(order);
        return toResponse(find(shipmentId));
    }

    /** Staff judgment call: raise or lower how many orders this specific van can take. */
    @Transactional
    public ShipmentResponse updateCapacity(Long shipmentId, int capacity) {
        Shipment shipment = find(shipmentId);
        requirePlanning(shipment);
        if (capacity < 1) {
            throw ApiException.badRequest("Capacity must be at least 1.");
        }
        long loaded = orderRepository.findByShipmentId(shipmentId).size();
        if (capacity < loaded) {
            throw ApiException.badRequest(
                    "Van " + shipment.getVanLabel() + " already has " + loaded + " orders loaded - capacity can't go below that.");
        }
        shipment.setCapacity(capacity);
        return toResponse(shipmentRepository.save(shipment));
    }

    /** Sends the van out: every loaded order is advanced to SHIPPED in one go. */
    @Transactional
    public ShipmentResponse dispatch(Long shipmentId, User actor) {
        Shipment shipment = find(shipmentId);
        requirePlanning(shipment);

        List<Order> orders = orderRepository.findByShipmentId(shipmentId);
        if (orders.isEmpty()) {
            throw ApiException.badRequest("Load at least one order onto " + shipment.getVanLabel() + " before dispatching it.");
        }
        for (Order order : orders) {
            Order current = order;
            if (current.getStatus() == OrderStatus.PAID) {
                current = orderService.transition(current, OrderStatus.PROCESSING, actor,
                        "STATUS_PROCESSING", "Auto-advanced for dispatch on " + shipment.getVanLabel());
            }
            orderService.transition(current, OrderStatus.SHIPPED, actor,
                    "STATUS_SHIPPED", "Dispatched on " + shipment.getVanLabel());
        }

        shipment.setStatus(ShipmentStatus.DISPATCHED);
        shipment.setDispatchedAt(LocalDateTime.now());
        return toResponse(shipmentRepository.save(shipment));
    }

    /** Cancels a van that hasn't gone out yet, releasing every order back to the unassigned pool. */
    @Transactional
    public void deleteShipment(Long shipmentId) {
        Shipment shipment = find(shipmentId);
        requirePlanning(shipment);
        List<Order> orders = orderRepository.findByShipmentId(shipmentId);
        for (Order order : orders) {
            order.setShipment(null);
        }
        orderRepository.saveAll(orders);
        shipmentRepository.delete(shipment);
    }

    // ---------- helpers ----------

    private Shipment find(Long id) {
        return shipmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Shipment not found"));
    }

    private void requirePlanning(Shipment shipment) {
        if (shipment.getStatus() != ShipmentStatus.PLANNING) {
            throw ApiException.conflict("Van " + shipment.getVanLabel() + " has already been dispatched.");
        }
    }

    private ShipmentResponse toResponse(Shipment shipment) {
        List<ShipmentOrderResponse> orders = orderRepository.findByShipmentId(shipment.getId()).stream()
                .map(ShipmentOrderResponse::from)
                .toList();
        return new ShipmentResponse(
                shipment.getId(),
                shipment.getVanLabel(),
                shipment.getCity(),
                shipment.getCapacity(),
                shipment.getStatus().name(),
                orders,
                orders.size(),
                shipment.getCreatedAt(),
                shipment.getDispatchedAt());
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}

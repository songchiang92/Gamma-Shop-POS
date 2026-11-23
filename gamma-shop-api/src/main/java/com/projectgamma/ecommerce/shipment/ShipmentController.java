package com.projectgamma.ecommerce.shipment;

import com.projectgamma.ecommerce.security.CustomUserDetails;
import com.projectgamma.ecommerce.shipment.dto.CreateShipmentRequest;
import com.projectgamma.ecommerce.shipment.dto.ShipmentOrderResponse;
import com.projectgamma.ecommerce.shipment.dto.ShipmentResponse;
import com.projectgamma.ecommerce.shipment.dto.UpdateCapacityRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Middle Office delivery routing (STAFF or ADMIN, via the /api/admin/** security rule):
 * group paid orders into van loads by delivery city instead of by transaction number.
 */
@RestController
@RequestMapping("/api/admin/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    /** Orders that are paid/being handled, not yet on a van - the picker list. */
    @GetMapping("/unassigned")
    public List<ShipmentOrderResponse> unassigned(@RequestParam(required = false) String city) {
        return shipmentService.listUnassignedOrders(city);
    }

    @GetMapping
    public List<ShipmentResponse> list(@RequestParam(required = false) ShipmentStatus status) {
        return shipmentService.listShipments(status);
    }

    @GetMapping("/{id}")
    public ShipmentResponse get(@PathVariable Long id) {
        return shipmentService.getShipment(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShipmentResponse create(@AuthenticationPrincipal CustomUserDetails principal,
                                   @Valid @RequestBody CreateShipmentRequest request) {
        return shipmentService.createShipment(request, principal.getUser());
    }

    @PostMapping("/{id}/orders/{orderId}")
    public ShipmentResponse addOrder(@PathVariable Long id, @PathVariable Long orderId) {
        return shipmentService.addOrder(id, orderId);
    }

    @DeleteMapping("/{id}/orders/{orderId}")
    public ShipmentResponse removeOrder(@PathVariable Long id, @PathVariable Long orderId) {
        return shipmentService.removeOrder(id, orderId);
    }

    @PatchMapping("/{id}/capacity")
    public ShipmentResponse updateCapacity(@PathVariable Long id, @Valid @RequestBody UpdateCapacityRequest request) {
        return shipmentService.updateCapacity(id, request.capacity());
    }

    @PostMapping("/{id}/dispatch")
    public ShipmentResponse dispatch(@AuthenticationPrincipal CustomUserDetails principal, @PathVariable Long id) {
        return shipmentService.dispatch(id, principal.getUser());
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        shipmentService.deleteShipment(id);
        return Map.of("message", "Shipment deleted");
    }
}

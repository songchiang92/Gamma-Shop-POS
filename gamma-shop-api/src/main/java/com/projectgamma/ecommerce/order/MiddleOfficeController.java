package com.projectgamma.ecommerce.order;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.order.dto.*;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import com.projectgamma.ecommerce.user.UserService;
import com.projectgamma.ecommerce.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Middle Office (STAFF or ADMIN): viewPendingOrders, assignOrderToStaff,
 * updateOrderProcessingStatus, markOrderPacked/Shipped/Completed,
 * addOrderNotes, printOrderInvoice, listAllOrders, cancel unpaid orders.
 */
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class MiddleOfficeController {

    private final OrderService orderService;
    private final InvoiceService invoiceService;
    private final UserService userService;

    /** STAFF/ADMIN users an order can be assigned to - populates the assignee picker. */
    @GetMapping("/assignable-staff")
    public List<UserResponse> assignableStaff() {
        return userService.listAssignableStaff();
    }

    @GetMapping
    public PageResponse<OrderResponse> listAllOrders(@RequestParam(required = false) OrderStatus status,
                                                     @RequestParam(required = false) Long userId,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size) {
        return orderService.listAllOrders(status, userId, PageRequest.of(page, size));
    }

    @GetMapping("/pending")
    public PageResponse<OrderResponse> viewPendingOrders(@RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size) {
        return orderService.viewPendingOrders(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public OrderResponse getOrder(@AuthenticationPrincipal CustomUserDetails principal,
                                  @PathVariable Long id) {
        return orderService.getOrder(principal.getUser(), id);
    }

    @PostMapping("/{id}/assign")
    public OrderResponse assignToStaff(@AuthenticationPrincipal CustomUserDetails principal,
                                       @PathVariable Long id,
                                       @Valid @RequestBody AssignStaffRequest request) {
        return orderService.assignToStaff(id, request.staffId(), principal.getUser());
    }

    @PostMapping("/{id}/status")
    public OrderResponse updateStatus(@AuthenticationPrincipal CustomUserDetails principal,
                                      @PathVariable Long id,
                                      @Valid @RequestBody UpdateStatusRequest request) {
        return orderService.updateProcessingStatus(id, request.status(), principal.getUser());
    }

    @PostMapping("/{id}/packed")
    public OrderResponse markPacked(@AuthenticationPrincipal CustomUserDetails principal,
                                    @PathVariable Long id) {
        return orderService.updateProcessingStatus(id, OrderStatus.PACKED, principal.getUser());
    }

    @PostMapping("/{id}/shipped")
    public OrderResponse markShipped(@AuthenticationPrincipal CustomUserDetails principal,
                                     @PathVariable Long id) {
        return orderService.updateProcessingStatus(id, OrderStatus.SHIPPED, principal.getUser());
    }

    @PostMapping("/{id}/completed")
    public OrderResponse markCompleted(@AuthenticationPrincipal CustomUserDetails principal,
                                       @PathVariable Long id) {
        return orderService.updateProcessingStatus(id, OrderStatus.COMPLETED, principal.getUser());
    }

    @PostMapping("/{id}/cancel")
    public OrderResponse cancelUnpaidOrder(@AuthenticationPrincipal CustomUserDetails principal,
                                           @PathVariable Long id) {
        return orderService.cancelOrderByStaff(id, principal.getUser());
    }

    @PatchMapping("/{id}/address")
    public OrderResponse updateAddress(@AuthenticationPrincipal CustomUserDetails principal,
                                       @PathVariable Long id,
                                       @Valid @RequestBody OrderAddressRequest request) {
        return orderService.updateShippingAddress(id, request.shippingAddress(), request.shippingCity(), principal.getUser());
    }

    @PostMapping("/{id}/notes")
    public OrderNoteResponse addNote(@AuthenticationPrincipal CustomUserDetails principal,
                                     @PathVariable Long id,
                                     @Valid @RequestBody OrderNoteRequest request) {
        return orderService.addNote(id, principal.getUser(), request.note());
    }

    @GetMapping("/{id}/notes")
    public List<OrderNoteResponse> getNotes(@PathVariable Long id) {
        return orderService.getNotes(id);
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<byte[]> printInvoice(@PathVariable Long id) {
        byte[] pdf = invoiceService.generateInvoicePdf(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice-" + id + ".pdf")
                .body(pdf);
    }
}

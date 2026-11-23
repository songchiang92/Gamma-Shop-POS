package com.projectgamma.ecommerce.order;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.order.dto.*;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Customer order endpoints: checkout, preview totals, stock validation,
 * order history and cancellation. Requires login (guests must convert
 * their session first via /api/auth/guest/convert).
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse checkout(@AuthenticationPrincipal CustomUserDetails principal,
                                  @RequestBody(required = false) CheckoutRequest request) {
        return orderService.createOrder(principal.getUser(), request);
    }

    @PostMapping("/preview")
    public CheckoutPreviewResponse preview(@AuthenticationPrincipal CustomUserDetails principal,
                                           @RequestBody(required = false) CheckoutRequest request) {
        return orderService.previewOrder(principal.getUser(), request);
    }

    @PostMapping("/validate-stock")
    public Map<String, Object> validateStock(@AuthenticationPrincipal CustomUserDetails principal) {
        List<StockIssue> issues = orderService.validateStockBeforeCheckout(principal.getUser());
        return Map.of("ok", issues.isEmpty(), "issues", issues);
    }

    @GetMapping
    public PageResponse<OrderResponse> listMyOrders(@AuthenticationPrincipal CustomUserDetails principal,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size) {
        return orderService.listMyOrders(principal.getUser(), PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public OrderResponse getOrder(@AuthenticationPrincipal CustomUserDetails principal,
                                  @PathVariable Long id) {
        return orderService.getOrder(principal.getUser(), id);
    }

    @PostMapping("/{id}/cancel")
    public OrderResponse cancelOrder(@AuthenticationPrincipal CustomUserDetails principal,
                                     @PathVariable Long id) {
        return orderService.cancelOrder(principal.getUser(), id);
    }
}

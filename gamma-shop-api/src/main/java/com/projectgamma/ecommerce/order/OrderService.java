package com.projectgamma.ecommerce.order;

import com.projectgamma.ecommerce.audit.AuditService;
import com.projectgamma.ecommerce.cart.Cart;
import com.projectgamma.ecommerce.cart.CartItem;
import com.projectgamma.ecommerce.cart.CartService;
import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.inventory.InventoryService;
import com.projectgamma.ecommerce.notification.NotificationService;
import com.projectgamma.ecommerce.order.dto.*;
import com.projectgamma.ecommerce.product.Product;
import com.projectgamma.ecommerce.promotion.Promotion;
import com.projectgamma.ecommerce.promotion.PromotionService;
import com.projectgamma.ecommerce.user.Role;
import com.projectgamma.ecommerce.user.User;
import com.projectgamma.ecommerce.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Order module: createOrder, calculateOrderTotal (preview),
 * applyPromotionToOrder, validateStockBeforeCheckout, getOrderById,
 * listOrdersByUser, listAllOrders, updateOrderStatus, cancelOrder,
 * refundOrder. Also the Middle Office operations (assign staff,
 * packed/shipped/completed, notes).
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    /** Which status transitions are legal. */
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
            OrderStatus.PENDING_PAYMENT, Set.of(OrderStatus.PAID, OrderStatus.CANCELLED),
            OrderStatus.PAID, Set.of(OrderStatus.PROCESSING, OrderStatus.REFUNDED),
            OrderStatus.PROCESSING, Set.of(OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.COMPLETED, OrderStatus.REFUNDED),
            OrderStatus.PACKED, Set.of(OrderStatus.SHIPPED, OrderStatus.REFUNDED),
            OrderStatus.SHIPPED, Set.of(OrderStatus.COMPLETED, OrderStatus.REFUNDED),
            OrderStatus.COMPLETED, Set.of(OrderStatus.REFUNDED)
    );

    /** Statuses middle-office staff may set manually. */
    private static final Set<OrderStatus> STAFF_TARGETS = Set.of(
            OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.COMPLETED);

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ORDER_NUMBER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final OrderRepository orderRepository;
    private final OrderNoteRepository orderNoteRepository;
    private final OrderAuditLogRepository orderAuditLogRepository;
    private final UserRepository userRepository;
    private final CartService cartService;
    private final PromotionService promotionService;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    // ---------- checkout ----------

    /** createOrder(): turns the user's cart into a PENDING_PAYMENT order. */
    @Transactional
    public OrderResponse createOrder(User currentUser, CheckoutRequest request) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> ApiException.notFound("User not found"));
        Cart cart = cartService.getUserCartEntity(user);
        if (cart == null || cart.getItems().isEmpty()) {
            throw ApiException.badRequest("Your cart is empty");
        }
        List<StockIssue> issues = stockIssues(cart);
        if (!issues.isEmpty()) {
            StockIssue first = issues.get(0);
            throw ApiException.conflict("Not enough stock for '" + first.productName()
                    + "': requested " + first.requested() + ", available " + first.available());
        }

        BigDecimal subtotal = cartSubtotal(cart);
        Promotion promotion = null;
        BigDecimal discount = BigDecimal.ZERO;
        String code = request == null ? null : request.promotionCode();
        if (code != null && !code.isBlank()) {
            promotion = promotionService.validatePromotionEligibility(code.trim());
            discount = promotionService.calculateDiscount(promotion, toLines(cart));
            if (discount.compareTo(subtotal) > 0) {
                discount = subtotal;
            }
        }
        BigDecimal grandTotal = subtotal.subtract(discount);

        String requestAddress = request == null ? null : blankToNull(request.shippingAddress());
        String requestCity = request == null ? null : blankToNull(request.shippingCity());
        String shippingAddress = requestAddress != null ? requestAddress : user.getAddress();
        String shippingCity = requestCity != null ? requestCity : user.getCity();
        if (shippingAddress == null || shippingCity == null) {
            throw ApiException.badRequest("Add a delivery address and city before checking out.");
        }
        // first time this customer has given an address - save it to their profile as the default
        if (user.getAddress() == null && requestAddress != null) {
            user.setAddress(requestAddress);
            user.setCity(requestCity);
            userRepository.save(user);
        }

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .user(user)
                .status(OrderStatus.PENDING_PAYMENT)
                .subtotal(subtotal)
                .discountTotal(discount)
                .grandTotal(grandTotal)
                .promotion(promotion)
                .shippingAddress(shippingAddress)
                .shippingCity(shippingCity)
                .build();
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .productName(product.getName())
                    .unitPrice(product.getPrice())
                    .quantity(cartItem.getQuantity())
                    .lineTotal(lineTotal)
                    .build();
            order.getItems().add(orderItem);
        }
        order = orderRepository.save(order);

        inventoryService.reserveForOrder(order);
        cartService.clearCartEntity(cart);
        audit(order, user, "ORDER_CREATED", null, OrderStatus.PENDING_PAYMENT,
                "Order created with " + order.getItems().size() + " item type(s)");
        auditService.track(user, "CREATE_ORDER", "Order " + order.getOrderNumber());
        notificationService.orderConfirmation(order);
        return toResponse(order);
    }

    /** calculateOrderTotal(): preview totals for the current cart without ordering. */
    @Transactional(readOnly = true)
    public CheckoutPreviewResponse previewOrder(User user, CheckoutRequest request) {
        Cart cart = cartService.getUserCartEntity(user);
        if (cart == null || cart.getItems().isEmpty()) {
            throw ApiException.badRequest("Your cart is empty");
        }
        BigDecimal subtotal = cartSubtotal(cart);
        BigDecimal discount = BigDecimal.ZERO;
        String code = request == null ? null : request.promotionCode();
        String appliedCode = null;
        if (code != null && !code.isBlank()) {
            Promotion promotion = promotionService.validatePromotionEligibility(code.trim());
            discount = promotionService.calculateDiscount(promotion, toLines(cart));
            if (discount.compareTo(subtotal) > 0) {
                discount = subtotal;
            }
            appliedCode = promotion.getCode();
        }
        return new CheckoutPreviewResponse(subtotal, discount, subtotal.subtract(discount), appliedCode);
    }

    /** validateStockBeforeCheckout(): reports items that no longer have enough stock. */
    @Transactional(readOnly = true)
    public List<StockIssue> validateStockBeforeCheckout(User user) {
        Cart cart = cartService.getUserCartEntity(user);
        if (cart == null || cart.getItems().isEmpty()) {
            return List.of();
        }
        return stockIssues(cart);
    }

    // ---------- retrieval ----------

    /** getOrderById(): owners see their own orders; staff/admin see all. */
    @Transactional(readOnly = true)
    public OrderResponse getOrder(User requester, Long orderId) {
        Order order = find(orderId);
        boolean isStaff = requester.getRole() == Role.STAFF || requester.getRole() == Role.ADMIN;
        if (!isStaff && !order.getUser().getId().equals(requester.getId())) {
            throw ApiException.forbidden("This order belongs to another customer");
        }
        return toResponse(order);
    }

    /** listOrdersByUser(): the logged-in customer's own orders. */
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> listMyOrders(User user, Pageable pageable) {
        return PageResponse.of(orderRepository.findByUserId(user.getId(), pageable).map(this::toResponse));
    }

    /** listAllOrders(): back office view with optional filters. */
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> listAllOrders(OrderStatus status, Long userId, Pageable pageable) {
        if (status != null && userId != null) {
            return PageResponse.of(orderRepository.findByUserIdAndStatus(userId, status, pageable).map(this::toResponse));
        }
        if (status != null) {
            return PageResponse.of(orderRepository.findByStatus(status, pageable).map(this::toResponse));
        }
        if (userId != null) {
            return PageResponse.of(orderRepository.findByUserId(userId, pageable).map(this::toResponse));
        }
        return PageResponse.of(orderRepository.findAll(pageable).map(this::toResponse));
    }

    /** viewPendingOrders(): PAID orders waiting for the middle office. */
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> viewPendingOrders(Pageable pageable) {
        return PageResponse.of(orderRepository.findByStatus(OrderStatus.PAID, pageable).map(this::toResponse));
    }

    // ---------- status changes ----------

    /** Central, validated status change with audit log + notification. */
    @Transactional
    public Order transition(Order order, OrderStatus target, User actor, String action, String details) {
        OrderStatus from = order.getStatus();
        Set<OrderStatus> allowed = ALLOWED.getOrDefault(from, Set.of());
        if (!allowed.contains(target)) {
            throw ApiException.conflict("Cannot change order from " + from + " to " + target);
        }
        order.setStatus(target);
        order = orderRepository.save(order);
        audit(order, actor, action, from, target, details);
        notificationService.orderStatusUpdate(order, from.name(), target.name());
        return order;
    }

    /** Called by PaymentService when the gateway confirms payment. */
    @Transactional
    public void markPaid(Order order, User actor) {
        if (order.getStatus() == OrderStatus.PAID) {
            return; // idempotent
        }
        inventoryService.consumeForOrder(order);
        transition(order, OrderStatus.PAID, actor, "PAYMENT_SUCCESS", "Payment confirmed by gateway");
        notificationService.paymentSuccess(order);
    }

    /** cancelOrder(): a customer may cancel while the order is still unpaid. */
    @Transactional
    public OrderResponse cancelOrder(User user, Long orderId) {
        Order order = find(orderId);
        if (!order.getUser().getId().equals(user.getId())) {
            throw ApiException.forbidden("This order belongs to another customer");
        }
        return toResponse(cancelInternal(order, user));
    }

    /** Middle office / payment-timeout cancellation. */
    @Transactional
    public Order cancelInternal(Order order, User actor) {
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw ApiException.conflict("Only orders that are still PENDING_PAYMENT can be cancelled. "
                    + "Use a refund request for paid orders.");
        }
        inventoryService.releaseForOrder(order);
        Order updated = transition(order, OrderStatus.CANCELLED, actor, "ORDER_CANCELLED", "Order cancelled");
        if (actor != null) {
            auditService.track(actor, "CANCEL_ORDER", "Order " + order.getOrderNumber());
        }
        return updated;
    }

    /** Middle office cancel of an unpaid order, in a single transaction. */
    @Transactional
    public OrderResponse cancelOrderByStaff(Long orderId, User actor) {
        Order order = find(orderId);
        return toResponse(cancelInternal(order, actor));
    }

    /** refundOrder(): status to REFUNDED and stock added back (reslot). */
    @Transactional
    public Order refundOrder(Order order, User actor) {
        Order updated = transition(order, OrderStatus.REFUNDED, actor, "ORDER_REFUNDED", "Refund approved");
        for (OrderItem item : updated.getItems()) {
            Product product = item.getProduct();
            product.setSlotQuantity(product.getSlotQuantity() + item.getQuantity());
        }
        return orderRepository.save(updated);
    }

    // ---------- middle office ----------

    /** assignOrderToStaff() */
    @Transactional
    public OrderResponse assignToStaff(Long orderId, Long staffId, User actor) {
        Order order = find(orderId);
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> ApiException.notFound("Staff user not found"));
        if (staff.getRole() != Role.STAFF && staff.getRole() != Role.ADMIN) {
            throw ApiException.badRequest("Orders can only be assigned to STAFF or ADMIN users");
        }
        order.setAssignedStaff(staff);
        order = orderRepository.save(order);
        audit(order, actor, "ASSIGNED_TO_STAFF", null, null, "Assigned to " + staff.getEmail());
        return toResponse(order);
    }

    /** updateOrderProcessingStatus() + markOrderPacked/Shipped/Completed() */
    @Transactional
    public OrderResponse updateProcessingStatus(Long orderId, OrderStatus target, User actor) {
        if (!STAFF_TARGETS.contains(target)) {
            throw ApiException.badRequest("Middle office can only set PROCESSING, PACKED, SHIPPED or COMPLETED. "
                    + "Payments, cancellations and refunds have their own endpoints.");
        }
        Order order = find(orderId);
        Order updated = transition(order, target, actor, "STATUS_" + target.name(), "Set by middle office");
        return toResponse(updated);
    }

    /** Staff correction of a delivery address (typos, unit numbers, etc.), used when routing shipments. */
    @Transactional
    public OrderResponse updateShippingAddress(Long orderId, String shippingAddress, String shippingCity, User actor) {
        Order order = find(orderId);
        order.setShippingAddress(shippingAddress.trim());
        order.setShippingCity(shippingCity.trim());
        order = orderRepository.save(order);
        audit(order, actor, "SHIPPING_ADDRESS_UPDATED", null, null,
                "Delivery address updated to " + shippingCity.trim());
        return toResponse(order);
    }

    /** addOrderNotes() */
    @Transactional
    public OrderNoteResponse addNote(Long orderId, User author, String text) {
        Order order = find(orderId);
        OrderNote note = OrderNote.builder()
                .order(order)
                .author(userRepository.getReferenceById(author.getId()))
                .note(text)
                .build();
        note = orderNoteRepository.save(note);
        return new OrderNoteResponse(note.getId(), author.getEmail(), note.getNote(), note.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<OrderNoteResponse> getNotes(Long orderId) {
        find(orderId); // 404 if missing
        return orderNoteRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .map(note -> new OrderNoteResponse(
                        note.getId(),
                        note.getAuthor() == null ? null : note.getAuthor().getEmail(),
                        note.getNote(),
                        note.getCreatedAt()))
                .toList();
    }

    // ---------- shared helpers ----------

    @Transactional(readOnly = true)
    public Order find(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
    }

    public void audit(Order order, User actor, String action, OrderStatus from, OrderStatus to, String details) {
        OrderAuditLog log = OrderAuditLog.builder()
                .order(order)
                .actor(actor == null ? null : userRepository.getReferenceById(actor.getId()))
                .action(action)
                .fromStatus(from == null ? null : from.name())
                .toStatus(to == null ? null : to.name())
                .details(details)
                .build();
        orderAuditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public OrderResponse toResponse(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name(),
                order.getSubtotal(),
                order.getDiscountTotal(),
                order.getGrandTotal(),
                order.getPromotion() == null ? null : order.getPromotion().getCode(),
                order.getUser().getEmail(),
                order.getAssignedStaff() == null ? null : order.getAssignedStaff().getEmail(),
                order.getShippingAddress(),
                order.getShippingCity(),
                order.getShipment() == null ? null : order.getShipment().getId(),
                order.getCreatedAt(),
                order.getItems().stream().map(OrderItemResponse::from).toList());
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private List<StockIssue> stockIssues(Cart cart) {
        List<StockIssue> issues = new ArrayList<>();
        for (CartItem item : cart.getItems()) {
            int available = inventoryService.availableQuantity(item.getProduct());
            if (item.getQuantity() > available) {
                issues.add(new StockIssue(item.getProduct().getId(), item.getProduct().getName(),
                        item.getQuantity(), available));
            }
        }
        return issues;
    }

    private BigDecimal cartSubtotal(Cart cart) {
        return cart.getItems().stream()
                .map(item -> item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<PromotionService.Line> toLines(Cart cart) {
        return cart.getItems().stream()
                .map(item -> new PromotionService.Line(
                        item.getProduct().getId(),
                        item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))))
                .toList();
    }

    private String generateOrderNumber() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder suffix = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                suffix.append(ORDER_NUMBER_CHARS.charAt(RANDOM.nextInt(ORDER_NUMBER_CHARS.length())));
            }
            String candidate = "ORD-" + date + "-" + suffix;
            if (!orderRepository.existsByOrderNumber(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique order number");
    }
}

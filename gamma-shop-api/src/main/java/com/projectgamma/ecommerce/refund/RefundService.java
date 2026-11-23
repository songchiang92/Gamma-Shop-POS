package com.projectgamma.ecommerce.refund;

import com.projectgamma.ecommerce.audit.AuditService;
import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.order.Order;
import com.projectgamma.ecommerce.order.OrderService;
import com.projectgamma.ecommerce.order.OrderStatus;
import com.projectgamma.ecommerce.payment.PaymentService;
import com.projectgamma.ecommerce.refund.dto.CreateRefundRequest;
import com.projectgamma.ecommerce.refund.dto.RefundResponse;
import com.projectgamma.ecommerce.user.User;
import com.projectgamma.ecommerce.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Refund & dispute module: createRefundRequest, approveRefund, rejectRefund.
 * Approval refunds the order (status REFUNDED + stock restored) and marks
 * the successful payment as REFUNDED.
 */
@Service
@RequiredArgsConstructor
public class RefundService {

    private static final Set<OrderStatus> REFUNDABLE = Set.of(
            OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.PACKED,
            OrderStatus.SHIPPED, OrderStatus.COMPLETED);

    private final RefundRequestRepository refundRequestRepository;
    private final OrderService orderService;
    private final PaymentService paymentService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional
    public RefundResponse create(User requester, CreateRefundRequest request) {
        Order order = orderService.find(request.orderId());
        if (!order.getUser().getId().equals(requester.getId())) {
            throw ApiException.forbidden("This order belongs to another customer");
        }
        if (!REFUNDABLE.contains(order.getStatus())) {
            throw ApiException.conflict("Orders with status " + order.getStatus() + " cannot be refunded");
        }
        if (refundRequestRepository.existsByOrderIdAndStatus(order.getId(), RefundStatus.PENDING)) {
            throw ApiException.conflict("A refund request for this order is already pending");
        }
        RefundRequest refund = RefundRequest.builder()
                .order(order)
                .requestedBy(userRepository.getReferenceById(requester.getId()))
                .reason(request.reason())
                .status(RefundStatus.PENDING)
                .build();
        refund = refundRequestRepository.save(refund);
        orderService.audit(order, requester, "REFUND_REQUESTED", null, null, request.reason());
        auditService.track(requester, "REQUEST_REFUND", "Order " + order.getOrderNumber());
        return toResponse(refund, requester.getEmail(), order);
    }

    @Transactional(readOnly = true)
    public java.util.List<RefundResponse> listMine(User requester) {
        return refundRequestRepository.findByRequestedByIdOrderByCreatedAtDesc(requester.getId())
                .stream()
                .map(refund -> toResponse(refund, refund.getRequestedBy().getEmail(), refund.getOrder()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<RefundResponse> listAdmin(RefundStatus status, Pageable pageable) {
        var page = status == null
                ? refundRequestRepository.findAll(pageable)
                : refundRequestRepository.findByStatus(status, pageable);
        return PageResponse.of(page.map(refund ->
                toResponse(refund, refund.getRequestedBy().getEmail(), refund.getOrder())));
    }

    /** approveRefund(): money back, stock back, order REFUNDED. */
    @Transactional
    public RefundResponse approve(User admin, Long refundId, String note) {
        RefundRequest refund = findPending(refundId);
        Order order = refund.getOrder();
        orderService.refundOrder(order, admin);
        paymentService.markOrderRefunded(order);
        refund.setStatus(RefundStatus.APPROVED);
        review(refund, admin, note);
        return toResponse(refund, refund.getRequestedBy().getEmail(), order);
    }

    /** rejectRefund() */
    @Transactional
    public RefundResponse reject(User admin, Long refundId, String note) {
        RefundRequest refund = findPending(refundId);
        refund.setStatus(RefundStatus.REJECTED);
        review(refund, admin, note);
        orderService.audit(refund.getOrder(), admin, "REFUND_REJECTED", null, null, note);
        return toResponse(refund, refund.getRequestedBy().getEmail(), refund.getOrder());
    }

    private void review(RefundRequest refund, User admin, String note) {
        refund.setReviewedBy(userRepository.getReferenceById(admin.getId()));
        refund.setReviewedAt(LocalDateTime.now());
        refund.setReviewNote(note);
        refundRequestRepository.save(refund);
    }

    private RefundRequest findPending(Long refundId) {
        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> ApiException.notFound("Refund request not found"));
        if (refund.getStatus() != RefundStatus.PENDING) {
            throw ApiException.conflict("This refund request was already " + refund.getStatus());
        }
        return refund;
    }

    private RefundResponse toResponse(RefundRequest refund, String requesterEmail, Order order) {
        return new RefundResponse(
                refund.getId(),
                order.getId(),
                order.getOrderNumber(),
                requesterEmail,
                refund.getReason(),
                refund.getStatus().name(),
                refund.getReviewNote(),
                refund.getCreatedAt(),
                refund.getReviewedAt());
    }
}

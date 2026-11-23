package com.projectgamma.ecommerce.refund;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.refund.dto.RefundResponse;
import com.projectgamma.ecommerce.refund.dto.ReviewRefundRequest;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Back office refund review (ADMIN only): approveRefund / rejectRefund.
 */
@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRefundController {

    private final RefundService refundService;

    @GetMapping
    public PageResponse<RefundResponse> list(@RequestParam(required = false) RefundStatus status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return refundService.listAdmin(status, PageRequest.of(page, size));
    }

    @PostMapping("/{id}/approve")
    public RefundResponse approve(@AuthenticationPrincipal CustomUserDetails principal,
                                  @PathVariable Long id,
                                  @RequestBody(required = false) ReviewRefundRequest request) {
        return refundService.approve(principal.getUser(), id, request == null ? null : request.note());
    }

    @PostMapping("/{id}/reject")
    public RefundResponse reject(@AuthenticationPrincipal CustomUserDetails principal,
                                 @PathVariable Long id,
                                 @RequestBody(required = false) ReviewRefundRequest request) {
        return refundService.reject(principal.getUser(), id, request == null ? null : request.note());
    }
}

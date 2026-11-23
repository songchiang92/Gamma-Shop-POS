package com.projectgamma.ecommerce.refund;

import com.projectgamma.ecommerce.refund.dto.CreateRefundRequest;
import com.projectgamma.ecommerce.refund.dto.RefundResponse;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Customer refund endpoints.
 */
@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RefundResponse create(@AuthenticationPrincipal CustomUserDetails principal,
                                 @Valid @RequestBody CreateRefundRequest request) {
        return refundService.create(principal.getUser(), request);
    }

    @GetMapping
    public List<RefundResponse> listMine(@AuthenticationPrincipal CustomUserDetails principal) {
        return refundService.listMine(principal.getUser());
    }
}

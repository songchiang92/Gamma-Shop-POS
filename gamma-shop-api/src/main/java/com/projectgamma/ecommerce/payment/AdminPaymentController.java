package com.projectgamma.ecommerce.payment;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Back office payment tools: reconcilePaymentRecords().
 */
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPaymentController {

    private final PaymentService paymentService;

    @GetMapping("/reconcile")
    public Map<String, Object> reconcile() {
        return paymentService.reconcilePaymentRecords();
    }
}

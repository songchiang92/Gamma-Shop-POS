package com.projectgamma.ecommerce.audit;

import com.projectgamma.ecommerce.audit.dto.OrderAuditEntry;
import com.projectgamma.ecommerce.audit.dto.UserActionEntry;
import com.projectgamma.ecommerce.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Back office audit views (STAFF/ADMIN via /api/admin/** security rule).
 */
@RestController
@RequestMapping("/api/admin/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    /** Full history of an order: creation, payments, status changes, refunds. */
    @GetMapping("/orders/{orderId}")
    public List<OrderAuditEntry> orderAudit(@PathVariable Long orderId) {
        return auditService.orderAudit(orderId);
    }

    /** What users did: registrations, logins, checkouts, cancellations, ... */
    @GetMapping("/user-actions")
    public PageResponse<UserActionEntry> userActions(@RequestParam(required = false) Long userId,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "50") int size) {
        return auditService.userActions(userId, PageRequest.of(page, size));
    }
}

package com.projectgamma.ecommerce.audit;

import com.projectgamma.ecommerce.audit.dto.OrderAuditEntry;
import com.projectgamma.ecommerce.audit.dto.UserActionEntry;
import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.order.OrderAuditLogRepository;
import com.projectgamma.ecommerce.user.User;
import com.projectgamma.ecommerce.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Back Office audit module: trackUserActions() plus read access to both
 * audit trails (order status changes and user actions).
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final UserActionLogRepository userActionLogRepository;
    private final OrderAuditLogRepository orderAuditLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void track(User user, String action, String details) {
        UserActionLog log = UserActionLog.builder()
                .user(user == null ? null : userRepository.getReferenceById(user.getId()))
                .action(action)
                .details(details)
                .build();
        userActionLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<OrderAuditEntry> orderAudit(Long orderId) {
        return orderAuditLogRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .map(log -> new OrderAuditEntry(
                        log.getId(),
                        log.getActor() == null ? null : log.getActor().getId(),
                        log.getAction(),
                        log.getFromStatus(),
                        log.getToStatus(),
                        log.getDetails(),
                        log.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<UserActionEntry> userActions(Long userId, Pageable pageable) {
        var page = userId == null
                ? userActionLogRepository.findAll(pageable)
                : userActionLogRepository.findByUserId(userId, pageable);
        return PageResponse.of(page.map(log -> new UserActionEntry(
                log.getId(),
                log.getUser() == null ? null : log.getUser().getId(),
                log.getAction(),
                log.getDetails(),
                log.getCreatedAt())));
    }
}

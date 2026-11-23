package com.projectgamma.ecommerce.notification;

import com.projectgamma.ecommerce.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Lets a logged-in user see the notifications the shop generated for them.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    public record NotificationView(Long id, String type, String subject, String body,
                                   String status, LocalDateTime createdAt) {
    }

    @GetMapping
    public List<NotificationView> myNotifications(@AuthenticationPrincipal CustomUserDetails principal) {
        return notificationService.listForUser(principal.getUser().getId()).stream()
                .map(n -> new NotificationView(n.getId(), n.getType(), n.getSubject(),
                        n.getBody(), n.getStatus(), n.getCreatedAt()))
                .toList();
    }
}

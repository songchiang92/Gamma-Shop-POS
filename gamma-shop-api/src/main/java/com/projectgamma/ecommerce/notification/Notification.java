package com.projectgamma.ecommerce.notification;

import com.projectgamma.ecommerce.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Back Office notification module: every notification is stored here.
 * When app.mail.enabled=false (the default) nothing is emailed - the record
 * is saved with status LOGGED and printed to the console instead.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(length = 200)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

package com.projectgamma.ecommerce.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserActionLogRepository extends JpaRepository<UserActionLog, Long> {

    Page<UserActionLog> findByUserId(Long userId, Pageable pageable);
}

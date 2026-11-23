package com.projectgamma.ecommerce.user;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Admin-only user management: listUsers, disableUserAccount.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public PageResponse<UserResponse> listUsers(@RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return userService.listUsers(PageRequest.of(page, size));
    }

    @PostMapping("/{id}/disable")
    public UserResponse disableUser(@PathVariable Long id) {
        return userService.disableUserAccount(id);
    }
}

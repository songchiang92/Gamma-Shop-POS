package com.projectgamma.ecommerce.user;

import com.projectgamma.ecommerce.security.CustomUserDetails;
import com.projectgamma.ecommerce.user.dto.UpdateProfileRequest;
import com.projectgamma.ecommerce.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints for the logged-in user's own account.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserResponse getMyProfile(@AuthenticationPrincipal CustomUserDetails principal) {
        return userService.getProfile(principal.getUser().getId());
    }

    @PutMapping("/me")
    public UserResponse updateMyProfile(@AuthenticationPrincipal CustomUserDetails principal,
                                        @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(principal.getUser().getId(), request);
    }

    @DeleteMapping("/me")
    public Map<String, String> deleteMyAccount(@AuthenticationPrincipal CustomUserDetails principal) {
        return Map.of("message", userService.deleteUser(principal.getUser().getId()));
    }
}

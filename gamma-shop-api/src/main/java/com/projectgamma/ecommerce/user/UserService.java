package com.projectgamma.ecommerce.user;

import com.projectgamma.ecommerce.auth.RefreshToken;
import com.projectgamma.ecommerce.auth.RefreshTokenRepository;
import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.order.OrderRepository;
import com.projectgamma.ecommerce.user.dto.UpdateProfileRequest;
import com.projectgamma.ecommerce.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Account module: getUserProfile / updateUserProfile / deleteUser /
 * listUsers (admin) / disableUserAccount (admin).
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional(readOnly = true)
    public UserResponse getProfile(Long userId) {
        return UserResponse.from(getUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getUser(userId);
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        user.setAddress(request.address());
        user.setCity(request.city());
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Deletes the account. If the user already has orders (which must be kept
     * for accounting), the account is disabled instead of hard-deleted.
     */
    @Transactional
    public String deleteUser(Long userId) {
        User user = getUser(userId);
        boolean hasOrders = orderRepository.existsByUserId(userId);
        revokeRefreshTokens(userId);
        if (hasOrders) {
            user.setEnabled(false);
            userRepository.save(user);
            return "Account has existing orders, so it was disabled instead of deleted.";
        }
        userRepository.delete(user);
        return "Account deleted.";
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(Pageable pageable) {
        return PageResponse.of(userRepository.findAll(pageable).map(UserResponse::from));
    }

    /** Enabled STAFF/ADMIN users - the pool an order can be assigned to (middle office). */
    @Transactional(readOnly = true)
    public List<UserResponse> listAssignableStaff() {
        return userRepository.findByRoleInAndEnabledTrueOrderByFullNameAsc(List.of(Role.STAFF, Role.ADMIN))
                .stream().map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse disableUserAccount(Long userId) {
        User user = getUser(userId);
        user.setEnabled(false);
        revokeRefreshTokens(userId);
        return UserResponse.from(userRepository.save(user));
    }

    private void revokeRefreshTokens(Long userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedFalse(userId);
        for (RefreshToken token : tokens) {
            token.setRevoked(true);
        }
        refreshTokenRepository.saveAll(tokens);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }
}

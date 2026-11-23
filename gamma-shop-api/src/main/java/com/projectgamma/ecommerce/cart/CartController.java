package com.projectgamma.ecommerce.cart;

import com.projectgamma.ecommerce.cart.dto.AddToCartRequest;
import com.projectgamma.ecommerce.cart.dto.CartResponse;
import com.projectgamma.ecommerce.cart.dto.UpdateQuantityRequest;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import com.projectgamma.ecommerce.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Cart endpoints. Work for both logged-in users (JWT) and guests
 * (X-Guest-Token header from POST /api/auth/guest).
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @PostMapping
    public CartResponse createCart(@AuthenticationPrincipal CustomUserDetails principal,
                                   @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        return cartService.getOrCreateCart(currentUser(principal), guestToken);
    }

    @GetMapping
    public CartResponse getCart(@AuthenticationPrincipal CustomUserDetails principal,
                                @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        return cartService.getOrCreateCart(currentUser(principal), guestToken);
    }

    @PostMapping("/items")
    public CartResponse addProduct(@AuthenticationPrincipal CustomUserDetails principal,
                                   @RequestHeader(value = "X-Guest-Token", required = false) String guestToken,
                                   @Valid @RequestBody AddToCartRequest request) {
        return cartService.addProduct(currentUser(principal), guestToken, request);
    }

    @PutMapping("/items/{productId}")
    public CartResponse updateQuantity(@AuthenticationPrincipal CustomUserDetails principal,
                                       @RequestHeader(value = "X-Guest-Token", required = false) String guestToken,
                                       @PathVariable Long productId,
                                       @Valid @RequestBody UpdateQuantityRequest request) {
        return cartService.updateQuantity(currentUser(principal), guestToken, productId, request.quantity());
    }

    @DeleteMapping("/items/{productId}")
    public CartResponse removeItem(@AuthenticationPrincipal CustomUserDetails principal,
                                   @RequestHeader(value = "X-Guest-Token", required = false) String guestToken,
                                   @PathVariable Long productId) {
        return cartService.removeItem(currentUser(principal), guestToken, productId);
    }

    @DeleteMapping
    public Map<String, String> clearCart(@AuthenticationPrincipal CustomUserDetails principal,
                                         @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        cartService.clearCart(currentUser(principal), guestToken);
        return Map.of("message", "Cart cleared");
    }

    /** Merge a guest cart into the logged-in user's cart (e.g. right after login). */
    @PostMapping("/merge")
    public CartResponse merge(@AuthenticationPrincipal CustomUserDetails principal,
                              @RequestHeader("X-Guest-Token") String guestToken) {
        User user = currentUser(principal);
        if (user == null) {
            throw ApiException.unauthorized("You must be logged in to merge a guest cart");
        }
        return cartService.mergeGuestCartIntoUser(guestToken, user);
    }

    private User currentUser(CustomUserDetails principal) {
        return principal == null ? null : principal.getUser();
    }
}

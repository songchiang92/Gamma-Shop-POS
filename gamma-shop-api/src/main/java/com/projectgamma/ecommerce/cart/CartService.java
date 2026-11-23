package com.projectgamma.ecommerce.cart;

import com.projectgamma.ecommerce.auth.GuestSession;
import com.projectgamma.ecommerce.auth.GuestSessionRepository;
import com.projectgamma.ecommerce.cart.dto.AddToCartRequest;
import com.projectgamma.ecommerce.cart.dto.CartItemResponse;
import com.projectgamma.ecommerce.cart.dto.CartResponse;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.inventory.InventoryService;
import com.projectgamma.ecommerce.notification.NotificationService;
import com.projectgamma.ecommerce.product.Product;
import com.projectgamma.ecommerce.product.ProductRepository;
import com.projectgamma.ecommerce.user.User;
import com.projectgamma.ecommerce.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Cart module: createCart, getCart, addProductToCart, updateCartItemQuantity,
 * removeCartItem, clearCart, mergeGuestCartWithUserCart + the abandoned cart
 * reminder used by the Back Office notification module.
 *
 * Identity: a logged-in user is taken from the JWT; a guest is identified
 * by the X-Guest-Token header.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final GuestSessionRepository guestSessionRepository;
    private final UserRepository userRepository;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;

    // ---------- public API ----------

    @Transactional
    public CartResponse getOrCreateCart(User user, String guestToken) {
        return toResponse(resolve(user, guestToken, true));
    }

    @Transactional
    public CartResponse addProduct(User user, String guestToken, AddToCartRequest request) {
        Cart cart = resolve(user, guestToken, true);
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> ApiException.notFound("Product not found"));
        if (!product.isActive()) {
            throw ApiException.badRequest("This product is not available");
        }
        CartItem existing = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(product.getId()))
                .findFirst().orElse(null);
        int newQuantity = request.quantity() + (existing == null ? 0 : existing.getQuantity());
        int available = inventoryService.availableQuantity(product);
        if (newQuantity > available) {
            throw ApiException.badRequest("Only " + available + " of '" + product.getName() + "' available");
        }
        if (existing == null) {
            CartItem item = CartItem.builder().cart(cart).product(product).quantity(request.quantity()).build();
            cart.getItems().add(item);
        } else {
            existing.setQuantity(newQuantity);
        }
        cart.setUpdatedAt(LocalDateTime.now());
        return toResponse(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse updateQuantity(User user, String guestToken, Long productId, int quantity) {
        Cart cart = resolve(user, guestToken, false);
        CartItem item = cart.getItems().stream()
                .filter(it -> it.getProduct().getId().equals(productId))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("This product is not in the cart"));
        if (quantity == 0) {
            cart.getItems().remove(item);
        } else {
            int available = inventoryService.availableQuantity(item.getProduct());
            if (quantity > available) {
                throw ApiException.badRequest("Only " + available + " available");
            }
            item.setQuantity(quantity);
        }
        cart.setUpdatedAt(LocalDateTime.now());
        return toResponse(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse removeItem(User user, String guestToken, Long productId) {
        return updateQuantity(user, guestToken, productId, 0);
    }

    @Transactional
    public void clearCart(User user, String guestToken) {
        Cart cart = resolve(user, guestToken, false);
        cart.getItems().clear();
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
    }

    /** mergeGuestCartWithUserCart(): quantities of identical products are summed. */
    @Transactional
    public CartResponse mergeGuestCartIntoUser(String guestToken, User user) {
        GuestSession session = requireValidGuestSession(guestToken);
        Cart userCart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> newUserCart(user));
        Optional<Cart> guestCartOpt = cartRepository.findByGuestSessionId(session.getId());
        if (guestCartOpt.isPresent()) {
            Cart guestCart = guestCartOpt.get();
            for (CartItem guestItem : guestCart.getItems()) {
                CartItem existing = userCart.getItems().stream()
                        .filter(item -> item.getProduct().getId().equals(guestItem.getProduct().getId()))
                        .findFirst().orElse(null);
                if (existing == null) {
                    CartItem copy = CartItem.builder()
                            .cart(userCart)
                            .product(guestItem.getProduct())
                            .quantity(guestItem.getQuantity())
                            .build();
                    userCart.getItems().add(copy);
                } else {
                    existing.setQuantity(existing.getQuantity() + guestItem.getQuantity());
                }
            }
            cartRepository.delete(guestCart);
        }
        userCart.setUpdatedAt(LocalDateTime.now());
        return toResponse(cartRepository.save(userCart));
    }

    // ---------- used by OrderService ----------

    @Transactional(readOnly = true)
    public Cart getUserCartEntity(User user) {
        return cartRepository.findByUserId(user.getId()).orElse(null);
    }

    @Transactional
    public void clearCartEntity(Cart cart) {
        cart.getItems().clear();
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
    }

    // ---------- scheduled job ----------

    /** sendAbandonedCartReminder(): carts untouched for 24h get one reminder. */
    @Transactional
    public void sendAbandonedCartReminders() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        List<Cart> abandoned = cartRepository.findAbandoned(cutoff);
        for (Cart cart : abandoned) {
            notificationService.abandonedCartReminder(cart.getUser(), cart.getItems().size());
            cart.setReminderSentAt(LocalDateTime.now());
            cartRepository.save(cart);
        }
        if (!abandoned.isEmpty()) {
            log.info("Sent {} abandoned cart reminders", abandoned.size());
        }
    }

    // ---------- helpers ----------

    private Cart resolve(User user, String guestToken, boolean createIfMissing) {
        if (user != null) {
            Optional<Cart> cart = cartRepository.findByUserId(user.getId());
            if (cart.isPresent()) {
                return cart.get();
            }
            if (createIfMissing) {
                return newUserCart(user);
            }
            throw ApiException.notFound("Cart is empty");
        }
        if (guestToken == null || guestToken.isBlank()) {
            throw ApiException.badRequest(
                    "Log in, or create a guest session via POST /api/auth/guest and send its token "
                            + "in the X-Guest-Token header");
        }
        GuestSession session = requireValidGuestSession(guestToken);
        Optional<Cart> cart = cartRepository.findByGuestSessionId(session.getId());
        if (cart.isPresent()) {
            return cart.get();
        }
        if (createIfMissing) {
            Cart created = Cart.builder().guestSession(session).build();
            return cartRepository.save(created);
        }
        throw ApiException.notFound("Cart is empty");
    }

    private Cart newUserCart(User user) {
        Cart cart = Cart.builder().user(userRepository.getReferenceById(user.getId())).build();
        return cartRepository.save(cart);
    }

    private GuestSession requireValidGuestSession(String guestToken) {
        GuestSession session = guestSessionRepository.findByToken(guestToken)
                .orElseThrow(() -> ApiException.unauthorized("Unknown guest token"));
        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw ApiException.unauthorized("Guest session has expired");
        }
        return session;
    }

    private CartResponse toResponse(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
                .map(item -> new CartItemResponse(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getProduct().getPrice(),
                        item.getQuantity(),
                        item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))))
                .toList();
        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(cart.getId(), items, subtotal, cart.getUpdatedAt());
    }
}

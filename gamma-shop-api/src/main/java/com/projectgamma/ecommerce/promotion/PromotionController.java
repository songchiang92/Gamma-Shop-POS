package com.projectgamma.ecommerce.promotion;

import com.projectgamma.ecommerce.cart.Cart;
import com.projectgamma.ecommerce.cart.CartService;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Customer-facing promotion check: validatePromotionEligibility() +
 * calculateDiscount() previewed against the caller's current cart.
 */
@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;
    private final CartService cartService;

    @GetMapping("/validate")
    @Transactional(readOnly = true)
    public Map<String, Object> validate(@AuthenticationPrincipal CustomUserDetails principal,
                                        @RequestParam String code) {
        Promotion promotion = promotionService.validatePromotionEligibility(code);
        Cart cart = cartService.getUserCartEntity(principal.getUser());
        if (cart == null || cart.getItems().isEmpty()) {
            throw ApiException.badRequest("Add items to your cart first to preview the discount");
        }
        List<PromotionService.Line> lines = cart.getItems().stream()
                .map(item -> new PromotionService.Line(
                        item.getProduct().getId(),
                        item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))))
                .toList();
        BigDecimal discount = promotionService.calculateDiscount(promotion, lines);
        return Map.of(
                "valid", true,
                "code", promotion.getCode(),
                "discountType", promotion.getDiscountType().name(),
                "estimatedDiscount", discount);
    }
}

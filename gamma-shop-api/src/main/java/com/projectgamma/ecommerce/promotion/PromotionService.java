package com.projectgamma.ecommerce.promotion;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.notification.NotificationService;
import com.projectgamma.ecommerce.order.OrderRepository;
import com.projectgamma.ecommerce.product.Product;
import com.projectgamma.ecommerce.product.ProductRepository;
import com.projectgamma.ecommerce.promotion.dto.PromotionRequest;
import com.projectgamma.ecommerce.promotion.dto.PromotionResponse;
import com.projectgamma.ecommerce.user.Role;
import com.projectgamma.ecommerce.user.User;
import com.projectgamma.ecommerce.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Promotion module: CRUD, assignPromotionToProduct / removePromotionFromProduct,
 * validatePromotionEligibility, calculateDiscount, schedulePromotionStartEnd
 * (startsAt/endsAt fields) and sendPromotionNotification.
 */
@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /** One line of a (potential) order: productId + money amount of that line. */
    public record Line(Long productId, BigDecimal amount) {
    }

    // ---------- CRUD ----------

    @Transactional(readOnly = true)
    public PageResponse<PromotionResponse> list(Pageable pageable) {
        return PageResponse.of(promotionRepository.findAll(pageable).map(PromotionResponse::from));
    }

    @Transactional(readOnly = true)
    public PromotionResponse get(Long id) {
        return PromotionResponse.from(find(id));
    }

    @Transactional
    public PromotionResponse create(PromotionRequest request) {
        if (promotionRepository.existsByCode(request.code())) {
            throw ApiException.conflict("A promotion with this code already exists");
        }
        Promotion promotion = Promotion.builder()
                .code(request.code())
                .name(request.name())
                .description(request.description())
                .discountType(request.discountType())
                .discountValue(request.discountValue())
                .startsAt(request.startsAt())
                .endsAt(request.endsAt())
                .active(request.active() == null || request.active())
                .build();
        return PromotionResponse.from(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse update(Long id, PromotionRequest request) {
        Promotion promotion = find(id);
        promotion.setCode(request.code());
        promotion.setName(request.name());
        promotion.setDescription(request.description());
        promotion.setDiscountType(request.discountType());
        promotion.setDiscountValue(request.discountValue());
        promotion.setStartsAt(request.startsAt());
        promotion.setEndsAt(request.endsAt());
        if (request.active() != null) {
            promotion.setActive(request.active());
        }
        return PromotionResponse.from(promotionRepository.save(promotion));
    }

    @Transactional
    public String delete(Long id) {
        Promotion promotion = find(id);
        if (orderRepository.existsByPromotionId(id)) {
            promotion.setActive(false);
            promotionRepository.save(promotion);
            return "Promotion was used by past orders, so it was deactivated instead of deleted.";
        }
        promotionRepository.delete(promotion);
        return "Promotion deleted.";
    }

    // ---------- product assignment ----------

    @Transactional
    public PromotionResponse assignToProduct(Long promotionId, Long productId) {
        Promotion promotion = find(promotionId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> ApiException.notFound("Product not found"));
        promotion.getProducts().add(product);
        return PromotionResponse.from(promotionRepository.save(promotion));
    }

    @Transactional
    public PromotionResponse removeFromProduct(Long promotionId, Long productId) {
        Promotion promotion = find(promotionId);
        promotion.getProducts().removeIf(product -> product.getId().equals(productId));
        return PromotionResponse.from(promotionRepository.save(promotion));
    }

    // ---------- eligibility & discount ----------

    /** validatePromotionEligibility(): code must exist, be active and inside its window. */
    @Transactional(readOnly = true)
    public Promotion validatePromotionEligibility(String code) {
        Promotion promotion = promotionRepository.findByCode(code)
                .orElseThrow(() -> ApiException.notFound("Unknown promotion code"));
        if (!promotion.isCurrentlyValid()) {
            throw ApiException.badRequest("Promotion '" + code + "' is not active right now");
        }
        return promotion;
    }

    /**
     * calculateDiscount(): if the promotion targets specific products, only
     * those lines are discounted; otherwise the whole amount is.
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateDiscount(Promotion promotion, List<Line> lines) {
        BigDecimal applicable;
        if (promotion.getProducts().isEmpty()) {
            applicable = lines.stream().map(Line::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            Set<Long> targetIds = promotion.getProducts().stream()
                    .map(Product::getId).collect(Collectors.toSet());
            applicable = lines.stream()
                    .filter(line -> targetIds.contains(line.productId()))
                    .map(Line::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        if (applicable.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("This promotion does not apply to any item in the order");
        }
        BigDecimal discount;
        if (promotion.getDiscountType() == DiscountType.PERCENTAGE) {
            discount = applicable.multiply(promotion.getDiscountValue())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } else {
            discount = promotion.getDiscountValue().min(applicable);
        }
        return discount.setScale(2, RoundingMode.HALF_UP);
    }

    // ---------- notification ----------

    /** sendPromotionNotification(): notify every enabled customer. */
    @Transactional
    public int notifyAllCustomers(Long promotionId) {
        Promotion promotion = find(promotionId);
        List<User> customers = userRepository.findByRoleAndEnabledTrue(Role.CUSTOMER);
        for (User customer : customers) {
            notificationService.promotionNotification(customer, promotion);
        }
        return customers.size();
    }

    private Promotion find(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Promotion not found"));
    }
}

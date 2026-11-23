package com.projectgamma.ecommerce.promotion;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.promotion.dto.PromotionRequest;
import com.projectgamma.ecommerce.promotion.dto.PromotionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin promotion management: CRUD, product assignment, broadcast notification.
 */
@RestController
@RequestMapping("/api/admin/promotions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPromotionController {

    private final PromotionService promotionService;

    @GetMapping
    public PageResponse<PromotionResponse> list(@RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return promotionService.list(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public PromotionResponse get(@PathVariable Long id) {
        return promotionService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PromotionResponse create(@Valid @RequestBody PromotionRequest request) {
        return promotionService.create(request);
    }

    @PutMapping("/{id}")
    public PromotionResponse update(@PathVariable Long id, @Valid @RequestBody PromotionRequest request) {
        return promotionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        return Map.of("message", promotionService.delete(id));
    }

    @PostMapping("/{id}/products/{productId}")
    public PromotionResponse assignToProduct(@PathVariable Long id, @PathVariable Long productId) {
        return promotionService.assignToProduct(id, productId);
    }

    @DeleteMapping("/{id}/products/{productId}")
    public PromotionResponse removeFromProduct(@PathVariable Long id, @PathVariable Long productId) {
        return promotionService.removeFromProduct(id, productId);
    }

    @PostMapping("/{id}/notify")
    public Map<String, Object> notifyCustomers(@PathVariable Long id) {
        int count = promotionService.notifyAllCustomers(id);
        return Map.of("message", "Promotion notification queued", "recipients", count);
    }
}

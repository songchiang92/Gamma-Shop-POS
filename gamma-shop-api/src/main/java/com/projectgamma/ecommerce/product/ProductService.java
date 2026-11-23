package com.projectgamma.ecommerce.product;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.inventory.InventoryService;
import com.projectgamma.ecommerce.order.OrderItemRepository;
import com.projectgamma.ecommerce.product.dto.ProductImageResponse;
import com.projectgamma.ecommerce.product.dto.ProductRequest;
import com.projectgamma.ecommerce.product.dto.ProductResponse;
import com.projectgamma.ecommerce.promotion.Promotion;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Product module: create/update/delete/get/list/search/filter products,
 * plus the "slot" (stock) functions updateProductSlot and reslotProduct.
 */
@Service
@RequiredArgsConstructor
public class ProductService {

    private static final BigDecimal MAX_PRICE = new BigDecimal("999999999");

    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final InventoryService inventoryService;

    // ---------- public catalog ----------

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> listProducts(Pageable pageable) {
        return PageResponse.of(productRepository.findByActiveTrue(pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long id) {
        Product product = find(id);
        if (!product.isActive()) {
            throw ApiException.notFound("Product not found");
        }
        return toResponse(product);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> searchProducts(String q, Pageable pageable) {
        return PageResponse.of(productRepository.search(q, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> filterProducts(BigDecimal minPrice, BigDecimal maxPrice,
                                                        Boolean inStock, Pageable pageable) {
        BigDecimal min = minPrice == null ? BigDecimal.ZERO : minPrice;
        BigDecimal max = maxPrice == null ? MAX_PRICE : maxPrice;
        if (Boolean.TRUE.equals(inStock)) {
            return PageResponse.of(productRepository
                    .findByActiveTrueAndPriceBetweenAndSlotQuantityGreaterThan(min, max, 0, pageable)
                    .map(this::toResponse));
        }
        return PageResponse.of(productRepository
                .findByActiveTrueAndPriceBetween(min, max, pageable)
                .map(this::toResponse));
    }

    // ---------- admin ----------

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> listAllProducts(Pageable pageable) {
        return PageResponse.of(productRepository.findAll(pageable).map(this::toResponse));
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.existsBySku(request.sku())) {
            throw ApiException.conflict("A product with this SKU already exists");
        }
        Product product = Product.builder()
                .sku(request.sku())
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .slotQuantity(request.slotQuantity())
                .active(request.active() == null || request.active())
                .build();
        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = find(id);
        product.setSku(request.sku());
        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setSlotQuantity(request.slotQuantity());
        if (request.active() != null) {
            product.setActive(request.active());
        }
        return toResponse(productRepository.save(product));
    }

    /**
     * Deletes a product. If it is referenced by past orders it is deactivated
     * (soft delete) instead, so order history stays intact.
     */
    @Transactional
    public String deleteProduct(Long id) {
        Product product = find(id);
        if (orderItemRepository.existsByProductId(id)) {
            product.setActive(false);
            productRepository.save(product);
            return "Product appears in past orders, so it was deactivated instead of deleted.";
        }
        productRepository.delete(product);
        return "Product deleted.";
    }

    /** updateProductSlot(): sets the absolute stock level. */
    @Transactional
    public ProductResponse updateProductSlot(Long id, int quantity) {
        Product product = find(id);
        product.setSlotQuantity(quantity);
        return toResponse(productRepository.save(product));
    }

    /** reslotProduct(): adds stock back (restock / returned goods). */
    @Transactional
    public ProductResponse reslotProduct(Long id, int quantity) {
        Product product = find(id);
        product.setSlotQuantity(product.getSlotQuantity() + quantity);
        return toResponse(productRepository.save(product));
    }

    // ---------- helpers ----------

    Product find(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Product not found"));
    }

    ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getSlotQuantity(),
                inventoryService.availableQuantity(product),
                product.isActive(),
                product.getImages().stream().map(ProductImageResponse::from).toList(),
                product.getPromotions().stream().map(Promotion::getCode).toList(),
                product.getCreatedAt());
    }
}

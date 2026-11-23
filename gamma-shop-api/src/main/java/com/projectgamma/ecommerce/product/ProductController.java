package com.projectgamma.ecommerce.product;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.product.dto.ProductResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * Public product catalog: listProducts, getProductById, searchProducts,
 * filterProducts. No login required.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public PageResponse<ProductResponse> listProducts(@RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "20") int size) {
        return productService.listProducts(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public ProductResponse getProduct(@PathVariable Long id) {
        return productService.getProduct(id);
    }

    @GetMapping("/search")
    public PageResponse<ProductResponse> searchProducts(@RequestParam String q,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return productService.searchProducts(q, PageRequest.of(page, size));
    }

    @GetMapping("/filter")
    public PageResponse<ProductResponse> filterProducts(@RequestParam(required = false) BigDecimal minPrice,
                                                        @RequestParam(required = false) BigDecimal maxPrice,
                                                        @RequestParam(required = false) Boolean inStock,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return productService.filterProducts(minPrice, maxPrice, inStock, PageRequest.of(page, size));
    }
}

package com.projectgamma.ecommerce.product;

import com.projectgamma.ecommerce.common.dto.PageResponse;
import com.projectgamma.ecommerce.product.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Admin product management: CRUD, stock ("slot") updates and image handling.
 */
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {

    private final ProductService productService;
    private final ProductImageService productImageService;

    @GetMapping
    public PageResponse<ProductResponse> listAll(@RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return productService.listAllProducts(PageRequest.of(page, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        return productService.createProduct(request);
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.updateProduct(id, request);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id) {
        return Map.of("message", productService.deleteProduct(id));
    }

    @PatchMapping("/{id}/slot")
    public ProductResponse updateSlot(@PathVariable Long id, @Valid @RequestBody SlotUpdateRequest request) {
        return productService.updateProductSlot(id, request.quantity());
    }

    @PostMapping("/{id}/reslot")
    public ProductResponse reslot(@PathVariable Long id, @Valid @RequestBody SlotUpdateRequest request) {
        return productService.reslotProduct(id, request.quantity());
    }

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ProductImageResponse uploadImage(@PathVariable Long id,
                                            @RequestParam("file") MultipartFile file,
                                            @RequestParam(defaultValue = "0") int sortOrder) {
        return productImageService.uploadImage(id, file, sortOrder);
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public Map<String, String> deleteImage(@PathVariable Long id, @PathVariable Long imageId) {
        productImageService.deleteImage(id, imageId);
        return Map.of("message", "Image deleted");
    }

    @PutMapping("/{id}/images/order")
    public List<ProductImageResponse> updateImageOrder(@PathVariable Long id,
                                                       @Valid @RequestBody ImageOrderRequest request) {
        return productImageService.updateImageOrder(id, request.imageIds());
    }
}

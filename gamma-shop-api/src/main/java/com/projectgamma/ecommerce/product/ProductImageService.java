package com.projectgamma.ecommerce.product;

import com.projectgamma.ecommerce.common.exception.ApiException;
import com.projectgamma.ecommerce.product.dto.ProductImageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

/**
 * Product image module: uploadProductImage, deleteProductImage,
 * updateImageOrder. Files are written to app.uploads.dir and served
 * back at /uploads/products/<filename>.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductImageService {

    /** A product's gallery is capped at 5 photos, enforced here regardless of what the client sends. */
    private static final int MAX_IMAGES_PER_PRODUCT = 5;

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;

    @Value("${app.uploads.dir}")
    private String uploadsDir;

    @Transactional
    public ProductImageResponse uploadImage(Long productId, MultipartFile file, int sortOrder) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> ApiException.notFound("Product not found"));
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("No file was uploaded");
        }
        if (productImageRepository.countByProductId(productId) >= MAX_IMAGES_PER_PRODUCT) {
            throw ApiException.badRequest("A product can have at most " + MAX_IMAGES_PER_PRODUCT + " images");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw ApiException.badRequest("Only image files are allowed");
        }
        String extension = extensionOf(file.getOriginalFilename());
        String filename = productId + "-" + UUID.randomUUID() + extension;
        try {
            Path directory = Paths.get(uploadsDir, "products");
            Files.createDirectories(directory);
            file.transferTo(directory.resolve(filename).toFile());
        } catch (IOException ex) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not store the uploaded file");
        }
        ProductImage image = ProductImage.builder()
                .product(product)
                .imageUrl("/uploads/products/" + filename)
                .sortOrder(sortOrder)
                .build();
        return ProductImageResponse.from(productImageRepository.save(image));
    }

    @Transactional
    public void deleteImage(Long productId, Long imageId) {
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> ApiException.notFound("Image not found"));
        if (!image.getProduct().getId().equals(productId)) {
            throw ApiException.badRequest("Image does not belong to this product");
        }
        try {
            String url = image.getImageUrl();
            String filename = url.substring(url.lastIndexOf('/') + 1);
            Files.deleteIfExists(Paths.get(uploadsDir, "products", filename));
        } catch (IOException ex) {
            log.warn("Could not delete image file: {}", ex.getMessage());
        }
        productImageRepository.delete(image);
    }

    /** updateImageOrder(): sortOrder is set by the position in the given id list. */
    @Transactional
    public List<ProductImageResponse> updateImageOrder(Long productId, List<Long> imageIds) {
        List<ProductImage> images = productImageRepository.findByProductIdOrderBySortOrderAsc(productId);
        for (ProductImage image : images) {
            int index = imageIds.indexOf(image.getId());
            if (index >= 0) {
                image.setSortOrder(index);
            }
        }
        productImageRepository.saveAll(images);
        return productImageRepository.findByProductIdOrderBySortOrderAsc(productId)
                .stream().map(ProductImageResponse::from).toList();
    }

    private String extensionOf(String originalFilename) {
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                String ext = originalFilename.substring(dot + 1).toLowerCase();
                if (ext.matches("[a-z0-9]{1,5}")) {
                    return "." + ext;
                }
            }
        }
        return ".img";
    }
}

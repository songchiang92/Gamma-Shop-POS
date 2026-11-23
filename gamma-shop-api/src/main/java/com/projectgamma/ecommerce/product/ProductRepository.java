package com.projectgamma.ecommerce.product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByActiveTrue(Pageable pageable);

    @Query("select p from Product p where p.active = true and "
            + "(lower(p.name) like lower(concat('%', :q, '%')) "
            + "or lower(p.description) like lower(concat('%', :q, '%')))")
    Page<Product> search(@Param("q") String q, Pageable pageable);

    Page<Product> findByActiveTrueAndPriceBetween(BigDecimal min, BigDecimal max, Pageable pageable);

    Page<Product> findByActiveTrueAndPriceBetweenAndSlotQuantityGreaterThan(
            BigDecimal min, BigDecimal max, int zero, Pageable pageable);

    boolean existsBySku(String sku);
}

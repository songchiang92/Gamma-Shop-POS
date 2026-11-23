package com.projectgamma.ecommerce.report;

import com.projectgamma.ecommerce.order.Order;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Back Office reporting module: native SQL aggregations over orders.
 * Revenue counts orders whose money was captured
 * (PAID, PROCESSING, PACKED, SHIPPED, COMPLETED).
 */
public interface ReportRepository extends Repository<Order, Long> {

    String REVENUE_STATUSES = "('PAID','PROCESSING','PACKED','SHIPPED','COMPLETED')";

    interface DailySalesView {
        String getDay();
        Long getOrderCount();
        BigDecimal getRevenue();
    }

    interface MonthlySalesView {
        String getMonth();
        Long getOrderCount();
        BigDecimal getRevenue();
    }

    interface ProductSalesView {
        Long getProductId();
        String getProductName();
        Long getUnitsSold();
        BigDecimal getSales();
    }

    interface RevenueSummaryView {
        Long getOrderCount();
        BigDecimal getGross();
        BigDecimal getDiscounts();
        BigDecimal getNet();
    }

    /** generateDailySalesReport() */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(o.created_at, '%Y-%m-%d') AS day, "
            + "COUNT(*) AS orderCount, COALESCE(SUM(o.grand_total), 0) AS revenue "
            + "FROM orders o "
            + "WHERE o.status IN " + REVENUE_STATUSES + " "
            + "AND o.created_at >= :start AND o.created_at < :end "
            + "GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d') "
            + "ORDER BY day")
    List<DailySalesView> dailySales(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** generateMonthlySalesReport() */
    @Query(nativeQuery = true, value =
            "SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS month, "
            + "COUNT(*) AS orderCount, COALESCE(SUM(o.grand_total), 0) AS revenue "
            + "FROM orders o "
            + "WHERE o.status IN " + REVENUE_STATUSES + " "
            + "AND o.created_at >= :start AND o.created_at < :end "
            + "GROUP BY DATE_FORMAT(o.created_at, '%Y-%m') "
            + "ORDER BY month")
    List<MonthlySalesView> monthlySales(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** generateProductSalesReport() */
    @Query(nativeQuery = true, value =
            "SELECT oi.product_id AS productId, oi.product_name AS productName, "
            + "SUM(oi.quantity) AS unitsSold, COALESCE(SUM(oi.line_total), 0) AS sales "
            + "FROM order_items oi JOIN orders o ON o.id = oi.order_id "
            + "WHERE o.status IN " + REVENUE_STATUSES + " "
            + "AND o.created_at >= :start AND o.created_at < :end "
            + "GROUP BY oi.product_id, oi.product_name "
            + "ORDER BY sales DESC")
    List<ProductSalesView> productSales(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** getTopSellingProducts() */
    @Query(nativeQuery = true, value =
            "SELECT oi.product_id AS productId, oi.product_name AS productName, "
            + "SUM(oi.quantity) AS unitsSold, COALESCE(SUM(oi.line_total), 0) AS sales "
            + "FROM order_items oi JOIN orders o ON o.id = oi.order_id "
            + "WHERE o.status IN " + REVENUE_STATUSES + " "
            + "AND o.created_at >= :start AND o.created_at < :end "
            + "GROUP BY oi.product_id, oi.product_name "
            + "ORDER BY unitsSold DESC "
            + "LIMIT :limitN")
    List<ProductSalesView> topProducts(@Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end,
                                       @Param("limitN") int limitN);

    /** generateRevenueReport() */
    @Query(nativeQuery = true, value =
            "SELECT COUNT(*) AS orderCount, "
            + "COALESCE(SUM(o.subtotal), 0) AS gross, "
            + "COALESCE(SUM(o.discount_total), 0) AS discounts, "
            + "COALESCE(SUM(o.grand_total), 0) AS net "
            + "FROM orders o "
            + "WHERE o.status IN " + REVENUE_STATUSES + " "
            + "AND o.created_at >= :start AND o.created_at < :end")
    RevenueSummaryView revenueSummary(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}

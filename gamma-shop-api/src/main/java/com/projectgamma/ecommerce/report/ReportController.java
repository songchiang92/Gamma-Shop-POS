package com.projectgamma.ecommerce.report;

import com.projectgamma.ecommerce.report.ReportRepository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Back Office reporting endpoints (ADMIN only). Every endpoint accepts
 * ?format=json|csv|pdf - json is the default; csv/pdf download a file
 * (exportReportCSV / exportReportPDF).
 */
@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final ReportService reportService;
    private final ExportService exportService;

    @GetMapping("/sales/daily")
    public ResponseEntity<?> dailySales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(defaultValue = "json") String format) {
        List<DailySalesView> data = reportService.dailySales(start, end);
        List<List<String>> rows = data.stream()
                .map(d -> List.of(d.getDay(), String.valueOf(d.getOrderCount()), d.getRevenue().toPlainString()))
                .toList();
        return exportService.respond(format, "daily-sales", "Daily Sales Report (" + start + " to " + end + ")",
                List.of("Day", "Orders", "Revenue"), rows, data);
    }

    @GetMapping("/sales/monthly")
    public ResponseEntity<?> monthlySales(@RequestParam int year,
                                          @RequestParam(defaultValue = "json") String format) {
        List<MonthlySalesView> data = reportService.monthlySales(year);
        List<List<String>> rows = data.stream()
                .map(d -> List.of(d.getMonth(), String.valueOf(d.getOrderCount()), d.getRevenue().toPlainString()))
                .toList();
        return exportService.respond(format, "monthly-sales-" + year, "Monthly Sales Report " + year,
                List.of("Month", "Orders", "Revenue"), rows, data);
    }

    @GetMapping("/products")
    public ResponseEntity<?> productSales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(defaultValue = "json") String format) {
        List<ProductSalesView> data = reportService.productSales(start, end);
        List<List<String>> rows = data.stream()
                .map(d -> List.of(String.valueOf(d.getProductId()), d.getProductName(),
                        String.valueOf(d.getUnitsSold()), d.getSales().toPlainString()))
                .toList();
        return exportService.respond(format, "product-sales", "Product Sales Report (" + start + " to " + end + ")",
                List.of("Product ID", "Product", "Units sold", "Sales"), rows, data);
    }

    @GetMapping("/top-products")
    public ResponseEntity<?> topProducts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(defaultValue = "json") String format) {
        List<ProductSalesView> data = reportService.topProducts(start, end, limit);
        List<List<String>> rows = data.stream()
                .map(d -> List.of(String.valueOf(d.getProductId()), d.getProductName(),
                        String.valueOf(d.getUnitsSold()), d.getSales().toPlainString()))
                .toList();
        return exportService.respond(format, "top-products", "Top Selling Products (" + start + " to " + end + ")",
                List.of("Product ID", "Product", "Units sold", "Sales"), rows, data);
    }

    @GetMapping("/revenue")
    public ResponseEntity<?> revenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(defaultValue = "json") String format) {
        RevenueSummaryView data = reportService.revenueSummary(start, end);
        List<List<String>> rows = List.of(List.of(
                String.valueOf(data.getOrderCount()),
                data.getGross().toPlainString(),
                data.getDiscounts().toPlainString(),
                data.getNet().toPlainString()));
        return exportService.respond(format, "revenue", "Revenue Report (" + start + " to " + end + ")",
                List.of("Orders", "Gross (subtotals)", "Discounts", "Net revenue"), rows, data);
    }
}

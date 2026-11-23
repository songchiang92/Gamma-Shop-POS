package com.projectgamma.ecommerce.report;

import com.projectgamma.ecommerce.report.ReportRepository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Back Office reporting module. Dates are inclusive: [start, end].
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;

    @Transactional(readOnly = true)
    public List<DailySalesView> dailySales(LocalDate start, LocalDate end) {
        return reportRepository.dailySales(startOf(start), endOf(end));
    }

    @Transactional(readOnly = true)
    public List<MonthlySalesView> monthlySales(int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        return reportRepository.monthlySales(startOf(start), endOf(end));
    }

    @Transactional(readOnly = true)
    public List<ProductSalesView> productSales(LocalDate start, LocalDate end) {
        return reportRepository.productSales(startOf(start), endOf(end));
    }

    @Transactional(readOnly = true)
    public List<ProductSalesView> topProducts(LocalDate start, LocalDate end, int limit) {
        return reportRepository.topProducts(startOf(start), endOf(end), limit);
    }

    @Transactional(readOnly = true)
    public RevenueSummaryView revenueSummary(LocalDate start, LocalDate end) {
        return reportRepository.revenueSummary(startOf(start), endOf(end));
    }

    private LocalDateTime startOf(LocalDate date) {
        return date.atStartOfDay();
    }

    private LocalDateTime endOf(LocalDate date) {
        return date.plusDays(1).atStartOfDay();
    }
}

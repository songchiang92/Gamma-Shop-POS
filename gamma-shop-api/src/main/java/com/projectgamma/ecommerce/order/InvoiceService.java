package com.projectgamma.ecommerce.order;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.projectgamma.ecommerce.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

/**
 * Middle Office: printOrderInvoice() - renders an order as a PDF invoice.
 */
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
        PdfWriter.getInstance(document, out);
        document.open();

        document.add(new Paragraph("Gamma Shop - Invoice", titleFont));
        document.add(Chunk.NEWLINE);
        document.add(new Paragraph("Order number: " + order.getOrderNumber(), normalFont));
        document.add(new Paragraph("Order date:   " + order.getCreatedAt().format(DATE_FORMAT), normalFont));
        document.add(new Paragraph("Status:       " + order.getStatus().name(), normalFont));
        document.add(new Paragraph("Customer:     " + order.getUser().getEmail(), normalFont));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{5f, 2f, 1.2f, 2f});
        Color headerColor = new Color(230, 230, 230);
        for (String header : new String[]{"Product", "Unit price", "Qty", "Line total"}) {
            PdfPCell cell = new PdfPCell(new Phrase(header, boldFont));
            cell.setBackgroundColor(headerColor);
            cell.setPadding(5f);
            table.addCell(cell);
        }
        for (OrderItem item : order.getItems()) {
            table.addCell(new Phrase(item.getProductName(), normalFont));
            table.addCell(new Phrase(item.getUnitPrice().toPlainString(), normalFont));
            table.addCell(new Phrase(String.valueOf(item.getQuantity()), normalFont));
            table.addCell(new Phrase(item.getLineTotal().toPlainString(), normalFont));
        }
        document.add(table);
        document.add(Chunk.NEWLINE);

        document.add(new Paragraph("Subtotal:  " + order.getSubtotal().toPlainString(), normalFont));
        document.add(new Paragraph("Discount:  -" + order.getDiscountTotal().toPlainString(), normalFont));
        document.add(new Paragraph("Grand total (MYR): " + order.getGrandTotal().toPlainString(), boldFont));

        document.close();
        } catch (DocumentException ex) {
            throw new IllegalStateException("Could not generate the invoice PDF", ex);
        }
        return out.toByteArray();
    }
}

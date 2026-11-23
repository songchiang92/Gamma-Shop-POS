package com.projectgamma.ecommerce.report;

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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Back Office reporting: exportReportCSV() / exportReportPDF().
 * Any report is passed as (headers, rows) and rendered in the requested format.
 */
@Service
public class ExportService {

    /**
     * format = json | csv | pdf. For json the given jsonBody is returned as-is.
     */
    public ResponseEntity<?> respond(String format, String filenameBase, String title,
                                     List<String> headers, List<List<String>> rows, Object jsonBody) {
        if ("csv".equalsIgnoreCase(format)) {
            byte[] csv = toCsv(headers, rows).getBytes(StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filenameBase + ".csv")
                    .body(csv);
        }
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] pdf = toPdf(title, headers, rows);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filenameBase + ".pdf")
                    .body(pdf);
        }
        return ResponseEntity.ok(jsonBody);
    }

    public String toCsv(List<String> headers, List<List<String>> rows) {
        StringBuilder sb = new StringBuilder();
        appendCsvRow(sb, headers);
        for (List<String> row : rows) {
            appendCsvRow(sb, row);
        }
        return sb.toString();
    }

    private void appendCsvRow(StringBuilder sb, List<String> values) {
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            String value = values.get(i) == null ? "" : values.get(i);
            if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
                sb.append('"').append(value.replace("\"", "\"\"")).append('"');
            } else {
                sb.append(value);
            }
        }
        sb.append('\n');
    }

    public byte[] toPdf(String title, List<String> headers, List<List<String>> rows) {
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
        PdfWriter.getInstance(document, out);
        document.open();
        document.add(new Paragraph(title, titleFont));
        document.add(new Paragraph("Generated: "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")), smallFont));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(headers.size());
        table.setWidthPercentage(100);
        Color headerColor = new Color(230, 230, 230);
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, boldFont));
            cell.setBackgroundColor(headerColor);
            cell.setPadding(5f);
            table.addCell(cell);
        }
        for (List<String> row : rows) {
            for (String value : row) {
                table.addCell(new Phrase(value == null ? "" : value, normalFont));
            }
        }
        document.add(table);
        document.close();
        } catch (DocumentException ex) {
            throw new IllegalStateException("Could not generate the PDF report", ex);
        }
        return out.toByteArray();
    }
}

import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import type { ReportColumn, ReportFilters, ReportResult } from "./report.types.js";

function formatFilterValue(value: unknown): string {
  if (value === undefined || value === "" || value === false) {
    return "";
  }
  return String(value);
}

function activeFilters(filters: ReportFilters): string[] {
  return Object.entries(filters)
    .map(([key, value]) => {
      const formatted = formatFilterValue(value);
      return formatted ? `${key}: ${formatted}` : "";
    })
    .filter(Boolean);
}

function formatCell(
  value: string | number | Date | null,
  column: ReportColumn
): string | number | Date {
  if (value === null) {
    return "";
  }
  if (value instanceof Date) {
    return value;
  }
  if (column.type === "money" && typeof value === "string") {
    return Number(value);
  }
  return value;
}

export async function renderExcel(report: ReportResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Alansari Luxury Travel";
  workbook.created = report.generatedAt;
  const worksheet = workbook.addWorksheet("Report", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }]
  });

  worksheet.mergeCells("A1", `${String.fromCharCode(64 + report.definition.columns.length)}1`);
  worksheet.getCell("A1").value = report.definition.title;
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "right" };
  worksheet.getCell("A2").value = `تاريخ الإنشاء: ${report.generatedAt.toISOString()}`;
  worksheet.getCell("A3").value =
    `الفلاتر: ${activeFilters(report.filters).join(" | ") || "لا توجد"}`;

  worksheet.addRow([]);
  const header = worksheet.addRow(report.definition.columns.map((column) => column.label));
  header.font = { bold: true };
  header.alignment = { horizontal: "right" };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9ECE1" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF6C755A" } } };
  });

  report.rows.forEach((row) => {
    const excelRow = worksheet.addRow(
      report.definition.columns.map((column) => formatCell(row[column.key] ?? null, column))
    );
    excelRow.alignment = { horizontal: "right" };
  });

  if (Object.keys(report.totals).length > 0) {
    worksheet.addRow([]);
    worksheet.addRow(["الإجماليات"]);
    Object.entries(report.totals).forEach(([key, value]) => worksheet.addRow([key, value]));
  }

  report.definition.columns.forEach((column, index) => {
    const worksheetColumn = worksheet.getColumn(index + 1);
    worksheetColumn.width = column.width ?? 18;
    if (column.type === "datetime") {
      worksheetColumn.numFmt = "yyyy-mm-dd hh:mm";
    }
    if (column.type === "date") {
      worksheetColumn.numFmt = "yyyy-mm-dd";
    }
    if (column.type === "money") {
      worksheetColumn.numFmt = "#,##0.00";
    }
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function getCompanyName(): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "companyName" } });
  return typeof setting?.value === "string" ? setting.value : "الأنصاري للسياحة";
}

function resolveArabicFont(): string | null {
  const candidates = [
    env.REPORT_ARABIC_FONT_PATH,
    path.join(process.cwd(), "assets", "fonts", "NotoNaskhArabic-Regular.ttf"),
    "C:\\Windows\\Fonts\\tahoma.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
    "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function drawText(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.text(text, { align: "right", features: ["rtla"], ...options });
}

function cellText(value: string | number | Date | null): string {
  if (value === null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString().replace("T", " ").slice(0, 16);
  }
  return String(value);
}

export async function renderPdf(report: ReportResult): Promise<Buffer> {
  const companyName = await getCompanyName();
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 32, bufferPages: true });
  const chunks: Buffer[] = [];
  const fontPath = resolveArabicFont();
  if (fontPath) {
    doc.font(fontPath);
  }
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const tableTop = 124;
  const rowHeight = 28;
  const columns = report.definition.columns.slice(0, 10);
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = usableWidth / columns.length;

  function header(): void {
    doc.fontSize(15);
    drawText(doc, companyName);
    doc.moveDown(0.3);
    doc.fontSize(13);
    drawText(doc, report.definition.title);
    doc.fontSize(9);
    drawText(doc, `تاريخ الإنشاء: ${report.generatedAt.toISOString()}`);
    drawText(doc, `الفلاتر: ${activeFilters(report.filters).join(" | ") || "لا توجد"}`);
    doc
      .moveTo(doc.page.margins.left, tableTop - 10)
      .lineTo(doc.page.width - doc.page.margins.right, tableTop - 10)
      .stroke();

    columns.forEach((column, index) => {
      const x = doc.page.margins.left + index * columnWidth;
      doc.rect(x, tableTop, columnWidth, rowHeight).fillAndStroke("#E9ECE1", "#6C755A");
      doc.fillColor("#111111").fontSize(8);
      doc.text(column.label, x + 4, tableTop + 8, {
        width: columnWidth - 8,
        align: "right",
        features: ["rtla"]
      });
    });
  }

  header();
  let y = tableTop + rowHeight;
  report.rows.forEach((row) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      header();
      y = tableTop + rowHeight;
    }

    columns.forEach((column, index) => {
      const x = doc.page.margins.left + index * columnWidth;
      doc.rect(x, y, columnWidth, rowHeight).stroke("#D8DDCF");
      doc.fillColor("#111111").fontSize(7);
      doc.text(cellText(row[column.key] ?? null), x + 4, y + 7, {
        width: columnWidth - 8,
        height: rowHeight - 8,
        align: "right",
        ellipsis: true,
        features: ["rtla"]
      });
    });
    y += rowHeight;
  });

  if (Object.keys(report.totals).length > 0) {
    doc.moveDown();
    drawText(doc, `الإجماليات: ${JSON.stringify(report.totals)}`);
  }

  const pageRange = doc.bufferedPageRange();
  for (let index = pageRange.start; index < pageRange.start + pageRange.count; index += 1) {
    doc.switchToPage(index);
    doc.fontSize(8);
    doc.text(
      `صفحة ${index + 1} من ${pageRange.count}`,
      doc.page.margins.left,
      doc.page.height - 24,
      {
        align: "center"
      }
    );
  }

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}

import type { Request, Response } from "express";
import { ok } from "../../lib/api-response.js";
import { getRequiredUser } from "../auth/auth.middleware.js";
import { renderExcel, renderPdf } from "./report.exporters.js";
import type {
  ReportExportQuery,
  ReportPreviewParams,
  ReportPreviewQuery
} from "./report.schemas.js";
import {
  auditReportExport,
  filenameFor,
  generateReport,
  getReportDefinition
} from "./report.service.js";
import { reportTypes, type ReportFilters, type ReportFormat } from "./report.types.js";

function toFilters(query: ReportPreviewQuery): ReportFilters {
  return {
    startDate: query.startDate,
    endDate: query.endDate,
    vehicleId: query.vehicleId,
    driverId: query.driverId,
    customerId: query.customerId,
    bookingStatus: query.bookingStatus,
    tripType: query.tripType,
    overnightOnly: query.overnightOnly,
    destination: query.destination,
    voucherNumber: query.voucherNumber
  };
}

export async function definitions(req: Request, res: Response): Promise<Response> {
  const user = getRequiredUser(req);
  return ok(res, {
    reports: reportTypes
      .map((type) => getReportDefinition(type))
      .filter(
        (definition) => !definition.restrictedTo || definition.restrictedTo.includes(user.role)
      )
  });
}

export async function preview(req: Request, res: Response): Promise<Response> {
  const user = getRequiredUser(req);
  const params = req.params as ReportPreviewParams;
  const filters = toFilters(req.query as unknown as ReportPreviewQuery);
  const report = await generateReport(params.type, filters, user.role);
  return ok(res, {
    report: {
      definition: report.definition,
      filters: report.filters,
      rows: report.rows.slice(0, 100),
      totals: report.totals,
      rowCount: report.rows.length,
      generatedAt: report.generatedAt
    }
  });
}

export async function exportReport(req: Request, res: Response): Promise<Response | void> {
  const user = getRequiredUser(req);
  const params = req.params as ReportPreviewParams;
  const query = req.query as unknown as ReportExportQuery;
  const format: ReportFormat = query.format;
  const filters = toFilters(query);
  const report = await generateReport(params.type, filters, user.role);
  const buffer = format === "excel" ? await renderExcel(report) : await renderPdf(report);
  const filename = filenameFor(params.type, format, report.generatedAt);

  await auditReportExport(user.id, params.type, filters, format, req.ip);

  res.setHeader(
    "Content-Type",
    format === "excel"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  return res.send(buffer);
}

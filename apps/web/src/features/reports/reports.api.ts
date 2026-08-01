import type { BookingStatus, TripType, UserRole } from "@alansari/shared";
import { apiRequest } from "../../lib/api";
import { getCsrfToken } from "../../lib/csrf";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export type ReportType =
  | "daily-bookings"
  | "daily-dispatch"
  | "weekly-bookings"
  | "monthly-bookings"
  | "bookings-by-vehicle"
  | "bookings-by-driver"
  | "customer-history"
  | "overnight-stays"
  | "overnight-driver-costs"
  | "cancelled-bookings"
  | "vehicle-utilization"
  | "vehicle-service-status"
  | "booking-expenses";

export interface ReportColumn {
  key: string;
  label: string;
  type?: "text" | "date" | "datetime" | "money" | "number";
  width?: number;
  restrictedTo?: UserRole[];
}

export interface ReportDefinition {
  type: ReportType;
  title: string;
  restrictedTo?: UserRole[];
  columns: ReportColumn[];
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  bookingStatus?: BookingStatus | "";
  tripType?: TripType | "";
  overnightOnly?: boolean;
  destination?: string;
  voucherNumber?: string;
}

export interface ReportPreview {
  definition: ReportDefinition;
  filters: ReportFilters;
  rows: Array<Record<string, string | number | null>>;
  totals: Record<string, string | number>;
  rowCount: number;
  generatedAt: string;
}

type QueryValue = string | number | boolean | null | undefined;

function toQueryString(query: object): string {
  const params = new URLSearchParams();
  Object.entries(query as Record<string, QueryValue>).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function listReports(): Promise<{ reports: ReportDefinition[] }> {
  return apiRequest("/reports");
}

export function previewReport(
  type: ReportType,
  filters: ReportFilters
): Promise<{ report: ReportPreview }> {
  return apiRequest(`/reports/${type}?${toQueryString(filters)}`);
}

export async function downloadReport(
  type: ReportType,
  filters: ReportFilters,
  format: "excel" | "pdf"
): Promise<void> {
  const csrfToken = getCsrfToken();
  const response = await fetch(
    `${apiBaseUrl}/reports/${type}/export?${toQueryString({ ...filters, format })}`,
    {
      credentials: "include",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined
    }
  );

  if (!response.ok) {
    throw new Error("تعذر تنزيل التقرير.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? `${type}.${format}`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

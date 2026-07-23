import type { BookingStatus, TripType, UserRole } from "@prisma/client";

export const reportTypes = [
  "daily-bookings",
  "daily-dispatch",
  "weekly-bookings",
  "monthly-bookings",
  "bookings-by-vehicle",
  "bookings-by-driver",
  "customer-history",
  "overnight-stays",
  "overnight-driver-costs",
  "cancelled-bookings",
  "vehicle-utilization",
  "vehicle-service-status",
  "booking-expenses"
] as const;

export type ReportType = (typeof reportTypes)[number];
export type ReportFormat = "excel" | "pdf";

export interface ReportFilters {
  startDate: string;
  endDate: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  bookingStatus?: BookingStatus;
  tripType?: TripType;
  overnightOnly: boolean;
  destination?: string;
  voucherNumber?: string;
}

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
  columns: readonly ReportColumn[];
}

export interface ReportResult {
  definition: ReportDefinition;
  filters: ReportFilters;
  rows: Array<Record<string, string | number | Date | null>>;
  totals: Record<string, string | number>;
  generatedAt: Date;
}

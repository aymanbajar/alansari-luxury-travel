import { Prisma, type UserRole } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditLog } from "../audit/audit.service.js";
import type {
  ReportDefinition,
  ReportFilters,
  ReportFormat,
  ReportResult,
  ReportType
} from "./report.types.js";

const maxRows = 5_000;
const dangerousFormulaPattern = /^[=+\-@\t\r]/;

const reportDefinitions: Record<ReportType, ReportDefinition> = {
  "daily-bookings": {
    type: "daily-bookings",
    title: "تقرير الحجوزات اليومي",
    columns: bookingColumns()
  },
  "daily-dispatch": {
    type: "daily-dispatch",
    title: "كشف إرسال المركبات اليومي",
    columns: [
      { key: "voucherNumber", label: "رقم الفاوتشر", width: 18 },
      { key: "customerName", label: "اسم العميل", width: 24 },
      { key: "customerPhone", label: "هاتف العميل", width: 18 },
      { key: "vehiclePlate", label: "رقم اللوحة", width: 16 },
      { key: "driverName", label: "السائق", width: 22 },
      { key: "startAt", label: "وقت البداية", type: "datetime", width: 22 },
      { key: "endAt", label: "وقت النهاية", type: "datetime", width: 22 },
      { key: "destination", label: "الوجهة", width: 24 },
      { key: "tripType", label: "نوع الرحلة", width: 16 },
      { key: "overnight", label: "مبيت", width: 10 },
      { key: "notes", label: "ملاحظات تشغيلية", width: 32 }
    ]
  },
  "weekly-bookings": {
    type: "weekly-bookings",
    title: "تقرير الحجوزات الأسبوعي",
    columns: bookingColumns()
  },
  "monthly-bookings": {
    type: "monthly-bookings",
    title: "تقرير الحجوزات الشهري",
    columns: bookingColumns()
  },
  "bookings-by-vehicle": {
    type: "bookings-by-vehicle",
    title: "تقرير الحجوزات حسب المركبة",
    columns: bookingColumns()
  },
  "bookings-by-driver": {
    type: "bookings-by-driver",
    title: "تقرير الحجوزات حسب السائق",
    columns: bookingColumns()
  },
  "customer-history": {
    type: "customer-history",
    title: "سجل حجوزات العميل",
    columns: bookingColumns()
  },
  "overnight-stays": {
    type: "overnight-stays",
    title: "تقرير المبيت",
    columns: [
      ...bookingColumns(),
      { key: "accommodationName", label: "اسم السكن", width: 24 },
      { key: "checkInDate", label: "تاريخ الدخول", type: "date", width: 16 },
      { key: "checkOutDate", label: "تاريخ الخروج", type: "date", width: 16 },
      { key: "nightsCount", label: "عدد الليالي", type: "number", width: 12 }
    ]
  },
  "overnight-driver-costs": {
    type: "overnight-driver-costs",
    title: "تقرير تكلفة مبيت السائقين",
    restrictedTo: ["ADMIN"],
    columns: [
      ...bookingColumns(),
      { key: "nightsCount", label: "عدد الليالي", type: "number", width: 12 },
      { key: "driverDailyRate", label: "سعر الليلة", type: "money", width: 14 },
      { key: "totalDriverCost", label: "إجمالي التكلفة", type: "money", width: 16 }
    ]
  },
  "cancelled-bookings": {
    type: "cancelled-bookings",
    title: "تقرير الحجوزات الملغاة",
    columns: [
      ...bookingColumns(),
      { key: "cancelledAt", label: "وقت الإلغاء", type: "datetime", width: 22 }
    ]
  },
  "vehicle-utilization": {
    type: "vehicle-utilization",
    title: "تقرير استخدام المركبات",
    columns: [
      { key: "vehiclePlate", label: "رقم اللوحة", width: 16 },
      { key: "vehicleName", label: "المركبة", width: 24 },
      { key: "bookingCount", label: "عدد الحجوزات", type: "number", width: 14 },
      { key: "bookedHours", label: "ساعات الحجز", type: "number", width: 14 },
      { key: "utilizationPercent", label: "نسبة الاستخدام", type: "number", width: 14 }
    ]
  },
  "vehicle-service-status": {
    type: "vehicle-service-status",
    title: "المركبات تحت الصيانة أو خارج الخدمة",
    columns: [
      { key: "vehiclePlate", label: "رقم اللوحة", width: 16 },
      { key: "vehicleName", label: "المركبة", width: 24 },
      { key: "vehicleStatus", label: "الحالة", width: 18 },
      { key: "notes", label: "ملاحظات", width: 36 }
    ]
  },
  "booking-expenses": {
    type: "booking-expenses",
    title: "تقرير مصروفات الحجوزات",
    restrictedTo: ["ADMIN"],
    columns: [
      ...bookingColumns(),
      { key: "expenseType", label: "نوع المصروف", width: 16 },
      { key: "expenseAmount", label: "المبلغ", type: "money", width: 14 },
      { key: "expenseCurrency", label: "العملة", width: 10 },
      { key: "expenseDescription", label: "الوصف", width: 28 }
    ]
  }
};

function bookingColumns() {
  return [
    { key: "voucherNumber", label: "رقم الفاوتشر", width: 18 },
    { key: "customerName", label: "العميل", width: 24 },
    { key: "customerPhone", label: "هاتف العميل", width: 18 },
    { key: "vehiclePlate", label: "المركبة", width: 16 },
    { key: "driverName", label: "السائق", width: 22 },
    { key: "startAt", label: "البداية", type: "datetime", width: 22 },
    { key: "endAt", label: "النهاية", type: "datetime", width: 22 },
    { key: "destination", label: "الوجهة", width: 24 },
    { key: "tripType", label: "نوع الرحلة", width: 16 },
    { key: "status", label: "الحالة", width: 14 },
    { key: "overnight", label: "مبيت", width: 10 }
  ] as const;
}

const reportBookingInclude = {
  customer: { select: { id: true, fullName: true, phoneCountryCode: true, phoneNumber: true } },
  vehicle: { select: { id: true, plateNumber: true, make: true, model: true, status: true } },
  driver: { select: { id: true, fullName: true, phoneNumber: true, status: true } },
  overnightStays: { orderBy: { createdAt: "desc" as const }, take: 1 },
  expenses: true
} satisfies Prisma.BookingInclude;

function range(filters: ReportFilters) {
  return {
    start: new Date(`${filters.startDate}T00:00:00.000Z`),
    endExclusive: new Date(new Date(`${filters.endDate}T00:00:00.000Z`).getTime() + 86_400_000)
  };
}

function assertPermission(type: ReportType, role: UserRole): void {
  const definition = reportDefinitions[type];
  if (definition.restrictedTo && !definition.restrictedTo.includes(role)) {
    throw new AppError(403, "FORBIDDEN", "ليست لديك صلاحية للوصول إلى هذا التقرير.");
  }
}

function bookingWhere(type: ReportType, filters: ReportFilters): Prisma.BookingWhereInput {
  const { start, endExclusive } = range(filters);
  const isOvernightReport = type === "overnight-stays" || type === "overnight-driver-costs";
  return {
    deletedAt: null,
    startAt: { gte: start, lt: endExclusive },
    vehicleId: filters.vehicleId,
    driverId: filters.driverId,
    customerId: filters.customerId,
    status: type === "cancelled-bookings" ? "CANCELLED" : filters.bookingStatus,
    tripType: isOvernightReport || filters.overnightOnly ? "OVERNIGHT" : filters.tripType,
    destination: filters.destination
      ? { contains: filters.destination, mode: "insensitive" }
      : undefined,
    voucherNumber: filters.voucherNumber
      ? { contains: filters.voucherNumber, mode: "insensitive" }
      : undefined
  };
}

function safeCell(value: string | number | Date | null): string | number | Date | null {
  if (typeof value !== "string") {
    return value;
  }
  return dangerousFormulaPattern.test(value) ? `'${value}` : value;
}

function mapBooking(
  booking: Prisma.BookingGetPayload<{ include: typeof reportBookingInclude }>
): Record<string, string | number | Date | null> {
  const overnightStay = booking.overnightStays[0] ?? null;
  return {
    voucherNumber: booking.voucherNumber,
    customerName: booking.customer.fullName,
    customerPhone: `${booking.customer.phoneCountryCode}${booking.customer.phoneNumber}`,
    vehiclePlate: booking.vehicle.plateNumber,
    vehicleName: `${booking.vehicle.make} ${booking.vehicle.model}`,
    driverName: booking.driver.fullName,
    startAt: booking.startAt,
    endAt: booking.endAt,
    destination: booking.destination,
    tripType: booking.tripType,
    status: booking.status,
    overnight: overnightStay || booking.tripType === "OVERNIGHT" ? "نعم" : "لا",
    notes: booking.notes,
    cancelledAt: booking.cancelledAt,
    accommodationName: overnightStay?.accommodationName ?? null,
    checkInDate: overnightStay?.checkInDate ?? null,
    checkOutDate: overnightStay?.checkOutDate ?? null,
    nightsCount: overnightStay?.nightsCount ?? null,
    driverDailyRate: overnightStay?.driverDailyRate.toFixed(2) ?? null,
    totalDriverCost: overnightStay?.totalDriverCost.toFixed(2) ?? null
  };
}

function sanitizeRow(row: Record<string, string | number | Date | null>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)]));
}

async function bookingRows(type: ReportType, filters: ReportFilters) {
  const bookings = await prisma.booking.findMany({
    where: bookingWhere(type, filters),
    include: reportBookingInclude,
    orderBy: { startAt: "asc" },
    take: maxRows
  });
  return bookings.map(mapBooking).map(sanitizeRow);
}

async function vehicleUtilizationRows(filters: ReportFilters) {
  const { start, endExclusive } = range(filters);
  const [vehicles, bookings] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        deletedAt: null,
        id: filters.vehicleId
      },
      select: { id: true, plateNumber: true, make: true, model: true },
      orderBy: { plateNumber: "asc" },
      take: 500
    }),
    prisma.booking.findMany({
      where: {
        ...bookingWhere("vehicle-utilization", filters),
        status: { not: "CANCELLED" }
      },
      select: { vehicleId: true, startAt: true, endAt: true },
      take: maxRows
    })
  ]);
  const totalHours = (endExclusive.getTime() - start.getTime()) / 3_600_000;
  return vehicles.map((vehicle) => {
    const vehicleBookings = bookings.filter((booking) => booking.vehicleId === vehicle.id);
    const bookedHours = vehicleBookings.reduce(
      (sum, booking) => sum + (booking.endAt.getTime() - booking.startAt.getTime()) / 3_600_000,
      0
    );
    return sanitizeRow({
      vehiclePlate: vehicle.plateNumber,
      vehicleName: `${vehicle.make} ${vehicle.model}`,
      bookingCount: vehicleBookings.length,
      bookedHours: Number(bookedHours.toFixed(2)),
      utilizationPercent: Number(((bookedHours / totalHours) * 100).toFixed(2))
    });
  });
}

async function serviceStatusRows(filters: ReportFilters) {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      id: filters.vehicleId,
      status: { in: ["MAINTENANCE", "OUT_OF_SERVICE"] }
    },
    orderBy: { plateNumber: "asc" },
    take: maxRows
  });
  return vehicles
    .map((vehicle) => ({
      vehiclePlate: vehicle.plateNumber,
      vehicleName: `${vehicle.make} ${vehicle.model}`,
      vehicleStatus: vehicle.status,
      notes: vehicle.notes
    }))
    .map(sanitizeRow);
}

async function expenseRows(filters: ReportFilters) {
  const bookings = await prisma.booking.findMany({
    where: bookingWhere("booking-expenses", filters),
    include: reportBookingInclude,
    orderBy: { startAt: "asc" },
    take: maxRows
  });
  return bookings.flatMap((booking) =>
    booking.expenses.map((expense) =>
      sanitizeRow({
        ...mapBooking(booking),
        expenseType: expense.type,
        expenseAmount: expense.amount.toFixed(2),
        expenseCurrency: expense.currency,
        expenseDescription: expense.description
      })
    )
  );
}

function totalsFor(type: ReportType, rows: Array<Record<string, string | number | Date | null>>) {
  const totals: Record<string, string | number> = { rowCount: rows.length };
  if (type === "overnight-driver-costs") {
    totals.totalDriverCost = rows
      .reduce((sum, row) => sum + Number(row.totalDriverCost ?? 0), 0)
      .toFixed(2);
  }
  if (type === "booking-expenses") {
    totals.totalExpenses = rows
      .reduce((sum, row) => sum + Number(row.expenseAmount ?? 0), 0)
      .toFixed(2);
  }
  return totals;
}

export function getReportDefinition(type: ReportType) {
  return reportDefinitions[type];
}

export async function generateReport(
  type: ReportType,
  filters: ReportFilters,
  role: UserRole
): Promise<ReportResult> {
  assertPermission(type, role);
  const definition = reportDefinitions[type];
  const rows =
    type === "vehicle-utilization"
      ? await vehicleUtilizationRows(filters)
      : type === "vehicle-service-status"
        ? await serviceStatusRows(filters)
        : type === "booking-expenses"
          ? await expenseRows(filters)
          : await bookingRows(type, filters);

  return {
    definition,
    filters,
    rows,
    totals: totalsFor(type, rows),
    generatedAt: new Date()
  };
}

export async function auditReportExport(
  userId: string,
  type: ReportType,
  filters: ReportFilters,
  format: ReportFormat,
  ipAddress?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    action: "REPORT_EXPORTED",
    entityType: "Report",
    entityId: type,
    newValues: {
      reportType: type,
      filters: { ...filters },
      format
    } satisfies Prisma.InputJsonObject,
    ipAddress
  });
}

export function filenameFor(type: ReportType, format: ReportFormat, generatedAt: Date): string {
  const stamp = generatedAt.toISOString().slice(0, 10);
  const extension = format === "excel" ? "xlsx" : "pdf";
  return `${type}-${stamp}.${extension}`;
}

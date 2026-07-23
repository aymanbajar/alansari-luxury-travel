import { Download, FileSpreadsheet, FileText, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookingStatus, TripType } from "@alansari/shared";
import { bookingStatuses, tripTypes } from "@alansari/shared";
import { useAuth } from "../features/auth/useAuth";
import type { Customer } from "../features/customers/customers.api";
import * as customersApi from "../features/customers/customers.api";
import type { Driver, Vehicle } from "../features/fleet/fleet.types";
import * as driversApi from "../features/fleet/drivers.api";
import * as vehiclesApi from "../features/fleet/vehicles.api";
import type {
  ReportDefinition,
  ReportFilters,
  ReportPreview,
  ReportType
} from "../features/reports/reports.api";
import * as reportsApi from "../features/reports/reports.api";

const statusLabels: Record<BookingStatus, string> = {
  DRAFT: "مسودة",
  CONFIRMED: "مؤكد",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي"
};

const tripLabels: Record<TripType, string> = {
  CITY: "داخل المدينة",
  OUTSIDE_CITY: "خارج المدينة",
  OVERNIGHT: "مبيت"
};

function toDateInput(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 86_400_000);
}

function displayValue(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function ReportsPage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType>("daily-bookings");
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: toDateInput(today),
    endDate: toDateInput(addDays(today, 7)),
    overnightOnly: false
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleDefinitions = definitions.filter(
    (definition) =>
      !definition.restrictedTo || definition.restrictedTo.includes(user?.role ?? "STAFF")
  );
  const selectedDefinition =
    visibleDefinitions.find((definition) => definition.type === selectedType) ??
    visibleDefinitions[0];

  const loadReferences = useCallback(async () => {
    const [reportResult, vehicleResult, driverResult, customerResult] = await Promise.all([
      reportsApi.listReports(),
      vehiclesApi.listVehicles({
        page: 1,
        pageSize: 100,
        sortBy: "plateNumber",
        sortDirection: "asc"
      }),
      driversApi.listDrivers({ page: 1, pageSize: 100, sortBy: "fullName", sortDirection: "asc" }),
      customersApi.listCustomers({
        page: 1,
        pageSize: 100,
        sortBy: "fullName",
        sortDirection: "asc"
      })
    ]);
    setDefinitions(reportResult.reports);
    setVehicles(vehicleResult.vehicles);
    setDrivers(driverResult.drivers);
    setCustomers(customerResult.customers);
  }, []);

  const loadPreview = useCallback(async () => {
    if (!selectedDefinition) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await reportsApi.previewReport(selectedDefinition.type, filters);
      setPreview(result.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل التقرير.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, selectedDefinition]);

  useEffect(() => {
    void loadReferences().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل بيانات التقارير.");
    });
  }, [loadReferences]);

  useEffect(() => {
    if (
      visibleDefinitions.length > 0 &&
      !visibleDefinitions.some((item) => item.type === selectedType)
    ) {
      setSelectedType(visibleDefinitions[0].type);
    }
  }, [selectedType, visibleDefinitions]);

  useEffect(() => {
    if (selectedDefinition) {
      void loadPreview();
    }
  }, [loadPreview, selectedDefinition]);

  async function exportReport(format: "excel" | "pdf"): Promise<void> {
    if (!selectedDefinition) {
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      await reportsApi.downloadReport(selectedDefinition.type, filters, format);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تصدير التقرير.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">التقارير والتصدير</h1>
        <p className="mt-1 text-olive">معاينة التقارير التشغيلية وتصديرها إلى Excel أو PDF.</p>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-4 xl:grid-cols-6">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-medium">نوع التقرير</span>
          <select
            className="rounded-md border border-olive/30 px-3 py-2"
            value={selectedDefinition?.type ?? selectedType}
            onChange={(event) => setSelectedType(event.target.value as ReportType)}
          >
            {visibleDefinitions.map((definition) => (
              <option key={definition.type} value={definition.type}>
                {definition.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">من</span>
          <input
            className="rounded-md border border-olive/30 px-3 py-2"
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">إلى</span>
          <input
            className="rounded-md border border-olive/30 px-3 py-2"
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">المركبة</span>
          <select
            className="rounded-md border border-olive/30 px-3 py-2"
            value={filters.vehicleId ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, vehicleId: event.target.value || undefined })
            }
          >
            <option value="">كل المركبات</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plateNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">السائق</span>
          <select
            className="rounded-md border border-olive/30 px-3 py-2"
            value={filters.driverId ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, driverId: event.target.value || undefined })
            }
          >
            <option value="">كل السائقين</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">العميل</span>
          <select
            className="rounded-md border border-olive/30 px-3 py-2"
            value={filters.customerId ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, customerId: event.target.value || undefined })
            }
          >
            <option value="">كل العملاء</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">حالة الحجز</span>
          <select
            className="rounded-md border border-olive/30 px-3 py-2"
            value={filters.bookingStatus ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, bookingStatus: event.target.value as BookingStatus | "" })
            }
          >
            <option value="">كل الحالات</option>
            {bookingStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">نوع الرحلة</span>
          <select
            className="rounded-md border border-olive/30 px-3 py-2"
            value={filters.tripType ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, tripType: event.target.value as TripType | "" })
            }
          >
            <option value="">كل الأنواع</option>
            {tripTypes.map((tripType) => (
              <option key={tripType} value={tripType}>
                {tripLabels[tripType]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">الوجهة</span>
          <input
            className="rounded-md border border-olive/30 px-3 py-2"
            value={filters.destination ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, destination: event.target.value || undefined })
            }
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">الفاوتشر</span>
          <input
            className="rounded-md border border-olive/30 px-3 py-2"
            value={filters.voucherNumber ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, voucherNumber: event.target.value || undefined })
            }
          />
        </label>
        <label className="flex items-center gap-2 self-end rounded-md border border-olive/30 px-3 py-2">
          <input
            checked={filters.overnightOnly ?? false}
            onChange={(event) => setFilters({ ...filters, overnightOnly: event.target.checked })}
            type="checkbox"
          />
          مبيت فقط
        </label>
        <button
          className="inline-flex items-center justify-center gap-2 self-end rounded-md bg-ink px-4 py-2 font-semibold text-white"
          onClick={() => void loadPreview()}
          type="button"
        >
          <Search size={18} aria-hidden="true" />
          معاينة
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-md bg-sea px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={isExporting || !preview}
          onClick={() => void exportReport("excel")}
          type="button"
        >
          <FileSpreadsheet size={18} aria-hidden="true" />
          Excel
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-olive/30 px-4 py-2 font-semibold disabled:opacity-50"
          disabled={isExporting || !preview}
          onClick={() => void exportReport("pdf")}
          type="button"
        >
          <FileText size={18} aria-hidden="true" />
          PDF
        </button>
      </div>

      <div className="rounded-lg border border-olive/20 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-olive/20 p-4">
          <div>
            <h2 className="font-bold">{preview?.definition.title ?? selectedDefinition?.title}</h2>
            <p className="text-sm text-olive">
              {preview
                ? `عدد النتائج: ${preview.rowCount} - المعروض أول 100 سجل`
                : "لا توجد معاينة بعد."}
            </p>
          </div>
          <Download className="text-sea" size={22} aria-hidden="true" />
        </div>
        {isLoading ? <p className="p-4 text-olive">جاري تحميل المعاينة...</p> : null}
        {!isLoading && preview?.rows.length === 0 ? (
          <p className="p-4 text-olive">لا توجد بيانات مطابقة للفلاتر الحالية.</p>
        ) : null}
        {preview && preview.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="bg-olive/10">
                <tr>
                  {preview.definition.columns.map((column) => (
                    <th className="p-3" key={column.key}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr className="border-t border-olive/10" key={index}>
                    {preview.definition.columns.map((column) => (
                      <td
                        className="max-w-72 truncate p-3"
                        key={column.key}
                        title={displayValue(row[column.key])}
                      >
                        {displayValue(row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

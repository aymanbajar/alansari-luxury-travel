import { Download, FileSpreadsheet, FileText, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { BookingStatus, TripType } from "@alansari/shared";
import { bookingStatuses, tripTypes } from "@alansari/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  EmptyState,
  ErrorAlert,
  fieldClasses,
  FormField,
  LoadingState,
  PageHeader,
  SectionCard,
  SuccessAlert
} from "../components/admin-ui";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../features/auth/useAuth";
import type { Customer } from "../features/customers/customers.api";
import * as customersApi from "../features/customers/customers.api";
import type { Driver, Vehicle } from "../features/fleet/fleet.types";
import * as driversApi from "../features/fleet/drivers.api";
import type {
  ReportDefinition,
  ReportFilters,
  ReportPreview,
  ReportType
} from "../features/reports/reports.api";
import * as reportsApi from "../features/reports/reports.api";
import * as vehiclesApi from "../features/fleet/vehicles.api";

const statusLabels: Record<BookingStatus, string> = {
  DRAFT: "مسودة",
  CONFIRMED: "مؤكد",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى"
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

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function displayValue(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function isStatusValue(value: string | number | null): value is BookingStatus {
  return typeof value === "string" && bookingStatuses.includes(value as BookingStatus);
}

function isPaymentColumn(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.includes("paid") || normalized.includes("payment");
}

function isMoneyColumn(key: string, value: string | number | null): boolean {
  const normalized = key.toLowerCase();
  return (
    typeof value === "number" ||
    normalized.includes("amount") ||
    normalized.includes("total") ||
    normalized.includes("cost") ||
    normalized.includes("revenue")
  );
}

function safeReportError(fallback: string): string {
  return fallback;
}

function createDefaultFilters(today = new Date()): ReportFilters {
  return {
    startDate: toDateInput(today),
    endDate: toDateInput(addDays(today, 7)),
    overnightOnly: false
  };
}

export function ReportsPage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType>("daily-bookings");
  const [filters, setFilters] = useState<ReportFilters>(() => createDefaultFilters(today));
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [lastPreviewAt, setLastPreviewAt] = useState<string | null>(null);
  const [isLoadingReferences, setIsLoadingReferences] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"excel" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visibleDefinitions = useMemo(
    () =>
      definitions.filter(
        (definition) =>
          !definition.restrictedTo || definition.restrictedTo.includes(user?.role ?? "STAFF")
      ),
    [definitions, user?.role]
  );
  const selectedDefinition =
    visibleDefinitions.find((definition) => definition.type === selectedType) ??
    visibleDefinitions[0];

  const activeFilterCount = [
    filters.vehicleId,
    filters.driverId,
    filters.customerId,
    filters.bookingStatus,
    filters.tripType,
    filters.destination,
    filters.voucherNumber,
    filters.overnightOnly ? "overnightOnly" : undefined
  ].filter(Boolean).length;

  const dateRangeError =
    filters.startDate && filters.endDate && filters.startDate > filters.endDate
      ? "تاريخ النهاية يجب أن يكون بعد تاريخ البداية."
      : null;

  const loadReferences = useCallback(async () => {
    setIsLoadingReferences(true);
    setError(null);
    try {
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
    } catch {
      setError(safeReportError("تعذر تحميل بيانات التقارير."));
    } finally {
      setIsLoadingReferences(false);
    }
  }, []);

  const loadPreview = useCallback(async () => {
    if (!selectedDefinition || dateRangeError) {
      return;
    }
    setIsLoadingPreview(true);
    setError(null);
    setMessage(null);
    try {
      const result = await reportsApi.previewReport(selectedDefinition.type, filters);
      setPreview(result.report);
      setLastPreviewAt(new Date().toISOString());
    } catch {
      setError(safeReportError("تعذر تحميل التقرير."));
    } finally {
      setIsLoadingPreview(false);
    }
  }, [dateRangeError, filters, selectedDefinition]);

  useEffect(() => {
    void loadReferences();
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
    if (selectedDefinition && !preview && !isLoadingReferences) {
      void loadPreview();
    }
  }, [isLoadingReferences, loadPreview, preview, selectedDefinition]);

  async function exportReport(format: "excel" | "pdf"): Promise<void> {
    if (!selectedDefinition || dateRangeError) {
      return;
    }
    setExportingFormat(format);
    setError(null);
    setMessage(null);
    try {
      await reportsApi.downloadReport(selectedDefinition.type, filters, format);
      setMessage(format === "excel" ? "تم إنشاء ملف Excel بنجاح." : "تم إنشاء ملف PDF بنجاح.");
    } catch {
      setError(safeReportError("تعذر إنشاء ملف التقرير. حاول مرة أخرى."));
    } finally {
      setExportingFormat(null);
    }
  }

  function resetFilters(): void {
    setFilters(createDefaultFilters(today));
  }

  function applyPreset(preset: "today" | "last7" | "month"): void {
    const now = new Date();
    if (preset === "today") {
      setFilters((current) => ({
        ...current,
        startDate: toDateInput(now),
        endDate: toDateInput(now)
      }));
      return;
    }
    if (preset === "last7") {
      setFilters((current) => ({
        ...current,
        startDate: toDateInput(addDays(now, -6)),
        endDate: toDateInput(now)
      }));
      return;
    }
    setFilters((current) => ({
      ...current,
      startDate: toDateInput(startOfMonth(now)),
      endDate: toDateInput(now)
    }));
  }

  const canRunReport = Boolean(selectedDefinition) && !dateRangeError && !isLoadingReferences;
  const previewDate = lastPreviewAt ? new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastPreviewAt)) : null;

  return (
    <section className="space-y-6">
      <PageHeader
        title="التقارير والتصدير"
        description="استعرض بيانات التشغيل والحجوزات وصدّر النتائج بصيغ PDF أو Excel."
      />

      {message ? <SuccessAlert message={message} /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      <SectionCard
        title="إعداد التقرير"
        description="حدد نوع التقرير والفترة والفلاتر المطلوبة قبل المعاينة أو التصدير."
        icon={<SlidersHorizontal size={21} aria-hidden="true" />}
        actions={
          activeFilterCount > 0 ? (
            <span className="rounded-full bg-gold/10 px-3 py-2 text-sm font-bold text-gold">
              {activeFilterCount} فلتر نشط
            </span>
          ) : null
        }
      >
        {isLoadingReferences ? (
          <LoadingState label="جاري تحميل خيارات التقارير..." />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <FormField id="reportType" label="نوع التقرير">
                <select
                  id="reportType"
                  className={`${fieldClasses} text-base font-bold`}
                  value={selectedDefinition?.type ?? selectedType}
                  onChange={(event) => {
                    setSelectedType(event.target.value as ReportType);
                    setPreview(null);
                  }}
                >
                  {visibleDefinitions.map((definition) => (
                    <option key={definition.type} value={definition.type}>
                      {definition.title}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="rounded-2xl border border-sea/15 bg-sea/5 p-4 text-sm leading-7 text-olive">
                <p className="font-bold text-ink">{selectedDefinition?.title}</p>
                <p>ستظهر المعاينة حسب الأعمدة والفلاتر التي يدعمها هذا التقرير.</p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">الفترة الزمنية</h3>
                <div className="flex flex-wrap gap-2">
                  <ActionButton type="button" variant="secondary" onClick={() => applyPreset("today")}>
                    اليوم
                  </ActionButton>
                  <ActionButton type="button" variant="secondary" onClick={() => applyPreset("last7")}>
                    آخر 7 أيام
                  </ActionButton>
                  <ActionButton type="button" variant="secondary" onClick={() => applyPreset("month")}>
                    هذا الشهر
                  </ActionButton>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField id="startDate" label="من تاريخ">
                  <input
                    id="startDate"
                    className={`${fieldClasses} text-left`}
                    dir="ltr"
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
                  />
                </FormField>
                <FormField id="endDate" label="إلى تاريخ" error={dateRangeError ?? undefined}>
                  <input
                    id="endDate"
                    className={`${fieldClasses} text-left`}
                    dir="ltr"
                    type="date"
                    value={filters.endDate}
                    aria-invalid={Boolean(dateRangeError)}
                    aria-describedby="endDate-error"
                    onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-bold text-ink">الفلاتر التشغيلية</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField id="vehicleId" label="المركبة">
                  <select
                    id="vehicleId"
                    className={fieldClasses}
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
                </FormField>

                <FormField id="driverId" label="السائق">
                  <select
                    id="driverId"
                    className={fieldClasses}
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
                </FormField>

                <FormField id="customerId" label="العميل">
                  <select
                    id="customerId"
                    className={fieldClasses}
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
                </FormField>

                <FormField id="bookingStatus" label="حالة الحجز">
                  <select
                    id="bookingStatus"
                    className={fieldClasses}
                    value={filters.bookingStatus ?? ""}
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        bookingStatus: event.target.value as BookingStatus | ""
                      })
                    }
                  >
                    <option value="">كل الحالات</option>
                    {bookingStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="tripType" label="نوع الرحلة">
                  <select
                    id="tripType"
                    className={fieldClasses}
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
                </FormField>

                <FormField id="destination" label="الوجهة">
                  <input
                    id="destination"
                    className={fieldClasses}
                    value={filters.destination ?? ""}
                    onChange={(event) =>
                      setFilters({ ...filters, destination: event.target.value || undefined })
                    }
                    placeholder="مثال: الرياض"
                  />
                </FormField>

                <FormField id="voucherNumber" label="الفاوتشر">
                  <input
                    id="voucherNumber"
                    className={`${fieldClasses} text-left`}
                    dir="ltr"
                    value={filters.voucherNumber ?? ""}
                    onChange={(event) =>
                      setFilters({ ...filters, voucherNumber: event.target.value || undefined })
                    }
                    placeholder="VCH-1001"
                  />
                </FormField>

                <label className="flex min-h-12 items-center gap-3 self-start rounded-xl border border-olive/25 bg-white px-4 py-3 text-sm font-bold text-ink transition focus-within:ring-4 focus-within:ring-sea/15 md:self-end">
                  <input
                    className="h-5 w-5 accent-sea"
                    checked={filters.overnightOnly ?? false}
                    onChange={(event) =>
                      setFilters({ ...filters, overnightOnly: event.target.checked })
                    }
                    type="checkbox"
                  />
                  مبيت فقط
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-olive/15 bg-paper/60 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm leading-7 text-olive">
                <p className="font-bold text-ink">إجراءات التقرير</p>
                <p>استخدم المعاينة أولا للتأكد من النتائج، ثم صدّر الملف المطلوب.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:flex">
                <ActionButton
                  type="button"
                  isLoading={isLoadingPreview}
                  disabled={!canRunReport || isLoadingPreview}
                  onClick={() => void loadPreview()}
                >
                  <Search size={18} aria-hidden="true" />
                  {isLoadingPreview ? "جار تحميل المعاينة..." : "معاينة التقرير"}
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="secondary"
                  isLoading={exportingFormat === "excel"}
                  disabled={!canRunReport || !preview || Boolean(exportingFormat)}
                  onClick={() => void exportReport("excel")}
                >
                  <FileSpreadsheet size={18} aria-hidden="true" />
                  {exportingFormat === "excel" ? "جار إنشاء ملف Excel..." : "تصدير Excel"}
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="secondary"
                  isLoading={exportingFormat === "pdf"}
                  disabled={!canRunReport || !preview || Boolean(exportingFormat)}
                  onClick={() => void exportReport("pdf")}
                >
                  <FileText size={18} aria-hidden="true" />
                  {exportingFormat === "pdf" ? "جار إنشاء ملف PDF..." : "تصدير PDF"}
                </ActionButton>
              </div>
            </div>

            <div className="flex justify-end">
              <ActionButton type="button" variant="ghost" onClick={resetFilters}>
                <RotateCcw size={17} aria-hidden="true" />
                إعادة تعيين
              </ActionButton>
            </div>
          </div>
        )}
      </SectionCard>

      <ReportResults
        preview={preview}
        isLoading={isLoadingPreview}
        selectedDefinition={selectedDefinition}
        startDate={filters.startDate}
        endDate={filters.endDate}
        activeFilterCount={activeFilterCount}
        lastPreviewAt={previewDate}
        onRetry={() => void loadPreview()}
        onReset={resetFilters}
      />
    </section>
  );
}

function ReportResults({
  preview,
  isLoading,
  selectedDefinition,
  startDate,
  endDate,
  activeFilterCount,
  lastPreviewAt,
  onRetry,
  onReset
}: {
  preview: ReportPreview | null;
  isLoading: boolean;
  selectedDefinition?: ReportDefinition;
  startDate: string;
  endDate: string;
  activeFilterCount: number;
  lastPreviewAt: string | null;
  onRetry: () => void;
  onReset: () => void;
}) {
  const totals = preview ? Object.entries(preview.totals) : [];

  return (
    <SectionCard
      title="نتائج التقرير"
      description={
        preview
          ? `${preview.definition.title} من ${startDate} إلى ${endDate}. عدد السجلات: ${preview.rowCount}.`
          : selectedDefinition?.title ?? "اختر نوع التقرير ثم اضغط معاينة."
      }
      icon={<Download size={21} aria-hidden="true" />}
      actions={
        <ActionButton type="button" variant="secondary" onClick={onRetry} disabled={!selectedDefinition}>
          <Search size={17} aria-hidden="true" />
          تحديث المعاينة
        </ActionButton>
      }
    >
      {isLoading ? (
        <LoadingState label="جاري تحميل المعاينة..." />
      ) : !preview ? (
        <EmptyState
          title="لا توجد معاينة بعد"
          description="حدد الفلاتر المطلوبة واضغط معاينة التقرير لعرض النتائج."
        />
      ) : preview.rows.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="لا توجد بيانات"
            description="لا توجد نتائج مطابقة للفترة والفلاتر المحددة."
          />
          <div className="flex justify-center">
            <ActionButton type="button" variant="secondary" onClick={onReset}>
              إعادة تعيين الفلاتر
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="عدد النتائج" value={preview.rowCount} />
            <SummaryCard label="الفلاتر النشطة" value={activeFilterCount} />
            {lastPreviewAt ? <SummaryCard label="آخر معاينة" value={lastPreviewAt} /> : null}
            {totals.slice(0, 3).map(([key, value]) => (
              <SummaryCard key={key} label={key} value={value} />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-olive/15 lg:block">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="bg-paper text-ink">
                <tr>
                  {preview.definition.columns.map((column) => (
                    <th className="px-4 py-4 font-bold" key={column.key}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-olive/10">
                {preview.rows.map((row, index) => (
                  <tr className="transition hover:bg-paper/70" key={index}>
                    {preview.definition.columns.map((column) => (
                      <td
                        className="max-w-72 truncate px-4 py-4 text-ink"
                        key={column.key}
                        title={displayValue(row[column.key])}
                        dir={column.type === "number" || column.type === "money" ? "ltr" : "rtl"}
                      >
                        <ReportCell columnKey={column.key} value={row[column.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {preview.rows.map((row, index) => (
              <article className="rounded-2xl border border-olive/15 bg-paper/60 p-4" key={index}>
                {preview.definition.columns.slice(0, 6).map((column) => (
                  <div className="flex items-start justify-between gap-3 border-b border-olive/10 py-2 last:border-b-0" key={column.key}>
                    <span className="text-sm font-bold text-olive">{column.label}</span>
                    <span className="max-w-[58%] break-words text-left text-sm font-semibold text-ink">
                      <ReportCell columnKey={column.key} value={row[column.key]} />
                    </span>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-olive/15 bg-paper/70 p-4">
      <p className="text-sm font-bold text-olive">{label}</p>
      <p className="mt-2 text-xl font-bold text-ink" dir={typeof value === "number" ? "ltr" : "rtl"}>
        {String(value)}
      </p>
    </div>
  );
}

function ReportCell({ columnKey, value }: { columnKey: string; value: string | number | null }) {
  if (isStatusValue(value)) {
    return <StatusBadge status={value} />;
  }

  if (isPaymentColumn(columnKey)) {
    const paid = String(value).toLowerCase() === "true" || String(value).includes("مدفوع");
    return <StatusBadge status={paid ? "ACTIVE" : "DISABLED"} />;
  }

  return (
    <span dir={isMoneyColumn(columnKey, value) ? "ltr" : "rtl"}>
      {displayValue(value)}
    </span>
  );
}

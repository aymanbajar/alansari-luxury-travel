import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  CalendarClock,
  CarFront,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserRoundCheck
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookingStatus, TripType, VehicleStatus } from "@alansari/shared";
import { bookingStatuses, tripTypes, vehicleStatuses } from "@alansari/shared";
import { StatusBadge } from "../components/StatusBadge";
import type { Customer } from "../features/customers/customers.api";
import * as customersApi from "../features/customers/customers.api";
import type {
  DashboardBooking,
  TimelineQuery,
  VehicleTimeline
} from "../features/dashboard/dashboard.api";
import * as dashboardApi from "../features/dashboard/dashboard.api";
import type { Driver, Vehicle } from "../features/fleet/fleet.types";
import * as driversApi from "../features/fleet/drivers.api";
import * as vehiclesApi from "../features/fleet/vehicles.api";

const dateFormatter = new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" });
const timeFormatter = new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat("ar", {
  weekday: "short",
  day: "numeric",
  month: "short"
});

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

const vehicleStatusLabels: Record<VehicleStatus, string> = {
  AVAILABLE: "متاحة",
  BOOKED: "محجوزة",
  MAINTENANCE: "صيانة",
  OUT_OF_SERVICE: "خارج الخدمة",
  INACTIVE: "غير نشطة"
};

function startOfLocalDay(value = new Date()): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 86_400_000);
}

function toLocalDateInput(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 10);
}

function toIsoFromDateInput(value: string, endOfDay = false): string {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return date.toISOString();
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

function makeTimeTicks(start: Date, end: Date, view: TimelineQuery["view"]): Date[] {
  const ticks: Date[] = [];
  const stepHours = view === "day" ? 3 : view === "week" ? 24 : 72;
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += stepHours * 3_600_000) {
    ticks.push(new Date(cursor));
  }
  return ticks;
}

function bookingBarStyle(booking: DashboardBooking, rangeStart: Date, rangeEnd: Date) {
  const total = rangeEnd.getTime() - rangeStart.getTime();
  const left = clampPercent(
    ((new Date(booking.availabilityStartAt).getTime() - rangeStart.getTime()) / total) * 100
  );
  const right = clampPercent(
    ((new Date(booking.availabilityEndAt).getTime() - rangeStart.getTime()) / total) * 100
  );
  return { left: `${left}%`, width: `${Math.max(right - left, 1.5)}%` };
}

function statusClass(booking: DashboardBooking): string {
  if (booking.tripType === "OVERNIGHT" || booking.overnightStay) {
    return "bg-indigo-700 text-white";
  }
  if (booking.status === "CONFIRMED") {
    return "bg-sea text-white";
  }
  if (booking.status === "IN_PROGRESS") {
    return "bg-amber-600 text-white";
  }
  if (booking.status === "COMPLETED") {
    return "bg-olive text-white";
  }
  if (booking.status === "CANCELLED") {
    return "bg-red-200 text-red-900";
  }
  return "bg-ink text-white";
}

function BookingList({ title, items }: { title: string; items: DashboardBooking[] }) {
  return (
    <section className="rounded-lg border border-olive/20 bg-white p-4">
      <h2 className="font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-olive">لا توجد بيانات مطابقة.</p>
      ) : null}
      <div className="mt-3 space-y-3">
        {items.map((booking) => (
          <article className="rounded-md border border-olive/20 p-3" key={booking.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{booking.voucherNumber}</p>
              <StatusBadge status={booking.status} />
            </div>
            <p className="mt-1 text-sm text-olive">
              {booking.customer.fullName} - {booking.vehicle.plateNumber} -{" "}
              {booking.driver.fullName}
            </p>
            <p className="mt-1 text-sm text-olive">
              {dateFormatter.format(new Date(booking.startAt))} إلى{" "}
              {dateFormatter.format(new Date(booking.endAt))}
            </p>
            {booking.overnightStay ? (
              <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-800">
                <BedDouble size={13} aria-hidden="true" />
                {booking.overnightStay.accommodationName} - {booking.overnightStay.nightsCount} ليلة
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-olive/20 bg-white p-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="grid grid-cols-[150px_1fr] gap-3" key={index}>
          <div className="h-10 animate-pulse rounded-md bg-olive/10" />
          <div className="h-10 animate-pulse rounded-md bg-olive/10" />
        </div>
      ))}
    </div>
  );
}

function VehicleTimelineView({
  timeline,
  onBookingClick,
  onVehicleClick
}: {
  timeline: VehicleTimeline;
  onBookingClick: (booking: DashboardBooking) => void;
  onVehicleClick: (vehicle: VehicleTimeline["rows"][number]["vehicle"]) => void;
}) {
  const rangeStart = new Date(timeline.range.startFrom);
  const rangeEnd = new Date(timeline.range.endTo);
  const ticks = makeTimeTicks(rangeStart, rangeEnd, timeline.view);
  const now = new Date();
  const nowPercent =
    now >= rangeStart && now <= rangeEnd
      ? clampPercent(
          ((now.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) *
            100
        )
      : null;

  if (timeline.rows.length === 0) {
    return (
      <div className="rounded-lg border border-olive/20 bg-white p-6 text-center text-olive">
        لا توجد مركبات أو حجوزات ضمن المرشحات الحالية.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-olive/20 bg-white">
      <div className="overflow-auto" dir="ltr">
        <div className="min-w-[1100px]">
          <div className="sticky top-0 z-20 grid grid-cols-[170px_1fr] border-b border-olive/20 bg-white">
            <div className="sticky left-0 z-30 border-r border-olive/20 bg-white p-3 text-right font-semibold">
              المركبة
            </div>
            <div
              className="relative grid min-h-12"
              style={{ gridTemplateColumns: `repeat(${ticks.length}, 1fr)` }}
            >
              {ticks.map((tick) => (
                <div
                  className="border-l border-olive/10 p-2 text-center text-xs text-olive"
                  key={tick.toISOString()}
                >
                  {timeline.view === "day" ? timeFormatter.format(tick) : dayFormatter.format(tick)}
                </div>
              ))}
              {nowPercent !== null ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-red-500"
                  style={{ left: `${nowPercent}%` }}
                  title="الوقت الحالي"
                />
              ) : null}
            </div>
          </div>

          {timeline.rows.map((row) => (
            <div
              className="grid min-h-16 grid-cols-[170px_1fr] border-b border-olive/10"
              key={row.vehicle.id}
            >
              <button
                className="sticky left-0 z-10 border-r border-olive/20 bg-white p-3 text-right hover:bg-paper"
                onClick={() => onVehicleClick(row.vehicle)}
                type="button"
              >
                <span className="block font-semibold">{row.vehicle.plateNumber}</span>
                <span className="block text-xs text-olive">
                  {row.vehicle.make} {row.vehicle.model}
                </span>
              </button>
              <div className="relative min-h-16 bg-[linear-gradient(to_right,rgba(108,117,90,0.12)_1px,transparent_1px)] bg-[length:120px_100%]">
                {row.bookings.map((booking) => (
                  <button
                    className={`absolute top-3 h-9 overflow-hidden rounded-md px-2 text-right text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ink ${statusClass(
                      booking
                    )}`}
                    key={booking.id}
                    onClick={() => onBookingClick(booking)}
                    style={bookingBarStyle(booking, rangeStart, rangeEnd)}
                    title={`${booking.voucherNumber} - ${booking.customer.fullName} - ${dateFormatter.format(
                      new Date(booking.availabilityStartAt)
                    )}`}
                    type="button"
                  >
                    <span className="block truncate font-semibold">{booking.voucherNumber}</span>
                    <span className="block truncate">{booking.customer.fullName}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const today = startOfLocalDay();
  const [startDate, setStartDate] = useState(toLocalDateInput(today));
  const [endDate, setEndDate] = useState(toLocalDateInput(addDays(today, 7)));
  const [view, setView] = useState<TimelineQuery["view"]>("week");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus | "">("");
  const [driverId, setDriverId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | "">("");
  const [tripType, setTripType] = useState<TripType | "">("");
  const [overnightOnly, setOvernightOnly] = useState(false);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<dashboardApi.DashboardSummary | null>(null);
  const [timeline, setTimeline] = useState<VehicleTimeline | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<DashboardBooking | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<
    VehicleTimeline["rows"][number]["vehicle"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(
    () => ({
      startFrom: toIsoFromDateInput(startDate),
      endTo: toIsoFromDateInput(endDate, true)
    }),
    [endDate, startDate]
  );

  const loadReferences = useCallback(async () => {
    const [vehicleResult, driverResult, customerResult] = await Promise.all([
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
    setVehicles(vehicleResult.vehicles);
    setDrivers(driverResult.drivers);
    setCustomers(customerResult.customers);
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryResult, timelineResult] = await Promise.all([
        dashboardApi.getDashboardSummary(range),
        dashboardApi.getVehicleTimeline({
          ...range,
          view,
          vehicleId: vehicleId || undefined,
          vehicleStatus,
          driverId: driverId || undefined,
          customerId: customerId || undefined,
          bookingStatus,
          tripType,
          overnightOnly,
          voucherNumber: voucherNumber || undefined
        })
      ]);
      setSummary(summaryResult.dashboard);
      setTimeline(timelineResult.timeline);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل لوحة التشغيل.");
    } finally {
      setIsLoading(false);
    }
  }, [
    bookingStatus,
    customerId,
    driverId,
    overnightOnly,
    range,
    tripType,
    vehicleId,
    vehicleStatus,
    view,
    voucherNumber
  ]);

  useEffect(() => {
    void loadReferences().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل المرشحات.");
    });
  }, [loadReferences]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadDashboard();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [loadDashboard]);

  const cards = summary
    ? [
        { label: "حجوزات اليوم", value: summary.cards.todayTotalBookings, icon: CalendarClock },
        { label: "المؤكدة اليوم", value: summary.cards.todayConfirmedBookings, icon: Clock3 },
        { label: "مركبات متاحة", value: summary.cards.vehiclesAvailable, icon: CarFront },
        { label: "مركبات محجوزة", value: summary.cards.vehiclesBooked, icon: CarFront },
        {
          label: "تحت الصيانة",
          value: summary.cards.vehiclesUnderMaintenance,
          icon: AlertTriangle
        },
        { label: "سائقون نشطون", value: summary.cards.activeDrivers, icon: UserRoundCheck },
        { label: "حجوزات قادمة", value: summary.cards.upcomingBookings, icon: CalendarClock },
        { label: "حجوزات مبيت", value: summary.cards.overnightBookings, icon: BedDouble },
        {
          label: "تحتاج انتباه",
          value: summary.cards.bookingsRequiringAttention,
          icon: AlertTriangle
        }
      ]
    : [];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">لوحة التشغيل</h1>
          <p className="mt-1 text-olive">
            متابعة الإرسال اليومي وإتاحة المركبات على خط زمني تفاعلي.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-olive/30 px-4 py-2 font-semibold"
          onClick={() => void loadDashboard()}
          type="button"
        >
          <RefreshCw size={18} aria-hidden="true" />
          تحديث
        </button>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summary
          ? cards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  className="rounded-lg border border-olive/20 bg-white p-4"
                  key={card.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-olive">{card.label}</p>
                    <Icon className="text-sea" size={20} aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-3xl font-bold">{card.value}</p>
                </article>
              );
            })
          : Array.from({ length: 9 }).map((_, index) => (
              <div className="h-28 animate-pulse rounded-lg bg-white" key={index} />
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <BookingList title="قائمة إرسال اليوم" items={summary?.todaysDispatch ?? []} />
        <BookingList title="الحجوزات القادمة" items={summary?.upcomingBookings ?? []} />
        <BookingList title="تنبيهات المبيت" items={summary?.overnightAlerts ?? []} />
        <section className="rounded-lg border border-olive/20 bg-white p-4">
          <h2 className="font-bold">نظرة حالة المركبات</h2>
          <div className="mt-3 space-y-2">
            {(summary?.vehicleStatusOverview ?? []).map((item) => (
              <div
                className="flex items-center justify-between rounded-md bg-paper px-3 py-2"
                key={item.status}
              >
                <span>{vehicleStatusLabels[item.status]}</span>
                <span className="font-bold">{item.count}</span>
              </div>
            ))}
            {summary?.vehicleStatusOverview.length === 0 ? (
              <p className="text-sm text-olive">لا توجد بيانات مركبات.</p>
            ) : null}
          </div>
          <h3 className="mt-5 font-semibold">آخر تغييرات الحجز</h3>
          <div className="mt-2 space-y-2 text-sm text-olive">
            {(summary?.recentChanges ?? []).map((change) => (
              <p className="rounded-md bg-paper p-2" key={change.id}>
                {change.action} - {change.user?.fullName ?? "النظام"} -{" "}
                {dateFormatter.format(new Date(change.createdAt))}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-ink/5 backdrop-blur">
          <div className="border-b border-olive/10 bg-gradient-to-l from-paper/80 via-white/80 to-sea/5 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sea/10 text-sea shadow-sm">
                  <SlidersHorizontal size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-ink">الخط الزمني للمركبات</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-7 text-olive">
                    يعرض حتى 60 مركبة مع حجز الموارد حسب فترة الإتاحة المخزنة، مع مرشحات دقيقة للبحث السريع.
                  </p>
                </div>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-olive/20 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-sm shadow-ink/5 transition hover:-translate-y-0.5 hover:border-gold/35 hover:bg-paper focus:outline-none focus:ring-4 focus:ring-sea/15 active:translate-y-0"
                onClick={() => void loadDashboard()}
                type="button"
              >
                <RefreshCw size={17} aria-hidden="true" />
                تحديث الخط الزمني
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">من تاريخ</span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive" size={18} aria-hidden="true" />
                <input
                  className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 pr-11 text-left text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                  dir="ltr"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">إلى تاريخ</span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive" size={18} aria-hidden="true" />
                <input
                  className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 pr-11 text-left text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                  dir="ltr"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">طريقة العرض</span>
              <select
                className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                value={view}
                onChange={(event) => setView(event.target.value as TimelineQuery["view"])}
              >
                <option value="day">يومي</option>
                <option value="week">أسبوعي</option>
                <option value="month">شهري</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">المركبة</span>
              <select
                className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
              >
                <option value="">كل المركبات</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">حالة المركبة</span>
              <select
                className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                value={vehicleStatus}
                onChange={(event) => setVehicleStatus(event.target.value as VehicleStatus | "")}
              >
                <option value="">كل الحالات</option>
                {vehicleStatuses.map((status) => (
                  <option key={status} value={status}>
                    {vehicleStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">السائق</span>
              <select
                className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                value={driverId}
                onChange={(event) => setDriverId(event.target.value)}
              >
                <option value="">كل السائقين</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">العميل</span>
              <select
                className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">كل العملاء</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">حالة الحجز</span>
              <select
                className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                value={bookingStatus}
                onChange={(event) => setBookingStatus(event.target.value as BookingStatus | "")}
              >
                <option value="">كل الحالات</option>
                {bookingStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-ink">نوع الرحلة</span>
              <select
                className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                value={tripType}
                onChange={(event) => setTripType(event.target.value as TripType | "")}
              >
                <option value="">كل الأنواع</option>
                {tripTypes.map((type) => (
                  <option key={type} value={type}>
                    {tripLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-sm font-bold text-ink">رقم الفاوتشر</span>
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive" size={18} aria-hidden="true" />
                <input
                  className="min-h-12 w-full rounded-xl border border-olive/20 bg-white/95 px-4 py-3 pr-11 text-left text-sm font-semibold text-ink shadow-sm shadow-ink/5 outline-none transition placeholder:text-olive/45 hover:border-gold/35 focus:border-sea focus:ring-4 focus:ring-sea/15"
                  dir="ltr"
                  value={voucherNumber}
                  onChange={(event) => setVoucherNumber(event.target.value)}
                  placeholder="ALT-2026-0801"
                />
              </div>
            </label>
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 self-end rounded-xl border border-olive/20 bg-paper/70 px-4 py-3 shadow-sm shadow-ink/5 transition hover:border-gold/35 hover:bg-white focus-within:ring-4 focus-within:ring-sea/15">
              <span className="flex items-center gap-2 text-sm font-black text-ink">
                <Filter size={18} className="text-sea" aria-hidden="true" />
                مبيت فقط
              </span>
              <input
                className="peer sr-only"
                checked={overnightOnly}
                onChange={(event) => setOvernightOnly(event.target.checked)}
                type="checkbox"
              />
              <span className="relative h-6 w-11 rounded-full bg-olive/25 transition peer-checked:bg-sea after:absolute after:right-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-[-1.25rem]" />
            </label>
          </div>
        </div>

        <div className="md:hidden rounded-lg border border-olive/20 bg-white p-4">
          <h3 className="font-bold">عرض الجوال</h3>
          <p className="mt-1 text-sm text-olive">
            يعرض الجوال الحجوزات القادمة بشكل مبسط. استخدم سطح المكتب للخط الزمني الكامل.
          </p>
          <div className="mt-3 space-y-3">
            {(summary?.upcomingBookings ?? []).slice(0, 8).map((booking) => (
              <button
                className="block w-full rounded-md border border-olive/20 p-3 text-right"
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                type="button"
              >
                <span className="block font-semibold">{booking.voucherNumber}</span>
                <span className="block text-sm text-olive">
                  {booking.vehicle.plateNumber} - {booking.customer.fullName}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          {isLoading || !timeline ? (
            <TimelineSkeleton />
          ) : (
            <VehicleTimelineView
              timeline={timeline}
              onBookingClick={setSelectedBooking}
              onVehicleClick={setSelectedVehicle}
            />
          )}
        </div>
      </section>

      {selectedBooking ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{selectedBooking.voucherNumber}</h2>
                <p className="text-sm text-olive">{selectedBooking.customer.fullName}</p>
              </div>
              <button
                className="rounded-md border border-olive/30 px-3 py-2"
                onClick={() => setSelectedBooking(null)}
                type="button"
              >
                إغلاق
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-olive">
              <p>المركبة: {selectedBooking.vehicle.plateNumber}</p>
              <p>السائق: {selectedBooking.driver.fullName}</p>
              <p>الوجهة: {selectedBooking.destination}</p>
              <p>نوع الرحلة: {tripLabels[selectedBooking.tripType]}</p>
              <p>
                وقت الرحلة: {dateFormatter.format(new Date(selectedBooking.startAt))} إلى{" "}
                {dateFormatter.format(new Date(selectedBooking.endAt))}
              </p>
              <p>
                حجب الإتاحة: {dateFormatter.format(new Date(selectedBooking.availabilityStartAt))}{" "}
                إلى {dateFormatter.format(new Date(selectedBooking.availabilityEndAt))}
              </p>
              {selectedBooking.overnightStay ? (
                <div className="rounded-md bg-indigo-50 p-3 text-indigo-900">
                  <p className="font-semibold">تفاصيل المبيت</p>
                  <p>{selectedBooking.overnightStay.accommodationName}</p>
                  <p>
                    {selectedBooking.overnightStay.city} -{" "}
                    {selectedBooking.overnightStay.nightsCount} ليلة
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedVehicle ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{selectedVehicle.plateNumber}</h2>
                <p className="text-sm text-olive">
                  {selectedVehicle.make} {selectedVehicle.model}
                </p>
              </div>
              <button
                className="rounded-md border border-olive/30 px-3 py-2"
                onClick={() => setSelectedVehicle(null)}
                type="button"
              >
                إغلاق
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-olive">
              <p>الحالة: {vehicleStatusLabels[selectedVehicle.status]}</p>
              <p>السعة: {selectedVehicle.passengerCapacity} ركاب</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

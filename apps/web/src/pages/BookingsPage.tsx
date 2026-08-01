import { zodResolver } from "@hookform/resolvers/zod";
import type { BookingStatus, TripType } from "@alansari/shared";
import { bookingStatuses, tripTypes } from "@alansari/shared";
import {
  Ban,
  BedDouble,
  CalendarClock,
  CarFront,
  Clock3,
  Edit,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  UsersRound,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ActionButton,
  ConfirmDialog,
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
import type { AvailabilityResult } from "../features/availability/availability.api";
import * as availabilityApi from "../features/availability/availability.api";
import { useAuth } from "../features/auth/useAuth";
import type { Booking, BookingQuery } from "../features/bookings/bookings.api";
import * as bookingsApi from "../features/bookings/bookings.api";
import type { Customer } from "../features/customers/customers.api";
import * as customersApi from "../features/customers/customers.api";
import type { Driver, Vehicle } from "../features/fleet/fleet.types";
import * as driversApi from "../features/fleet/drivers.api";
import * as vehiclesApi from "../features/fleet/vehicles.api";
import type { OvernightSettings } from "../features/settings/settings.api";
import * as settingsApi from "../features/settings/settings.api";
import { ApiError } from "../lib/api";

const schema = z
  .object({
    voucherNumber: z.string().min(1, "رقم الفاوتشر مطلوب."),
    customerId: z.string().uuid("اختر العميل."),
    vehicleId: z.string().uuid("اختر المركبة."),
    driverId: z.string().uuid("اختر السائق."),
    startAtLocal: z.string().min(1, "وقت البداية مطلوب."),
    endAtLocal: z.string().min(1, "وقت النهاية مطلوب."),
    tripType: z.enum(tripTypes),
    destination: z.string().optional(),
    accommodationName: z.string().optional(),
    checkInDate: z.string().optional(),
    checkOutDate: z.string().optional(),
    overnightCity: z.string().optional(),
    driverDailyRate: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().nonnegative("سعر المبيت لا يمكن أن يكون سالبا.").optional()
    ),
    totalDriverCost: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().nonnegative("إجمالي المبيت لا يمكن أن يكون سالبا.").optional()
    ),
    overrideReason: z.string().optional(),
    overnightNotes: z.string().optional(),
    notes: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.startAtLocal && value.endAtLocal && new Date(value.endAtLocal) <= new Date(value.startAtLocal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "وقت نهاية الحجز يجب أن يكون بعد وقت البداية.",
        path: ["endAtLocal"]
      });
    }

    if (value.tripType !== "CITY" && !value.destination?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "الوجهة مطلوبة للرحلات الخارجية.",
        path: ["destination"]
      });
    }

    if (value.tripType === "CITY") {
      const hasOvernightData =
        value.accommodationName || value.checkInDate || value.checkOutDate || value.overnightCity;
      if (hasOvernightData) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "رحلات داخل المدينة لا تقبل بيانات المبيت.",
          path: ["accommodationName"]
        });
      }
    }

    if (value.tripType === "OVERNIGHT") {
      if (!value.accommodationName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "اسم السكن مطلوب لرحلة المبيت.",
          path: ["accommodationName"]
        });
      }
      if (!value.checkInDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "تاريخ الدخول مطلوب.",
          path: ["checkInDate"]
        });
      }
      if (!value.checkOutDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "تاريخ الخروج مطلوب.",
          path: ["checkOutDate"]
        });
      }
    }

    if (value.checkInDate && value.checkOutDate && value.checkOutDate <= value.checkInDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ الخروج يجب أن يكون بعد تاريخ الدخول.",
        path: ["checkOutDate"]
      });
    }

    if (
      (value.driverDailyRate !== undefined || value.totalDriverCost !== undefined) &&
      !value.overrideReason?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "سبب التعديل مطلوب عند تغيير تكلفة المبيت.",
        path: ["overrideReason"]
      });
    }
  });

const quickCustomerSchema = z.object({
  fullName: z.string().min(2, "اسم العميل مطلوب."),
  phoneCountryCode: z.string().min(1, "مفتاح الدولة مطلوب.").max(8),
  phoneNumber: z.string().min(5, "رقم الهاتف غير صالح.")
});

type FormValues = z.infer<typeof schema>;
type QuickCustomerValues = z.infer<typeof quickCustomerSchema>;

const dateFormatter = new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" });
const dayFormatter = new Intl.DateTimeFormat("ar", { dateStyle: "medium" });

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

const defaultSettings: OvernightSettings = {
  defaultDriverDailyRate: "250.00",
  preTripBufferHours: 12,
  postTripBufferHours: 12,
  currency: "SAR",
  timezone: "Asia/Riyadh"
};

const emptyBookingForm: Partial<FormValues> = {
  tripType: "CITY",
  destination: "",
  voucherNumber: "",
  customerId: "",
  vehicleId: "",
  driverId: "",
  startAtLocal: "",
  endAtLocal: "",
  notes: ""
};

function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString();
}

function toLocalInputValue(value: string): string {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateInputValue(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function calculateNights(checkInDate?: string, checkOutDate?: string): number {
  if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
    return 0;
  }
  return Math.round(
    (new Date(`${checkOutDate}T00:00:00.000Z`).getTime() -
      new Date(`${checkInDate}T00:00:00.000Z`).getTime()) /
      86_400_000
  );
}

function parseAmount(value: string | number | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addHours(value: string, hours: number): Date {
  return new Date(new Date(value).getTime() + hours * 3_600_000);
}

function isAvailabilityResult(value: unknown): value is AvailabilityResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "hasConflict" in value &&
    "conflicts" in value &&
    "alternativeVehicles" in value &&
    "alternativeDrivers" in value
  );
}

function friendlyBookingError(fallback: string, caught: unknown): string {
  if (caught instanceof ApiError) {
    if (caught.code === "BOOKING_CONFLICT") {
      return "حدث تعارض مع حجز موجود. اختر مركبة أو سائقا بديلا ثم حاول مرة أخرى.";
    }
    if (caught.code.includes("FORBIDDEN") || caught.status === 403) {
      return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
    }
    if (caught.code.includes("DUPLICATE") || caught.code.includes("UNIQUE")) {
      return "رقم الفاوتشر مستخدم مسبقا.";
    }
  }

  return fallback;
}

function durationLabel(start?: string, end?: string): string | null {
  if (!start || !end) {
    return null;
  }
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return null;
  }
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.round((diffMs % 3_600_000) / 60_000);
  return minutes > 0 ? `${hours} ساعة و${minutes} دقيقة` : `${hours} ساعة`;
}

export function BookingsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState<BookingQuery>({
    page: 1,
    pageSize: 10,
    sortBy: "startAt",
    sortDirection: "desc",
    status: ""
  });
  const [voucherFilter, setVoucherFilter] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<OvernightSettings>(defaultSettings);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [statusAction, setStatusAction] = useState<{ booking: Booking; status: BookingStatus } | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyBookingForm as FormValues
  });
  const quickForm = useForm<QuickCustomerValues>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: { phoneCountryCode: "+966", fullName: "", phoneNumber: "" }
  });

  const watchedValues = form.watch();
  const selectedCustomer = customers.find((customer) => customer.id === watchedValues.customerId);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === watchedValues.vehicleId);
  const selectedDriver = drivers.find((driver) => driver.id === watchedValues.driverId);
  const isStaffCompletedEdit = user?.role === "STAFF" && editing?.status === "COMPLETED";
  const hasSelectedConflict = availability?.hasConflict ?? false;
  const showsOvernightFields = watchedValues.tripType === "OVERNIGHT";
  const canOverrideCost = user?.role === "ADMIN";
  const hasRateOverride =
    canOverrideCost &&
    watchedValues.driverDailyRate !== undefined &&
    String(watchedValues.driverDailyRate) !== "";

  const nightsCount = calculateNights(watchedValues.checkInDate, watchedValues.checkOutDate);
  const defaultRate = parseAmount(
    selectedDriver?.overnightDailyRate || settings.defaultDriverDailyRate
  );
  const effectiveRate = hasRateOverride ? parseAmount(watchedValues.driverDailyRate) : defaultRate;
  const estimatedCost = nightsCount * effectiveRate;
  const tripDuration = durationLabel(watchedValues.startAtLocal, watchedValues.endAtLocal);

  const blockingWindow = useMemo(() => {
    if (!watchedValues.startAtLocal || !watchedValues.endAtLocal) {
      return null;
    }

    if (availability?.availabilityStartAt && availability.availabilityEndAt) {
      return {
        start: new Date(availability.availabilityStartAt),
        end: new Date(availability.availabilityEndAt)
      };
    }

    return {
      start:
        watchedValues.tripType === "OVERNIGHT"
          ? addHours(watchedValues.startAtLocal, -settings.preTripBufferHours)
          : new Date(watchedValues.startAtLocal),
      end:
        watchedValues.tripType === "OVERNIGHT"
          ? addHours(watchedValues.endAtLocal, settings.postTripBufferHours)
          : new Date(watchedValues.endAtLocal)
    };
  }, [
    availability,
    settings,
    watchedValues.endAtLocal,
    watchedValues.startAtLocal,
    watchedValues.tripType
  ]);

  const bookingStats = useMemo(() => {
    const today = new Date().toDateString();
    return [
      {
        label: "إجمالي الحجوزات",
        value: totalCount || bookings.length,
        icon: CalendarClock,
        context: "حسب نتائج البحث الحالية"
      },
      {
        label: "حجوزات اليوم",
        value: bookings.filter((booking) => new Date(booking.startAt).toDateString() === today).length,
        icon: Clock3,
        context: "من الصفحة المحملة"
      },
      {
        label: "الحجوزات المؤكدة",
        value: bookings.filter((booking) => booking.status === "CONFIRMED").length,
        icon: CarFront,
        context: "من الصفحة المحملة"
      },
      {
        label: "الحجوزات الملغاة",
        value: bookings.filter((booking) => booking.status === "CANCELLED").length,
        icon: Ban,
        context: "من الصفحة المحملة"
      }
    ];
  }, [bookings, totalCount]);

  const activeFilterCount = [
    query.voucherNumber,
    query.status,
    query.vehicleId,
    query.driverId,
    query.startFrom,
    query.sortDirection !== "desc" ? query.sortDirection : undefined
  ].filter(Boolean).length;

  const filteredCustomers = useMemo(() => {
    const normalized = customerSearch.trim().toLowerCase();
    if (!normalized) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.fullName.toLowerCase().includes(normalized) ||
        customer.phoneNumber.toLowerCase().includes(normalized)
    );
  }, [customerSearch, customers]);

  const loadBookings = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await bookingsApi.listBookings(query);
      setBookings(result.bookings);
      setTotalPages(Math.max(result.pagination.pageCount, 1));
      setTotalCount(result.pagination.total);
    } catch (caught) {
      setError(friendlyBookingError("تعذر تحميل الحجوزات.", caught));
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const loadReferenceData = useCallback(async (): Promise<void> => {
    try {
      const [customerResult, vehicleResult, driverResult, settingsResult] = await Promise.all([
        customersApi.listCustomers({
          page: 1,
          pageSize: 100,
          sortBy: "fullName",
          sortDirection: "asc"
        }),
        vehiclesApi.listVehicles({
          page: 1,
          pageSize: 100,
          sortBy: "plateNumber",
          sortDirection: "asc",
          status: "AVAILABLE"
        }),
        driversApi.listDrivers({
          page: 1,
          pageSize: 100,
          sortBy: "fullName",
          sortDirection: "asc",
          status: "AVAILABLE"
        }),
        settingsApi.getOvernightSettings()
      ]);
      setCustomers(customerResult.customers);
      setVehicles(vehicleResult.vehicles);
      setDrivers(driverResult.drivers);
      setSettings(settingsResult.settings);
    } catch (caught) {
      setError(friendlyBookingError("تعذر تحميل بيانات النموذج.", caught));
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQuery((current) => ({
        ...current,
        voucherNumber: voucherFilter.trim() || undefined,
        page: 1
      }));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [voucherFilter]);

  useEffect(() => {
    if (watchedValues.tripType === "CITY") {
      form.setValue("accommodationName", "");
      form.setValue("checkInDate", "");
      form.setValue("checkOutDate", "");
      form.setValue("overnightCity", "");
      form.setValue("driverDailyRate", undefined);
      form.setValue("totalDriverCost", undefined);
      form.setValue("overrideReason", "");
      form.setValue("overnightNotes", "");
    }
  }, [form, watchedValues.tripType]);

  useEffect(() => {
    if (!watchedValues.startAtLocal || !watchedValues.endAtLocal) {
      setAvailability(null);
      return;
    }

    const startAt = new Date(watchedValues.startAtLocal);
    const endAt = new Date(watchedValues.endAtLocal);
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt ||
      (!watchedValues.vehicleId && !watchedValues.driverId)
    ) {
      setAvailability(null);
      return;
    }

    const handle = window.setTimeout(() => {
      setIsCheckingAvailability(true);
      availabilityApi
        .checkAvailability({
          bookingId: editing?.id,
          vehicleId: watchedValues.vehicleId || undefined,
          driverId: watchedValues.driverId || undefined,
          startAt: toIsoFromLocal(watchedValues.startAtLocal),
          endAt: toIsoFromLocal(watchedValues.endAtLocal),
          passengerCapacity: selectedVehicle?.passengerCapacity,
          tripType: watchedValues.tripType
        })
        .then((result) => {
          setAvailability(result.availability);
        })
        .catch((caught: unknown) => {
          setError(friendlyBookingError("تعذر التحقق من الإتاحة.", caught));
        })
        .finally(() => {
          setIsCheckingAvailability(false);
        });
    }, 450);

    return () => window.clearTimeout(handle);
  }, [
    editing?.id,
    form,
    selectedVehicle?.passengerCapacity,
    watchedValues.driverId,
    watchedValues.endAtLocal,
    watchedValues.startAtLocal,
    watchedValues.tripType,
    watchedValues.vehicleId
  ]);

  function resetBookingForm(): void {
    setAvailability(null);
    setEditing(null);
    setSelected(null);
    setDuplicateWarning(null);
    setCustomerSearch("");
    form.reset(emptyBookingForm as FormValues);
  }

  function beginCreate(): void {
    resetBookingForm();
    setError(null);
    setMessage(null);
    setIsBookingDialogOpen(true);
  }

  function edit(booking: Booking): void {
    setEditing(booking);
    setSelected(null);
    setError(null);
    setMessage(null);
    form.reset({
      voucherNumber: booking.voucherNumber,
      customerId: booking.customerId,
      vehicleId: booking.vehicleId,
      driverId: booking.driverId,
      startAtLocal: toLocalInputValue(booking.startAt),
      endAtLocal: toLocalInputValue(booking.endAt),
      tripType: booking.tripType,
      destination: booking.destination,
      accommodationName: booking.overnightStay?.accommodationName ?? "",
      checkInDate: booking.overnightStay?.checkInDate
        ? toDateInputValue(booking.overnightStay.checkInDate)
        : "",
      checkOutDate: booking.overnightStay?.checkOutDate
        ? toDateInputValue(booking.overnightStay.checkOutDate)
        : "",
      overnightCity: booking.overnightStay?.city ?? "",
      driverDailyRate: booking.overnightStay
        ? Number(booking.overnightStay.driverDailyRate)
        : undefined,
      totalDriverCost: booking.overnightStay
        ? Number(booking.overnightStay.totalDriverCost)
        : undefined,
      overrideReason: "",
      overnightNotes: booking.overnightStay?.notes ?? "",
      notes: booking.notes ?? ""
    });
    setIsBookingDialogOpen(true);
  }

  async function quickCreateCustomer(values: QuickCustomerValues): Promise<void> {
    setError(null);
    setMessage(null);
    try {
      const result = await customersApi.createCustomer(values);
      setCustomers((current) => [result.customer, ...current]);
      form.setValue("customerId", result.customer.id, { shouldValidate: true, shouldDirty: true });
      setDuplicateWarning(
        result.possibleMatches.length > 0
          ? `يوجد عميل محتمل بنفس الرقم: ${result.possibleMatches.map((match) => match.fullName).join("، ")}`
          : null
      );
      quickForm.reset({ phoneCountryCode: "+966", fullName: "", phoneNumber: "" });
      setIsCustomerDialogOpen(false);
      setMessage("تم إنشاء العميل واختياره بنجاح.");
    } catch (caught) {
      setError(friendlyBookingError("تعذر إنشاء العميل السريع.", caught));
    }
  }

  async function submit(values: FormValues): Promise<void> {
    setError(null);
    setMessage(null);
    try {
      const shouldSendOvernight = values.tripType === "OVERNIGHT";
      const hasOverride =
        canOverrideCost &&
        (values.driverDailyRate !== undefined || values.totalDriverCost !== undefined);
      const payload: bookingsApi.SaveBookingInput = {
        voucherNumber: values.voucherNumber,
        customerId: values.customerId,
        vehicleId: values.vehicleId,
        driverId: values.driverId,
        startAt: toIsoFromLocal(values.startAtLocal),
        endAt: toIsoFromLocal(values.endAtLocal),
        tripType: values.tripType,
        destination: values.destination ?? "",
        notes: values.notes,
        overnightStay: shouldSendOvernight
          ? {
              city: values.overnightCity || values.destination,
              accommodationName: values.accommodationName,
              checkInDate: values.checkInDate,
              checkOutDate: values.checkOutDate,
              driverDailyRate: hasOverride ? values.driverDailyRate : undefined,
              totalDriverCost: hasOverride ? values.totalDriverCost : undefined,
              overrideReason: hasOverride ? values.overrideReason : undefined,
              notes: values.overnightNotes
            }
          : undefined
      };

      if (editing) {
        await bookingsApi.updateBooking(editing.id, payload);
        setMessage("تم حفظ تعديل الحجز بنجاح.");
      } else {
        await bookingsApi.createBooking(payload);
        setMessage("تم إنشاء الحجز بنجاح.");
      }
      setIsBookingDialogOpen(false);
      resetBookingForm();
      await loadBookings();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "BOOKING_CONFLICT") {
        if (isAvailabilityResult(caught.details)) {
          setAvailability(caught.details);
        }
        setError(friendlyBookingError("حدث تعارض مع حجز موجود.", caught));
        return;
      }
      setError(friendlyBookingError("تعذر حفظ الحجز.", caught));
    }
  }

  async function confirmStatusChange(): Promise<void> {
    if (!statusAction) {
      return;
    }

    setIsMutating(true);
    setError(null);
    setMessage(null);
    try {
      await bookingsApi.updateBookingStatus(statusAction.booking.id, statusAction.status);
      setMessage("تم تغيير حالة الحجز بنجاح.");
      setStatusAction(null);
      await loadBookings();
    } catch (caught) {
      setError(friendlyBookingError("تعذر تغيير حالة الحجز.", caught));
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmCancel(): Promise<void> {
    if (!cancelTarget) {
      return;
    }

    setIsMutating(true);
    setError(null);
    setMessage(null);
    try {
      await bookingsApi.cancelBooking(cancelTarget.id, cancelReason.trim() || undefined);
      setMessage("تم إلغاء الحجز بنجاح.");
      setCancelTarget(null);
      setCancelReason("");
      await loadBookings();
    } catch (caught) {
      setError(friendlyBookingError("تعذر إلغاء الحجز.", caught));
    } finally {
      setIsMutating(false);
    }
  }

  function resetFilters(): void {
    setVoucherFilter("");
    setQuery({
      page: 1,
      pageSize: 10,
      sortBy: "startAt",
      sortDirection: "desc",
      status: ""
    });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="الحجوزات"
        description="إدارة حجوزات الرحلات ومتابعة المركبات والسائقين وحالة كل حجز."
        actions={
          <ActionButton type="button" onClick={beginCreate}>
            <Plus size={18} aria-hidden="true" />
            حجز جديد
          </ActionButton>
        }
      />

      {message ? <SuccessAlert message={message} /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {bookingStats.map(({ label, value, icon: Icon, context }) => (
          <div
            key={label}
            className="rounded-2xl border border-olive/15 bg-white p-5 shadow-sm shadow-ink/5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-olive">{label}</p>
                <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold">
                <Icon size={22} aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-olive/80">{context}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="البحث والتصفية"
        description="استخدم المرشحات للوصول السريع إلى الحجوزات المطلوبة بدون ازدحام بصري."
        icon={<Filter size={21} aria-hidden="true" />}
        actions={
          activeFilterCount > 0 ? (
            <span className="rounded-full bg-gold/10 px-3 py-2 text-sm font-bold text-gold">
              {activeFilterCount} فلتر نشط
            </span>
          ) : null
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FormField id="voucherFilter" label="رقم الفاوتشر">
            <div className="relative">
              <Search
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive"
                size={18}
                aria-hidden="true"
              />
              <input
                id="voucherFilter"
                className={`${fieldClasses} pr-11 text-left`}
                dir="ltr"
                placeholder="VCH-1001"
                value={voucherFilter}
                onChange={(event) => setVoucherFilter(event.target.value)}
              />
            </div>
          </FormField>

          <FormField id="statusFilter" label="الحالة">
            <select
              id="statusFilter"
              className={fieldClasses}
              value={query.status}
              onChange={(event) =>
                setQuery({ ...query, status: event.target.value as BookingStatus | "", page: 1 })
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

          <FormField id="vehicleFilter" label="المركبة">
            <select
              id="vehicleFilter"
              className={fieldClasses}
              value={query.vehicleId ?? ""}
              onChange={(event) => setQuery({ ...query, vehicleId: event.target.value, page: 1 })}
            >
              <option value="">كل المركبات</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="driverFilter" label="السائق">
            <select
              id="driverFilter"
              className={fieldClasses}
              value={query.driverId ?? ""}
              onChange={(event) => setQuery({ ...query, driverId: event.target.value, page: 1 })}
            >
              <option value="">كل السائقين</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="startFromFilter" label="من تاريخ">
            <input
              id="startFromFilter"
              className={`${fieldClasses} text-left`}
              dir="ltr"
              type="datetime-local"
              value={query.startFrom ? toLocalInputValue(query.startFrom) : ""}
              onChange={(event) =>
                setQuery({
                  ...query,
                  startFrom: event.target.value ? toIsoFromLocal(event.target.value) : undefined,
                  page: 1
                })
              }
            />
          </FormField>

          <FormField id="sortDirection" label="الترتيب">
            <select
              id="sortDirection"
              className={fieldClasses}
              value={query.sortDirection}
              onChange={(event) =>
                setQuery({
                  ...query,
                  sortDirection: event.target.value as BookingQuery["sortDirection"],
                  page: 1
                })
              }
            >
              <option value="desc">الأحدث أولا</option>
              <option value="asc">الأقدم أولا</option>
            </select>
          </FormField>
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <ActionButton type="button" variant="secondary" onClick={resetFilters}>
            إعادة تعيين
          </ActionButton>
          <ActionButton type="button" variant="secondary" onClick={() => void loadBookings()}>
            <RefreshCw size={17} aria-hidden="true" />
            تحديث النتائج
          </ActionButton>
        </div>
      </SectionCard>

      <SectionCard
        title="قائمة الحجوزات"
        description={`يعرض الجدول ${bookings.length} حجز من أصل ${totalCount} نتيجة.`}
        icon={<CalendarClock size={21} aria-hidden="true" />}
        actions={
          <ActionButton type="button" variant="secondary" isLoading={isLoading} onClick={() => void loadBookings()}>
            <RefreshCw size={17} aria-hidden="true" />
            تحديث
          </ActionButton>
        }
      >
        {isLoading ? (
          <LoadingState label="جاري تحميل الحجوزات..." />
        ) : bookings.length === 0 ? (
          <EmptyState
            title="لا توجد حجوزات"
            description="لم يتم العثور على حجوزات مطابقة للبحث أو التصفية الحالية."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-olive/15 lg:block">
              <table className="w-full min-w-[980px] text-right text-sm">
                <thead className="bg-paper text-ink">
                  <tr>
                    <th className="px-4 py-4 font-bold">الفاوتشر</th>
                    <th className="px-4 py-4 font-bold">العميل</th>
                    <th className="px-4 py-4 font-bold">الفترة</th>
                    <th className="px-4 py-4 font-bold">المركبة</th>
                    <th className="px-4 py-4 font-bold">السائق</th>
                    <th className="px-4 py-4 font-bold">الحالة</th>
                    <th className="px-4 py-4 font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive/10">
                  {bookings.map((booking) => (
                    <tr className="transition hover:bg-paper/70" key={booking.id}>
                      <td className="px-4 py-4">
                        <button
                          className="font-bold text-sea hover:text-ink focus:outline-none focus:ring-4 focus:ring-sea/15"
                          type="button"
                          dir="ltr"
                          onClick={() => setSelected(booking)}
                        >
                          {booking.voucherNumber}
                        </button>
                        {booking.overnightStay || booking.tripType === "OVERNIGHT" ? (
                          <span className="mt-2 flex w-fit items-center gap-1 rounded-full bg-sea/10 px-2.5 py-1 text-xs font-bold text-sea">
                            <BedDouble size={13} aria-hidden="true" />
                            مبيت
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-ink">{booking.customer.fullName}</p>
                        <p className="mt-1 text-xs text-olive" dir="ltr">
                          {booking.customer.phoneCountryCode} {booking.customer.phoneNumber}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-olive">
                        <p>{dateFormatter.format(new Date(booking.startAt))}</p>
                        <p>{dateFormatter.format(new Date(booking.endAt))}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-ink" dir="ltr">
                          {booking.vehicle.plateNumber}
                        </p>
                        <p className="mt-1 text-xs text-olive">
                          {booking.vehicle.make} {booking.vehicle.model}
                        </p>
                      </td>
                      <td className="px-4 py-4">{booking.driver.fullName}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            type="button"
                            variant="secondary"
                            onClick={() => setSelected(booking)}
                          >
                            تفاصيل
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant="secondary"
                            className="h-11 w-11 px-0"
                            onClick={() => edit(booking)}
                            aria-label={`تعديل الحجز ${booking.voucherNumber}`}
                            title="تعديل"
                          >
                            <Edit size={17} aria-hidden="true" />
                          </ActionButton>
                          <select
                            className={`${fieldClasses} min-h-11 w-36 py-2`}
                            value={booking.status}
                            aria-label={`تغيير حالة الحجز ${booking.voucherNumber}`}
                            onChange={(event) =>
                              setStatusAction({
                                booking,
                                status: event.target.value as BookingStatus
                              })
                            }
                          >
                            {bookingStatuses.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                          </select>
                          <ActionButton
                            type="button"
                            variant="danger"
                            className="h-11 w-11 px-0"
                            disabled={booking.status === "CANCELLED"}
                            onClick={() => setCancelTarget(booking)}
                            aria-label={`إلغاء الحجز ${booking.voucherNumber}`}
                            title="إلغاء"
                          >
                            <Ban size={17} aria-hidden="true" />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {bookings.map((booking) => (
                <article
                  className="rounded-2xl border border-olive/15 bg-paper/60 p-4"
                  key={booking.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="font-bold text-sea"
                        dir="ltr"
                        onClick={() => setSelected(booking)}
                      >
                        {booking.voucherNumber}
                      </button>
                      <h3 className="mt-2 font-bold text-ink">{booking.customer.fullName}</h3>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-olive">
                    <p>
                      <span className="font-bold text-ink">البداية: </span>
                      {dateFormatter.format(new Date(booking.startAt))}
                    </p>
                    <p>
                      <span className="font-bold text-ink">المركبة: </span>
                      <span dir="ltr">{booking.vehicle.plateNumber}</span>
                    </p>
                    <p>
                      <span className="font-bold text-ink">السائق: </span>
                      {booking.driver.fullName}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ActionButton type="button" variant="secondary" onClick={() => setSelected(booking)}>
                      <Eye size={17} aria-hidden="true" />
                      تفاصيل
                    </ActionButton>
                    <ActionButton type="button" variant="secondary" onClick={() => edit(booking)}>
                      <Edit size={17} aria-hidden="true" />
                      تعديل
                    </ActionButton>
                    <select
                      className={`${fieldClasses} col-span-2 sm:col-span-1`}
                      value={booking.status}
                      aria-label={`تغيير حالة الحجز ${booking.voucherNumber}`}
                      onChange={(event) =>
                        setStatusAction({ booking, status: event.target.value as BookingStatus })
                      }
                    >
                      {bookingStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <ActionButton
                      type="button"
                      variant="danger"
                      disabled={booking.status === "CANCELLED"}
                      onClick={() => setCancelTarget(booking)}
                    >
                      <Ban size={17} aria-hidden="true" />
                      إلغاء
                    </ActionButton>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-olive/15 bg-white p-4 text-sm font-semibold text-olive shadow-sm shadow-ink/5 sm:flex-row">
        <ActionButton
          type="button"
          variant="secondary"
          disabled={query.page <= 1}
          onClick={() => setQuery({ ...query, page: query.page - 1 })}
        >
          السابق
        </ActionButton>
        <span>
          صفحة {query.page} من {totalPages}
        </span>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={query.page >= totalPages}
          onClick={() => setQuery({ ...query, page: query.page + 1 })}
        >
          التالي
        </ActionButton>
      </div>

      {isBookingDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-3 py-4 backdrop-blur-sm">
          <button
            className="absolute inset-0 h-full w-full"
            type="button"
            aria-label="إغلاق نموذج الحجز"
            onClick={() => {
              setIsBookingDialogOpen(false);
              resetBookingForm();
            }}
          />
          <form
            className="booking-dialog-shell relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-ink/25"
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-form-title"
            onSubmit={form.handleSubmit(submit)}
          >
            <div className="flex items-start justify-between gap-4 border-b border-olive/10 p-5 sm:p-6">
              <div>
                <h2 id="booking-form-title" className="text-2xl font-bold text-ink">
                  {editing ? "تعديل الحجز" : "إنشاء حجز جديد"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-olive">
                  أدخل بيانات الرحلة واختر العميل والمركبة والسائق المتاحين.
                </p>
              </div>
              <ActionButton
                type="button"
                variant="ghost"
                className="h-11 w-11 px-0"
                aria-label="إغلاق"
                onClick={() => {
                  setIsBookingDialogOpen(false);
                  resetBookingForm();
                }}
              >
                <X size={20} aria-hidden="true" />
              </ActionButton>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {isStaffCompletedEdit ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-7 text-amber-800">
                  الحجوزات المكتملة للقراءة فقط لمستخدم الموظف.
                </div>
              ) : null}

              <div className="space-y-5">
              <SectionCard
                title="بيانات الحجز الأساسية"
                description="رقم الفاوتشر ونوع الرحلة والوجهة."
                icon={<MapPin size={20} aria-hidden="true" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="voucherNumber"
                    label="رقم الفاوتشر"
                    error={form.formState.errors.voucherNumber?.message}
                  >
                    <input
                      id="voucherNumber"
                      className={`${fieldClasses} text-left`}
                      dir="ltr"
                      disabled={isStaffCompletedEdit}
                      placeholder="VCH-1001"
                      aria-invalid={Boolean(form.formState.errors.voucherNumber)}
                      aria-describedby="voucherNumber-error"
                      {...form.register("voucherNumber")}
                    />
                  </FormField>

                  <FormField id="tripType" label="نوع الرحلة">
                    <select
                      id="tripType"
                      className={fieldClasses}
                      disabled={isStaffCompletedEdit}
                      {...form.register("tripType")}
                    >
                      {tripTypes.map((tripType) => (
                        <option key={tripType} value={tripType}>
                          {tripLabels[tripType]}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id="destination"
                    label="الوجهة"
                    error={form.formState.errors.destination?.message}
                  >
                    <input
                      id="destination"
                      className={fieldClasses}
                      disabled={isStaffCompletedEdit}
                      placeholder="أدخل وجهة الرحلة"
                      aria-invalid={Boolean(form.formState.errors.destination)}
                      aria-describedby="destination-error"
                      {...form.register("destination")}
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard
                title="اختيار العميل"
                description="اختر العميل من القائمة أو أنشئ عميلا جديدا بسرعة."
                icon={<UsersRound size={20} aria-hidden="true" />}
                actions={
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCustomerDialogOpen(true)}
                    disabled={isStaffCompletedEdit}
                  >
                    <Plus size={17} aria-hidden="true" />
                    إضافة عميل جديد
                  </ActionButton>
                }
              >
                {duplicateWarning ? (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-7 text-amber-800">
                    {duplicateWarning}
                  </div>
                ) : null}
                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <FormField
                    id="customerSearch"
                    label="بحث العملاء"
                    hint="البحث محلي ضمن العملاء المحملين."
                  >
                    <input
                      id="customerSearch"
                      className={fieldClasses}
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      placeholder="اسم العميل أو رقم الهاتف"
                    />
                  </FormField>

                  <FormField
                    id="customerId"
                    label="العميل"
                    error={form.formState.errors.customerId?.message}
                  >
                    <select
                      id="customerId"
                      className={fieldClasses}
                      disabled={isStaffCompletedEdit}
                      aria-invalid={Boolean(form.formState.errors.customerId)}
                      aria-describedby="customerId-error"
                      {...form.register("customerId")}
                    >
                      <option value="">اختر العميل</option>
                      {filteredCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.fullName} - {customer.phoneCountryCode} {customer.phoneNumber}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                {selectedCustomer ? (
                  <div className="mt-2 rounded-2xl border border-sea/15 bg-sea/5 p-4 text-sm leading-7">
                    <p className="font-bold text-ink">{selectedCustomer.fullName}</p>
                    <p className="text-olive" dir="ltr">
                      {selectedCustomer.phoneCountryCode} {selectedCustomer.phoneNumber}
                    </p>
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard
                title="المركبة والسائق"
                description="تتحقق المنصة من الإتاحة عند تحديد المركبة أو السائق والفترة الزمنية."
                icon={<CarFront size={20} aria-hidden="true" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="vehicleId"
                    label="المركبة"
                    error={form.formState.errors.vehicleId?.message}
                  >
                    <select
                      id="vehicleId"
                      className={fieldClasses}
                      disabled={isStaffCompletedEdit}
                      aria-invalid={Boolean(form.formState.errors.vehicleId)}
                      aria-describedby="vehicleId-error"
                      {...form.register("vehicleId")}
                    >
                      <option value="">اختر المركبة المتاحة</option>
                      {vehicles.map((vehicle) => (
                        <option
                          key={vehicle.id}
                          value={vehicle.id}
                          disabled={!vehicle.availability.selectableForFutureBookings}
                        >
                          {vehicle.plateNumber} - {vehicle.make} {vehicle.model} -{" "}
                          {vehicle.passengerCapacity} ركاب
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id="driverId"
                    label="السائق"
                    error={form.formState.errors.driverId?.message}
                  >
                    <select
                      id="driverId"
                      className={fieldClasses}
                      disabled={isStaffCompletedEdit}
                      aria-invalid={Boolean(form.formState.errors.driverId)}
                      aria-describedby="driverId-error"
                      {...form.register("driverId")}
                    >
                      <option value="">اختر السائق المتاح</option>
                      {drivers.map((driver) => (
                        <option
                          key={driver.id}
                          value={driver.id}
                          disabled={!driver.availability.assignableForFutureBookings}
                        >
                          {driver.fullName} - {driver.phoneNumber}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                {vehicles.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm font-semibold text-olive">
                    لا توجد مركبات متاحة ضمن الفترة المحددة.
                  </p>
                ) : null}
                {drivers.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm font-semibold text-olive">
                    لا يوجد سائق متاح ضمن الفترة المحددة.
                  </p>
                ) : null}
              </SectionCard>

              <SectionCard
                title="التاريخ والوقت"
                description={`المنطقة الزمنية الحالية: ${settings.timezone}`}
                icon={<Clock3 size={20} aria-hidden="true" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="startAtLocal"
                    label="وقت البداية"
                    error={form.formState.errors.startAtLocal?.message}
                  >
                    <input
                      id="startAtLocal"
                      className={`${fieldClasses} text-left`}
                      dir="ltr"
                      disabled={isStaffCompletedEdit}
                      type="datetime-local"
                      aria-invalid={Boolean(form.formState.errors.startAtLocal)}
                      aria-describedby="startAtLocal-error"
                      {...form.register("startAtLocal")}
                    />
                  </FormField>

                  <FormField
                    id="endAtLocal"
                    label="وقت النهاية"
                    error={form.formState.errors.endAtLocal?.message}
                  >
                    <input
                      id="endAtLocal"
                      className={`${fieldClasses} text-left`}
                      dir="ltr"
                      disabled={isStaffCompletedEdit}
                      type="datetime-local"
                      aria-invalid={Boolean(form.formState.errors.endAtLocal)}
                      aria-describedby="endAtLocal-error"
                      {...form.register("endAtLocal")}
                    />
                  </FormField>
                </div>
                {tripDuration ? (
                  <p className="mt-2 rounded-2xl bg-gold/10 px-4 py-3 text-sm font-bold text-gold">
                    مدة الرحلة: {tripDuration}
                  </p>
                ) : null}
              </SectionCard>

              {showsOvernightFields ? (
                <SectionCard
                  title="تفاصيل المبيت"
                  description="بيانات السكن والتكلفة عند اختيار رحلة مبيت."
                  icon={<BedDouble size={20} aria-hidden="true" />}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField id="overnightCity" label="المدينة">
                      <input
                        id="overnightCity"
                        className={fieldClasses}
                        disabled={isStaffCompletedEdit}
                        {...form.register("overnightCity")}
                      />
                    </FormField>

                    <FormField
                      id="accommodationName"
                      label="اسم السكن"
                      error={form.formState.errors.accommodationName?.message}
                    >
                      <input
                        id="accommodationName"
                        className={fieldClasses}
                        disabled={isStaffCompletedEdit}
                        aria-invalid={Boolean(form.formState.errors.accommodationName)}
                        aria-describedby="accommodationName-error"
                        {...form.register("accommodationName")}
                      />
                    </FormField>

                    <FormField
                      id="checkInDate"
                      label="تاريخ الدخول"
                      error={form.formState.errors.checkInDate?.message}
                    >
                      <input
                        id="checkInDate"
                        className={`${fieldClasses} text-left`}
                        dir="ltr"
                        disabled={isStaffCompletedEdit}
                        type="date"
                        aria-invalid={Boolean(form.formState.errors.checkInDate)}
                        aria-describedby="checkInDate-error"
                        {...form.register("checkInDate")}
                      />
                    </FormField>

                    <FormField
                      id="checkOutDate"
                      label="تاريخ الخروج"
                      error={form.formState.errors.checkOutDate?.message}
                    >
                      <input
                        id="checkOutDate"
                        className={`${fieldClasses} text-left`}
                        dir="ltr"
                        disabled={isStaffCompletedEdit}
                        type="date"
                        aria-invalid={Boolean(form.formState.errors.checkOutDate)}
                        aria-describedby="checkOutDate-error"
                        {...form.register("checkOutDate")}
                      />
                    </FormField>

                    {canOverrideCost ? (
                      <>
                        <FormField
                          id="driverDailyRate"
                          label="سعر السائق لليلة"
                          error={form.formState.errors.driverDailyRate?.message}
                        >
                          <input
                            id="driverDailyRate"
                            className={`${fieldClasses} text-left`}
                            dir="ltr"
                            min="0"
                            step="0.01"
                            type="number"
                            {...form.register("driverDailyRate")}
                          />
                        </FormField>
                        <FormField
                          id="totalDriverCost"
                          label="إجمالي تكلفة السائق"
                          error={form.formState.errors.totalDriverCost?.message}
                        >
                          <input
                            id="totalDriverCost"
                            className={`${fieldClasses} text-left`}
                            dir="ltr"
                            min="0"
                            step="0.01"
                            type="number"
                            {...form.register("totalDriverCost")}
                          />
                        </FormField>
                        <div className="md:col-span-2">
                          <FormField
                            id="overrideReason"
                            label="سبب التعديل اليدوي"
                            error={form.formState.errors.overrideReason?.message}
                          >
                            <input
                              id="overrideReason"
                              className={fieldClasses}
                              {...form.register("overrideReason")}
                            />
                          </FormField>
                        </div>
                      </>
                    ) : null}

                    <div className="md:col-span-2">
                      <FormField id="overnightNotes" label="ملاحظات المبيت">
                        <textarea
                          id="overnightNotes"
                          className={`${fieldClasses} min-h-24`}
                          disabled={isStaffCompletedEdit}
                          {...form.register("overnightNotes")}
                        />
                      </FormField>
                    </div>
                  </div>
                  <div className="mt-2 rounded-2xl border border-olive/15 bg-paper p-4 text-sm leading-7">
                    <p className="font-bold text-ink">حساب المبيت</p>
                    <p className="text-olive">
                      {nightsCount} ليلة × {effectiveRate.toFixed(2)} {settings.currency} ={" "}
                      {estimatedCost.toFixed(2)} {settings.currency}
                    </p>
                  </div>
                </SectionCard>
              ) : null}

              <SectionCard title="الملاحظات" description="أضف أي تعليمات خاصة بالرحلة.">
                <FormField id="notes" label="ملاحظات">
                  <textarea
                    id="notes"
                    className={`${fieldClasses} min-h-28`}
                    disabled={isStaffCompletedEdit}
                    placeholder="أضف أي تعليمات أو ملاحظات خاصة بالرحلة."
                    {...form.register("notes")}
                  />
                </FormField>
              </SectionCard>

              {isCheckingAvailability ? (
                <div className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-sm font-semibold text-olive">
                  <Loader2 className="animate-spin motion-reduce:animate-none" size={18} aria-hidden="true" />
                  جاري التحقق من الإتاحة...
                </div>
              ) : null}

              {availability?.hasConflict ? (
                <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800">
                  <p className="font-bold">يوجد تعارض مع حجز قائم.</p>
                  {availability.conflicts.map((conflict) => (
                    <p key={`${conflict.type}-${conflict.bookingId}`}>
                      {conflict.type === "VEHICLE" ? "المركبة" : "السائق"} غير متاح بسبب الحجز{" "}
                      <span dir="ltr">{conflict.voucherNumber}</span> من{" "}
                      {dateFormatter.format(new Date(conflict.availabilityStartAt))} إلى{" "}
                      {dateFormatter.format(new Date(conflict.availabilityEndAt))}
                    </p>
                  ))}
                  {availability.alternativeVehicles.length > 0 ? (
                    <div>
                      <p className="font-bold">مركبات بديلة</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {availability.alternativeVehicles.map((vehicle) => (
                          <ActionButton
                            key={vehicle.id}
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              form.setValue("vehicleId", vehicle.id, { shouldValidate: true, shouldDirty: true })
                            }
                          >
                            {vehicle.plateNumber} - {vehicle.passengerCapacity} ركاب
                          </ActionButton>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {availability.alternativeDrivers.length > 0 ? (
                    <div>
                      <p className="font-bold">سائقون بدلاء</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {availability.alternativeDrivers.map((driver) => (
                          <ActionButton
                            key={driver.id}
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              form.setValue("driverId", driver.id, { shouldValidate: true, shouldDirty: true })
                            }
                          >
                            {driver.fullName}
                          </ActionButton>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

                {blockingWindow ? (
                  <div className="rounded-2xl border border-olive/15 bg-paper p-4 text-sm leading-7 text-olive">
                    <p className="font-bold text-ink">ملخص الحجز</p>
                    <p>
                      {selectedCustomer?.fullName ?? "لم يتم اختيار العميل"} -{" "}
                      {watchedValues.destination || "لم يتم تحديد الوجهة"} -{" "}
                      {tripLabels[watchedValues.tripType]}
                    </p>
                    <p>
                      فترة حجب الإتاحة: {dateFormatter.format(blockingWindow.start)} إلى{" "}
                      {dateFormatter.format(blockingWindow.end)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-olive/10 bg-white/95 p-5 backdrop-blur sm:flex-row sm:justify-end sm:p-6">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsBookingDialogOpen(false);
                  resetBookingForm();
                }}
                disabled={form.formState.isSubmitting}
              >
                إلغاء
              </ActionButton>
              <ActionButton
                type="submit"
                isLoading={form.formState.isSubmitting}
                disabled={isStaffCompletedEdit || isCheckingAvailability || hasSelectedConflict}
              >
                {form.formState.isSubmitting
                  ? "جار إنشاء الحجز..."
                  : editing
                    ? "حفظ التعديل"
                    : "إنشاء الحجز"}
              </ActionButton>
            </div>
          </form>
        </div>
      ) : null}

      {isCustomerDialogOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/55 px-4 py-6 backdrop-blur-sm">
          <button
            className="absolute inset-0 h-full w-full"
            type="button"
            aria-label="إغلاق نموذج العميل"
            onClick={() => setIsCustomerDialogOpen(false)}
          />
          <form
            className="relative w-full max-w-lg rounded-2xl border border-white/70 bg-white p-6 shadow-2xl shadow-ink/25"
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-customer-title"
            onSubmit={quickForm.handleSubmit(quickCreateCustomer)}
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-olive/10 pb-4">
              <div>
                <h2 id="quick-customer-title" className="text-xl font-bold text-ink">
                  إضافة عميل جديد
                </h2>
                <p className="mt-2 text-sm leading-7 text-olive">
                  سيتم اختيار العميل تلقائيا بعد الإنشاء.
                </p>
              </div>
              <ActionButton
                type="button"
                variant="ghost"
                className="h-11 w-11 px-0"
                aria-label="إغلاق"
                onClick={() => setIsCustomerDialogOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </ActionButton>
            </div>
            <div className="grid gap-4">
              <FormField
                id="quickFullName"
                label="اسم العميل"
                error={quickForm.formState.errors.fullName?.message}
              >
                <input
                  id="quickFullName"
                  className={fieldClasses}
                  placeholder="الاسم الكامل"
                  {...quickForm.register("fullName")}
                />
              </FormField>
              <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
                <FormField
                  id="phoneCountryCode"
                  label="مفتاح الدولة"
                  error={quickForm.formState.errors.phoneCountryCode?.message}
                >
                  <input
                    id="phoneCountryCode"
                    className={`${fieldClasses} text-left`}
                    dir="ltr"
                    placeholder="+966"
                    {...quickForm.register("phoneCountryCode")}
                  />
                </FormField>
                <FormField
                  id="phoneNumber"
                  label="رقم الهاتف"
                  error={quickForm.formState.errors.phoneNumber?.message}
                >
                  <input
                    id="phoneNumber"
                    className={`${fieldClasses} text-left`}
                    dir="ltr"
                    placeholder="500000000"
                    {...quickForm.register("phoneNumber")}
                  />
                </FormField>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => setIsCustomerDialogOpen(false)}
                disabled={quickForm.formState.isSubmitting}
              >
                إلغاء
              </ActionButton>
              <ActionButton type="submit" isLoading={quickForm.formState.isSubmitting}>
                إضافة واختيار العميل
              </ActionButton>
            </div>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4 py-6 backdrop-blur-sm">
          <button
            className="absolute inset-0 h-full w-full"
            type="button"
            aria-label="إغلاق تفاصيل الحجز"
            onClick={() => setSelected(null)}
          />
          <div
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/70 bg-white p-6 shadow-2xl shadow-ink/25"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-details-title"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-olive/10 pb-4">
              <div>
                <p className="text-sm font-bold text-gold" dir="ltr">
                  {selected.voucherNumber}
                </p>
                <h2 id="booking-details-title" className="mt-1 text-2xl font-bold text-ink">
                  تفاصيل الحجز
                </h2>
              </div>
              <ActionButton
                type="button"
                variant="ghost"
                className="h-11 w-11 px-0"
                aria-label="إغلاق"
                onClick={() => setSelected(null)}
              >
                <X size={20} aria-hidden="true" />
              </ActionButton>
            </div>
            <div className="grid gap-4 text-sm leading-7 sm:grid-cols-2">
              <Detail label="العميل" value={selected.customer.fullName} />
              <Detail
                label="الهاتف"
                value={`${selected.customer.phoneCountryCode} ${selected.customer.phoneNumber}`}
                ltr
              />
              <Detail label="نوع الرحلة" value={tripLabels[selected.tripType]} />
              <Detail label="الوجهة" value={selected.destination || "غير محددة"} />
              <Detail
                label="البداية"
                value={dateFormatter.format(new Date(selected.startAt))}
              />
              <Detail label="النهاية" value={dateFormatter.format(new Date(selected.endAt))} />
              <Detail
                label="المركبة"
                value={`${selected.vehicle.plateNumber} - ${selected.vehicle.make} ${selected.vehicle.model}`}
              />
              <Detail label="السائق" value={selected.driver.fullName} />
              <div>
                <p className="mb-2 font-bold text-olive">الحالة</p>
                <StatusBadge status={selected.status} />
              </div>
              <Detail
                label="آخر تحديث"
                value={dateFormatter.format(new Date(selected.updatedAt))}
              />
              {selected.overnightStay ? (
                <div className="rounded-2xl bg-sea/5 p-4 sm:col-span-2">
                  <p className="font-bold text-ink">بيانات المبيت</p>
                  <p className="mt-2 text-olive">السكن: {selected.overnightStay.accommodationName}</p>
                  <p className="text-olive">المدينة: {selected.overnightStay.city}</p>
                  <p className="text-olive">
                    التواريخ: {dayFormatter.format(new Date(selected.overnightStay.checkInDate))} -{" "}
                    {dayFormatter.format(new Date(selected.overnightStay.checkOutDate))}
                  </p>
                  <p className="text-olive">
                    التكلفة: {selected.overnightStay.nightsCount} ليلة ×{" "}
                    {selected.overnightStay.driverDailyRate} ={" "}
                    {selected.overnightStay.totalDriverCost} {settings.currency}
                  </p>
                </div>
              ) : null}
              <Detail
                label="الملاحظات"
                value={selected.notes || "لا توجد ملاحظات."}
                className="sm:col-span-2"
              />
            </div>
          </div>
        </div>
      ) : null}

      {cancelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4 py-6 backdrop-blur-sm">
          <button
            className="absolute inset-0 h-full w-full"
            type="button"
            aria-label="إغلاق تأكيد الإلغاء"
            onClick={() => setCancelTarget(null)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl shadow-ink/25"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-booking-title"
          >
            <h2 id="cancel-booking-title" className="text-xl font-bold text-ink">
              إلغاء الحجز
            </h2>
            <p className="mt-3 text-sm leading-7 text-olive">
              هل أنت متأكد من إلغاء هذا الحجز؟ لن يكون الحجز فعالا بعد التأكيد.
            </p>
            <FormField id="cancelReason" label="سبب الإلغاء">
              <textarea
                id="cancelReason"
                className={`${fieldClasses} mt-3 min-h-24`}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="اختياري"
              />
            </FormField>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => setCancelTarget(null)}
                disabled={isMutating}
              >
                تراجع
              </ActionButton>
              <ActionButton type="button" variant="danger" isLoading={isMutating} onClick={() => void confirmCancel()}>
                تأكيد الإلغاء
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(statusAction)}
        isLoading={isMutating}
        title="تغيير حالة الحجز"
        description={
          statusAction
            ? `سيتم تغيير حالة الحجز ${statusAction.booking.voucherNumber} إلى ${statusLabels[statusAction.status]}.`
            : ""
        }
        confirmLabel="تأكيد التغيير"
        onCancel={() => setStatusAction(null)}
        onConfirm={() => void confirmStatusChange()}
      />
    </section>
  );
}

function Detail({
  label,
  value,
  ltr = false,
  className = ""
}: {
  label: string;
  value: string;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-paper/70 p-4 ${className}`}>
      <p className="font-bold text-olive">{label}</p>
      <p className="mt-1 font-semibold text-ink" dir={ltr ? "ltr" : "rtl"}>
        {value}
      </p>
    </div>
  );
}

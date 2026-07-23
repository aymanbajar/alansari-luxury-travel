import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, BedDouble, Edit, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { BookingStatus, TripType } from "@alansari/shared";
import { bookingStatuses, tripTypes } from "@alansari/shared";
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
    if (new Date(value.endAtLocal) <= new Date(value.startAtLocal)) {
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
  CANCELLED: "ملغي"
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

export function BookingsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState<BookingQuery>({
    page: 1,
    pageSize: 10,
    sortBy: "startAt",
    sortDirection: "desc",
    status: ""
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<OvernightSettings>(defaultSettings);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tripType: "CITY", destination: "" }
  });
  const quickForm = useForm<QuickCustomerValues>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: { phoneCountryCode: "+966" }
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

  const loadBookings = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await bookingsApi.listBookings(query);
      setBookings(result.bookings);
      setTotalPages(Math.max(result.pagination.pageCount, 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل الحجوزات.");
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
      setError(caught instanceof Error ? caught.message : "تعذر تحميل بيانات النموذج.");
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

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
          setError(caught instanceof Error ? caught.message : "تعذر التحقق من الإتاحة.");
        })
        .finally(() => {
          setIsCheckingAvailability(false);
        });
    }, 450);

    return () => window.clearTimeout(handle);
  }, [
    editing?.id,
    selectedVehicle?.passengerCapacity,
    watchedValues.driverId,
    watchedValues.endAtLocal,
    watchedValues.startAtLocal,
    watchedValues.tripType,
    watchedValues.vehicleId
  ]);

  const summary = useMemo(() => {
    if (!watchedValues.startAtLocal || !watchedValues.endAtLocal) {
      return null;
    }
    return {
      customer: selectedCustomer?.fullName ?? "لم يتم الاختيار",
      vehicle: selectedVehicle?.plateNumber ?? "لم يتم الاختيار",
      driver: selectedDriver?.fullName ?? "لم يتم الاختيار",
      start: dateFormatter.format(new Date(watchedValues.startAtLocal)),
      end: dateFormatter.format(new Date(watchedValues.endAtLocal)),
      tripType: tripLabels[watchedValues.tripType] ?? watchedValues.tripType,
      destination: watchedValues.destination || "لم يتم تحديد الوجهة"
    };
  }, [selectedCustomer, selectedDriver, selectedVehicle, watchedValues]);

  function edit(booking: Booking): void {
    setEditing(booking);
    setSelected(booking);
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
  }

  async function quickCreateCustomer(values: QuickCustomerValues): Promise<void> {
    try {
      const result = await customersApi.createCustomer(values);
      setCustomers((current) => [result.customer, ...current]);
      form.setValue("customerId", result.customer.id, { shouldValidate: true });
      setDuplicateWarning(
        result.possibleMatches.length > 0
          ? `يوجد عميل محتمل بنفس الرقم: ${result.possibleMatches.map((match) => match.fullName).join("، ")}`
          : null
      );
      quickForm.reset({ phoneCountryCode: "+966", fullName: "", phoneNumber: "" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إنشاء العميل السريع.");
    }
  }

  async function submit(values: FormValues): Promise<void> {
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
      } else {
        await bookingsApi.createBooking(payload);
      }
      setAvailability(null);
      setEditing(null);
      setSelected(null);
      form.reset({ tripType: "CITY", destination: "" });
      await loadBookings();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "BOOKING_CONFLICT") {
        if (isAvailabilityResult(caught.details)) {
          setAvailability(caught.details);
        }
        setError("يوجد تعارض في الإتاحة. اختر مركبة أو سائقا بديلا ثم حاول مرة أخرى.");
        return;
      }
      setError(caught instanceof Error ? caught.message : "تعذر حفظ الحجز.");
    }
  }

  async function changeStatus(booking: Booking, status: BookingStatus): Promise<void> {
    try {
      await bookingsApi.updateBookingStatus(booking.id, status);
      await loadBookings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تغيير حالة الحجز.");
    }
  }

  async function cancel(booking: Booking): Promise<void> {
    const reason = window.prompt("سبب الإلغاء");
    if (reason === null) {
      return;
    }
    try {
      await bookingsApi.cancelBooking(booking.id, reason || undefined);
      await loadBookings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إلغاء الحجز.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">الحجوزات</h1>
          <p className="mt-1 text-olive">
            إدارة حجوزات المدينة والرحلات الخارجية والمبيت مع تحقق فوري من إتاحة المركبة والسائق.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-semibold text-white"
          onClick={() => {
            setEditing(null);
            setSelected(null);
            form.reset({ tripType: "CITY", destination: "" });
          }}
        >
          <Plus size={18} aria-hidden="true" />
          حجز جديد
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-6">
        <input
          className="rounded-md border border-olive/30 px-3 py-2"
          placeholder="رقم الفاوتشر"
          onChange={(event) => setQuery({ ...query, voucherNumber: event.target.value, page: 1 })}
        />
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
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
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
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
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
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
        <input
          className="rounded-md border border-olive/30 px-3 py-2"
          type="datetime-local"
          onChange={(event) =>
            setQuery({
              ...query,
              startFrom: event.target.value ? toIsoFromLocal(event.target.value) : undefined,
              page: 1
            })
          }
        />
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.sortDirection}
          onChange={(event) =>
            setQuery({
              ...query,
              sortDirection: event.target.value as BookingQuery["sortDirection"]
            })
          }
        >
          <option value="desc">الأحدث</option>
          <option value="asc">الأقدم</option>
        </select>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <form
          className="grid gap-4 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(submit)}
        >
          {isStaffCompletedEdit ? (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 md:col-span-2">
              الحجوزات المكتملة للقراءة فقط لمستخدم الموظف.
            </p>
          ) : null}

          <label>
            <span className="mb-2 block text-sm font-medium">رقم الفاوتشر</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              {...form.register("voucherNumber")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.voucherNumber?.message}
            </span>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium">نوع الرحلة</span>
            <select
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              {...form.register("tripType")}
            >
              {tripTypes.map((tripType) => (
                <option key={tripType} value={tripType}>
                  {tripLabels[tripType]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium">العميل</span>
            <select
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              {...form.register("customerId")}
            >
              <option value="">اختر العميل</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName} - {customer.phoneNumber}
                </option>
              ))}
            </select>
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.customerId?.message}
            </span>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium">الوجهة</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              {...form.register("destination")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.destination?.message}
            </span>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium">المركبة</span>
            <select
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              {...form.register("vehicleId")}
            >
              <option value="">اختر المركبة المتاحة</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.vehicleId?.message}
            </span>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium">السائق</span>
            <select
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              {...form.register("driverId")}
            >
              <option value="">اختر السائق المتاح</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName} - {driver.phoneNumber}
                </option>
              ))}
            </select>
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.driverId?.message}
            </span>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium">وقت البداية</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              type="datetime-local"
              {...form.register("startAtLocal")}
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium">وقت النهاية</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              type="datetime-local"
              {...form.register("endAtLocal")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.endAtLocal?.message}
            </span>
          </label>

          {showsOvernightFields ? (
            <div className="grid gap-4 rounded-md border border-sea/20 bg-sea/5 p-3 md:col-span-2 md:grid-cols-2">
              <div className="flex items-center gap-2 md:col-span-2">
                <BedDouble size={18} aria-hidden="true" />
                <p className="font-semibold">تفاصيل المبيت</p>
              </div>
              <label>
                <span className="mb-2 block text-sm font-medium">المدينة</span>
                <input
                  className="w-full rounded-md border border-olive/30 px-3 py-2"
                  disabled={isStaffCompletedEdit}
                  {...form.register("overnightCity")}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium">اسم السكن</span>
                <input
                  className="w-full rounded-md border border-olive/30 px-3 py-2"
                  disabled={isStaffCompletedEdit}
                  {...form.register("accommodationName")}
                />
                <span className="mt-1 block min-h-5 text-sm text-red-700">
                  {form.formState.errors.accommodationName?.message}
                </span>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium">تاريخ الدخول</span>
                <input
                  className="w-full rounded-md border border-olive/30 px-3 py-2"
                  disabled={isStaffCompletedEdit}
                  type="date"
                  {...form.register("checkInDate")}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium">تاريخ الخروج</span>
                <input
                  className="w-full rounded-md border border-olive/30 px-3 py-2"
                  disabled={isStaffCompletedEdit}
                  type="date"
                  {...form.register("checkOutDate")}
                />
                <span className="mt-1 block min-h-5 text-sm text-red-700">
                  {form.formState.errors.checkOutDate?.message}
                </span>
              </label>
              {canOverrideCost ? (
                <>
                  <label>
                    <span className="mb-2 block text-sm font-medium">سعر السائق لليلة</span>
                    <input
                      className="w-full rounded-md border border-olive/30 px-3 py-2"
                      min="0"
                      step="0.01"
                      type="number"
                      {...form.register("driverDailyRate")}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-medium">إجمالي تكلفة السائق</span>
                    <input
                      className="w-full rounded-md border border-olive/30 px-3 py-2"
                      min="0"
                      step="0.01"
                      type="number"
                      {...form.register("totalDriverCost")}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-medium">سبب التعديل اليدوي</span>
                    <input
                      className="w-full rounded-md border border-olive/30 px-3 py-2"
                      {...form.register("overrideReason")}
                    />
                  </label>
                </>
              ) : null}
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">ملاحظات المبيت</span>
                <textarea
                  className="w-full rounded-md border border-olive/30 px-3 py-2"
                  disabled={isStaffCompletedEdit}
                  rows={2}
                  {...form.register("overnightNotes")}
                />
              </label>
              <div className="rounded-md border border-olive/20 bg-white p-3 text-sm md:col-span-2">
                <p className="font-semibold">حساب المبيت</p>
                <p className="mt-1 text-olive">
                  {nightsCount} ليلة × {effectiveRate.toFixed(2)} {settings.currency} ={" "}
                  {estimatedCost.toFixed(2)} {settings.currency}
                </p>
              </div>
            </div>
          ) : null}

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium">ملاحظات</span>
            <textarea
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              disabled={isStaffCompletedEdit}
              rows={2}
              {...form.register("notes")}
            />
          </label>

          {summary ? (
            <div className="rounded-md border border-olive/20 bg-paper p-3 text-sm md:col-span-2">
              <p className="font-semibold">ملخص الحجز</p>
              <p className="mt-1 text-olive">
                {summary.customer} - {summary.destination} - {summary.tripType}
              </p>
              <p className="text-olive">
                {summary.vehicle} / {summary.driver} - من {summary.start} إلى {summary.end}
              </p>
              {blockingWindow ? (
                <p className="mt-1 text-olive">
                  فترة حجب الإتاحة: {dateFormatter.format(blockingWindow.start)} إلى{" "}
                  {dateFormatter.format(blockingWindow.end)}
                </p>
              ) : null}
            </div>
          ) : null}

          {isCheckingAvailability ? (
            <p className="rounded-md bg-paper p-3 text-sm text-olive md:col-span-2">
              جاري التحقق من الإتاحة...
            </p>
          ) : null}
          {availability?.hasConflict ? (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 md:col-span-2">
              <p className="font-semibold">يوجد تعارض مع حجز قائم.</p>
              {availability.conflicts.map((conflict) => (
                <p key={`${conflict.type}-${conflict.bookingId}`}>
                  {conflict.type === "VEHICLE" ? "المركبة" : "السائق"} غير متاح بسبب الحجز{" "}
                  {conflict.voucherNumber} من{" "}
                  {dateFormatter.format(new Date(conflict.availabilityStartAt))} إلى{" "}
                  {dateFormatter.format(new Date(conflict.availabilityEndAt))}
                </p>
              ))}
              {availability.alternativeVehicles.length > 0 ? (
                <div>
                  <p className="font-semibold">مركبات بديلة</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availability.alternativeVehicles.map((vehicle) => (
                      <button
                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-red-800"
                        key={vehicle.id}
                        type="button"
                        onClick={() =>
                          form.setValue("vehicleId", vehicle.id, { shouldValidate: true })
                        }
                      >
                        {vehicle.plateNumber} - {vehicle.passengerCapacity} ركاب
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {availability.alternativeDrivers.length > 0 ? (
                <div>
                  <p className="font-semibold">سائقون بدلاء</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availability.alternativeDrivers.map((driver) => (
                      <button
                        className="rounded-md border border-red-200 bg-white px-3 py-2 text-red-800"
                        key={driver.id}
                        type="button"
                        onClick={() =>
                          form.setValue("driverId", driver.id, { shouldValidate: true })
                        }
                      >
                        {driver.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              className="rounded-md bg-sea px-4 py-2 font-semibold text-white disabled:opacity-50"
              disabled={isStaffCompletedEdit || isCheckingAvailability || hasSelectedConflict}
            >
              {editing ? "حفظ التعديل" : "إضافة الحجز"}
            </button>
            {editing ? (
              <button
                type="button"
                className="rounded-md border border-olive/30 px-4 py-2"
                onClick={() => {
                  setEditing(null);
                  form.reset({ tripType: "CITY", destination: "" });
                }}
              >
                إلغاء
              </button>
            ) : null}
          </div>
        </form>

        <div className="space-y-4">
          <form
            className="grid gap-3 rounded-lg border border-olive/20 bg-white p-4"
            onSubmit={quickForm.handleSubmit(quickCreateCustomer)}
          >
            <h2 className="font-bold">إنشاء عميل سريع</h2>
            {duplicateWarning ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                {duplicateWarning}
              </p>
            ) : null}
            <input
              className="rounded-md border border-olive/30 px-3 py-2"
              placeholder="اسم العميل"
              {...quickForm.register("fullName")}
            />
            <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
              <input
                className="rounded-md border border-olive/30 px-3 py-2"
                placeholder="+966"
                {...quickForm.register("phoneCountryCode")}
              />
              <input
                className="rounded-md border border-olive/30 px-3 py-2"
                placeholder="رقم الهاتف"
                {...quickForm.register("phoneNumber")}
              />
            </div>
            <button className="rounded-md border border-olive/30 px-4 py-2 font-semibold">
              إضافة واختيار العميل
            </button>
          </form>

          {selected ? (
            <div className="rounded-lg border border-olive/20 bg-white p-4">
              <h2 className="font-bold">تفاصيل الحجز</h2>
              <div className="mt-3 space-y-2 text-sm text-olive">
                <p>الفاوتشر: {selected.voucherNumber}</p>
                <p>العميل: {selected.customer.fullName}</p>
                <p>المركبة: {selected.vehicle.plateNumber}</p>
                <p>السائق: {selected.driver.fullName}</p>
                <p>
                  الفترة: {dateFormatter.format(new Date(selected.startAt))} -{" "}
                  {dateFormatter.format(new Date(selected.endAt))}
                </p>
                <p>
                  حجب الإتاحة: {dateFormatter.format(new Date(selected.availabilityStartAt))} -{" "}
                  {dateFormatter.format(new Date(selected.availabilityEndAt))}
                </p>
                {selected.overnightStay ? (
                  <div className="rounded-md bg-sea/5 p-3 text-ink">
                    <p className="font-semibold">بيانات المبيت</p>
                    <p>السكن: {selected.overnightStay.accommodationName}</p>
                    <p>المدينة: {selected.overnightStay.city}</p>
                    <p>
                      التواريخ: {dayFormatter.format(new Date(selected.overnightStay.checkInDate))}{" "}
                      - {dayFormatter.format(new Date(selected.overnightStay.checkOutDate))}
                    </p>
                    <p>
                      التكلفة: {selected.overnightStay.nightsCount} ليلة ×{" "}
                      {selected.overnightStay.driverDailyRate} ={" "}
                      {selected.overnightStay.totalDriverCost} {settings.currency}
                    </p>
                  </div>
                ) : null}
                <p>الملاحظات: {selected.notes || "لا توجد ملاحظات."}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-olive/20 bg-white">
        {isLoading ? <p className="p-4 text-olive">جاري التحميل...</p> : null}
        {!isLoading && bookings.length === 0 ? (
          <p className="p-4 text-olive">لا توجد حجوزات مطابقة.</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right text-sm">
            <thead className="bg-olive/10">
              <tr>
                <th className="p-3">الفاوتشر</th>
                <th className="p-3">العميل</th>
                <th className="p-3">الفترة</th>
                <th className="p-3">المركبة</th>
                <th className="p-3">السائق</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr className="border-t border-olive/10" key={booking.id}>
                  <td className="p-3 font-semibold">
                    <button
                      className="text-right"
                      type="button"
                      onClick={() => setSelected(booking)}
                    >
                      {booking.voucherNumber}
                    </button>
                    {booking.overnightStay || booking.tripType === "OVERNIGHT" ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-sea/10 px-2 py-1 text-xs text-sea">
                        <BedDouble size={13} aria-hidden="true" />
                        مبيت
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">{booking.customer.fullName}</td>
                  <td className="p-3">
                    {dateFormatter.format(new Date(booking.startAt))}
                    <br />
                    {dateFormatter.format(new Date(booking.endAt))}
                  </td>
                  <td className="p-3">{booking.vehicle.plateNumber}</td>
                  <td className="p-3">{booking.driver.fullName}</td>
                  <td className="p-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <button
                      className="rounded-md border border-olive/30 px-3 py-2"
                      onClick={() => setSelected(booking)}
                    >
                      تفاصيل
                    </button>
                    <button
                      className="rounded-md border border-olive/30 p-2"
                      onClick={() => edit(booking)}
                    >
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <select
                      className="rounded-md border border-olive/30 px-2"
                      value={booking.status}
                      onChange={(event) =>
                        void changeStatus(booking, event.target.value as BookingStatus)
                      }
                    >
                      {bookingStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-md border border-red-200 p-2 text-red-700 disabled:opacity-50"
                      disabled={booking.status === "CANCELLED"}
                      onClick={() => void cancel(booking)}
                    >
                      <Ban size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md border border-olive/30 px-3 py-2 disabled:opacity-50"
          disabled={query.page <= 1}
          onClick={() => setQuery({ ...query, page: query.page - 1 })}
        >
          السابق
        </button>
        <span className="text-sm text-olive">
          صفحة {query.page} من {totalPages}
        </span>
        <button
          className="rounded-md border border-olive/30 px-3 py-2 disabled:opacity-50"
          disabled={query.page >= totalPages}
          onClick={() => setQuery({ ...query, page: query.page + 1 })}
        >
          التالي
        </button>
      </div>
    </section>
  );
}

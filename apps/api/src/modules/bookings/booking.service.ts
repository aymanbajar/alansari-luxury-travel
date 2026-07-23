import { BookingStatus, Prisma, type UserRole } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  assertNoAvailabilityConflicts,
  createAvailabilityService,
  isDatabaseOverlapConstraintError,
  resolveAvailabilityWindow,
  toDateRangeRequest
} from "../availability/availability.service.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { getOvernightSettings } from "../settings/settings.service.js";
import {
  assertBookingEditableByRole,
  assertBookingStatusTransition
} from "./booking-status-transition.service.js";
import type {
  CancelBookingInput,
  CreateBookingInput,
  ListBookingsInput,
  UpdateBookingInput,
  UpdateBookingStatusInput
} from "./booking.schemas.js";
import { toSafeBooking } from "./booking.presenter.js";

const bookingInclude = {
  customer: { select: { id: true, fullName: true, phoneCountryCode: true, phoneNumber: true } },
  vehicle: { select: { id: true, plateNumber: true, make: true, model: true, status: true } },
  driver: { select: { id: true, fullName: true, phoneNumber: true, status: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  updatedBy: { select: { id: true, fullName: true, email: true } },
  overnightStays: { orderBy: { createdAt: "desc" } }
} satisfies Prisma.BookingInclude;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function assertDateRange(startAt: Date, endAt: Date): void {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new AppError(
      400,
      "INVALID_DATE_RANGE",
      "Booking end time must be later than start time."
    );
  }
}

function handleBookingError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError(409, "CONFLICT", "Voucher number already exists.");
  }

  if (isDatabaseOverlapConstraintError(error)) {
    throw new AppError(409, "BOOKING_CONFLICT", "Booking overlaps an existing booking.");
  }

  throw error;
}

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

type BookableResources = {
  driver: { overnightDailyRate: Prisma.Decimal };
};

async function assertBookableResources(
  client: PrismaClientLike,
  customerId: string,
  vehicleId: string,
  driverId: string
): Promise<BookableResources> {
  const [customer, vehicle, driver] = await Promise.all([
    client.customer.findFirst({ where: { id: customerId, deletedAt: null } }),
    client.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } }),
    client.driver.findFirst({ where: { id: driverId, deletedAt: null } })
  ]);

  if (!customer) {
    throw new AppError(400, "CUSTOMER_NOT_ACTIVE", "Customer must be active.");
  }

  if (!vehicle || ["INACTIVE", "MAINTENANCE", "OUT_OF_SERVICE"].includes(vehicle.status)) {
    throw new AppError(
      400,
      "VEHICLE_NOT_ASSIGNABLE",
      "Vehicle is not available for future booking assignment."
    );
  }

  if (!driver || driver.status === "INACTIVE") {
    throw new AppError(400, "DRIVER_NOT_ASSIGNABLE", "Driver must be active.");
  }

  return { driver };
}

function dateOnlyToUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function calculateNightsCount(checkInDate: string, checkOutDate: string): number {
  const checkIn = dateOnlyToUtc(checkInDate);
  const checkOut = dateOnlyToUtc(checkOutDate);
  const nightsCount = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  if (nightsCount <= 0) {
    throw new AppError(
      400,
      "INVALID_OVERNIGHT_DATES",
      "Check-out date must be after check-in date."
    );
  }
  return nightsCount;
}

function toDecimal(value: number | string | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function toMoney(value: number | string | Prisma.Decimal): string {
  return toDecimal(value).toFixed(2);
}

async function writeOvernightStay(
  tx: Prisma.TransactionClient,
  bookingId: string,
  input: CreateBookingInput | UpdateBookingInput,
  resources: BookableResources,
  actor: { id: string; role: UserRole },
  ipAddress?: string
): Promise<void> {
  if (input.tripType === "CITY") {
    if (input.overnightStay) {
      throw new AppError(
        400,
        "CITY_OVERNIGHT_NOT_ALLOWED",
        "City bookings must not include overnight stay data."
      );
    }
    await tx.overnightStay.deleteMany({ where: { bookingId } });
    return;
  }

  if (!input.overnightStay) {
    if (input.tripType === "OVERNIGHT") {
      throw new AppError(
        400,
        "OVERNIGHT_DETAILS_REQUIRED",
        "Overnight booking details are required."
      );
    }
    await tx.overnightStay.deleteMany({ where: { bookingId } });
    return;
  }

  if (
    !input.overnightStay.accommodationName ||
    !input.overnightStay.checkInDate ||
    !input.overnightStay.checkOutDate
  ) {
    throw new AppError(
      400,
      "OVERNIGHT_DETAILS_REQUIRED",
      "Accommodation and overnight dates are required."
    );
  }

  const nightsCount = calculateNightsCount(
    input.overnightStay.checkInDate,
    input.overnightStay.checkOutDate
  );
  const settings = await getOvernightSettings(tx);
  const driverConfiguredRate = toDecimal(resources.driver.overnightDailyRate.toString());
  const defaultRate = driverConfiguredRate.gt(0)
    ? driverConfiguredRate
    : new Prisma.Decimal(settings.defaultDriverDailyRate);
  const wantsOverride =
    input.overnightStay.driverDailyRate !== undefined ||
    input.overnightStay.totalDriverCost !== undefined;

  if (wantsOverride && actor.role !== "ADMIN") {
    throw new AppError(
      403,
      "OVERNIGHT_OVERRIDE_FORBIDDEN",
      "Only Admin users can override overnight costs."
    );
  }

  if (wantsOverride && !input.overnightStay.overrideReason) {
    throw new AppError(400, "OVERNIGHT_OVERRIDE_REASON_REQUIRED", "Override reason is required.");
  }

  const driverDailyRate =
    wantsOverride && input.overnightStay.driverDailyRate !== undefined
      ? new Prisma.Decimal(input.overnightStay.driverDailyRate)
      : defaultRate;
  const calculatedTotal = driverDailyRate.mul(nightsCount);
  const totalDriverCost =
    wantsOverride && input.overnightStay.totalDriverCost !== undefined
      ? new Prisma.Decimal(input.overnightStay.totalDriverCost)
      : calculatedTotal;

  await tx.overnightStay.deleteMany({ where: { bookingId } });
  const overnightStay = await tx.overnightStay.create({
    data: {
      bookingId,
      city: input.overnightStay.city || input.destination || "External trip",
      accommodationName: input.overnightStay.accommodationName,
      checkInDate: dateOnlyToUtc(input.overnightStay.checkInDate),
      checkOutDate: dateOnlyToUtc(input.overnightStay.checkOutDate),
      nightsCount,
      driverDailyRate: toMoney(driverDailyRate),
      totalDriverCost: toMoney(totalDriverCost),
      notes: input.overnightStay.notes
    }
  });

  if (wantsOverride) {
    await recordAuditLog(
      {
        userId: actor.id,
        action: "OVERNIGHT_COST_OVERRIDDEN",
        entityType: "OvernightStay",
        entityId: overnightStay.id,
        newValues: {
          driverDailyRate: toMoney(driverDailyRate),
          totalDriverCost: toMoney(totalDriverCost),
          calculatedTotal: toMoney(calculatedTotal),
          reason: input.overnightStay.overrideReason
        },
        ipAddress
      },
      tx
    );
  }
}

export async function listBookings(input: ListBookingsInput) {
  const where: Prisma.BookingWhereInput = {
    deletedAt: null,
    voucherNumber: input.voucherNumber
      ? { contains: input.voucherNumber, mode: "insensitive" }
      : undefined,
    status: input.status,
    customerId: input.customerId,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    startAt:
      input.startFrom || input.startTo
        ? {
            gte: input.startFrom ? toDate(input.startFrom) : undefined,
            lte: input.startTo ? toDate(input.startTo) : undefined
          }
        : undefined
  };
  const skip = (input.page - 1) * input.pageSize;
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      skip,
      take: input.pageSize,
      orderBy: { [input.sortBy]: input.sortDirection }
    }),
    prisma.booking.count({ where })
  ]);

  return {
    items: items.map(toSafeBooking),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.ceil(total / input.pageSize)
    }
  };
}

export async function createBooking(
  input: CreateBookingInput,
  actor: { id: string; role: UserRole },
  ipAddress?: string
) {
  const startAt = toDate(input.startAt);
  const endAt = toDate(input.endAt);
  assertDateRange(startAt, endAt);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const resources = await assertBookableResources(
          tx,
          input.customerId,
          input.vehicleId,
          input.driverId
        );
        const availabilityWindow = await resolveAvailabilityWindow(
          tx,
          toDateRangeRequest({
            vehicleId: input.vehicleId,
            driverId: input.driverId,
            startAt,
            endAt,
            tripType: input.tripType
          })
        );
        assertNoAvailabilityConflicts(
          await createAvailabilityService(tx).checkBookingConflicts(availabilityWindow)
        );
        const booking = await tx.booking.create({
          data: {
            voucherNumber: input.voucherNumber,
            customerId: input.customerId,
            vehicleId: input.vehicleId,
            driverId: input.driverId,
            startAt,
            endAt,
            availabilityStartAt: availabilityWindow.availabilityStartAt ?? startAt,
            availabilityEndAt: availabilityWindow.availabilityEndAt ?? endAt,
            tripType: input.tripType,
            destination: input.destination,
            status: input.status,
            notes: input.notes,
            createdById: actor.id
          },
          include: bookingInclude
        });

        await writeOvernightStay(tx, booking.id, input, resources, actor, ipAddress);
        const bookingWithOvernight = await tx.booking.findFirstOrThrow({
          where: { id: booking.id },
          include: bookingInclude
        });

        await recordAuditLog(
          {
            userId: actor.id,
            action: "BOOKING_CREATED",
            entityType: "Booking",
            entityId: booking.id,
            newValues: { ...toSafeBooking(bookingWithOvernight) },
            ipAddress
          },
          tx
        );

        return toSafeBooking(bookingWithOvernight);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    handleBookingError(error);
  }
}

export async function getBooking(id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    include: bookingInclude
  });

  if (!booking) {
    throw new AppError(404, "NOT_FOUND", "Booking not found.");
  }

  return toSafeBooking(booking);
}

export async function updateBooking(
  id: string,
  input: UpdateBookingInput,
  actor: { id: string; role: UserRole },
  ipAddress?: string
) {
  const existing = await getBooking(id);
  assertBookingEditableByRole(existing.status, actor.role);
  const startAt = input.startAt ? toDate(input.startAt) : existing.startAt;
  const endAt = input.endAt ? toDate(input.endAt) : existing.endAt;
  assertDateRange(startAt, endAt);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const resources = await assertBookableResources(
          tx,
          input.customerId ?? existing.customerId,
          input.vehicleId ?? existing.vehicleId,
          input.driverId ?? existing.driverId
        );
        const effectiveTripType = input.tripType ?? existing.tripType;
        const availabilityWindow = await resolveAvailabilityWindow(
          tx,
          toDateRangeRequest({
            bookingId: id,
            vehicleId: input.vehicleId ?? existing.vehicleId,
            driverId: input.driverId ?? existing.driverId,
            startAt,
            endAt,
            tripType: effectiveTripType
          })
        );
        assertNoAvailabilityConflicts(
          await createAvailabilityService(tx).checkBookingConflicts(availabilityWindow)
        );
        const booking = await tx.booking.update({
          where: { id },
          data: {
            voucherNumber: input.voucherNumber,
            customerId: input.customerId,
            vehicleId: input.vehicleId,
            driverId: input.driverId,
            startAt,
            endAt,
            availabilityStartAt: availabilityWindow.availabilityStartAt ?? startAt,
            availabilityEndAt: availabilityWindow.availabilityEndAt ?? endAt,
            tripType: input.tripType,
            destination: input.destination,
            notes: input.notes,
            updatedById: actor.id
          },
          include: bookingInclude
        });

        await writeOvernightStay(
          tx,
          booking.id,
          {
            ...input,
            tripType: effectiveTripType,
            destination: input.destination ?? existing.destination
          },
          resources,
          actor,
          ipAddress
        );
        const bookingWithOvernight = await tx.booking.findFirstOrThrow({
          where: { id },
          include: bookingInclude
        });

        await recordAuditLog(
          {
            userId: actor.id,
            action: "BOOKING_UPDATED",
            entityType: "Booking",
            entityId: id,
            oldValues: { ...existing },
            newValues: { ...toSafeBooking(bookingWithOvernight) },
            ipAddress
          },
          tx
        );

        return toSafeBooking(bookingWithOvernight);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    handleBookingError(error);
  }
}

export async function updateBookingStatus(
  id: string,
  input: UpdateBookingStatusInput,
  actor: { id: string; role: UserRole },
  ipAddress?: string
) {
  const existing = await getBooking(id);
  assertBookingStatusTransition(existing.status, input.status, actor.role);

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id },
      data: {
        status: input.status,
        cancelledAt: input.status === BookingStatus.CANCELLED ? new Date() : existing.cancelledAt,
        updatedById: actor.id
      },
      include: bookingInclude
    });

    await recordAuditLog(
      {
        userId: actor.id,
        action: "BOOKING_STATUS_CHANGED",
        entityType: "Booking",
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: booking.status },
        ipAddress
      },
      tx
    );

    return toSafeBooking(booking);
  });
}

export async function cancelBooking(
  id: string,
  input: CancelBookingInput,
  actor: { id: string; role: UserRole },
  ipAddress?: string
) {
  const existing = await getBooking(id);
  assertBookingStatusTransition(existing.status, "CANCELLED", actor.role);

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        notes: input.reason
          ? `${existing.notes ?? ""}\nCancellation reason: ${input.reason}`.trim()
          : existing.notes,
        updatedById: actor.id
      },
      include: bookingInclude
    });

    await recordAuditLog(
      {
        userId: actor.id,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status: booking.status, reason: input.reason },
        ipAddress
      },
      tx
    );

    return toSafeBooking(booking);
  });
}

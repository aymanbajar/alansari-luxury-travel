import { Prisma, type TripType } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { getOvernightSettings } from "../settings/settings.service.js";
import type {
  AlternativeDriver,
  AlternativeVehicle,
  AvailabilityService,
  BookingConflict,
  ConflictCheckRequest,
  ConflictCheckResponse
} from "./availability.types.js";

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

const blockingStatusWhere = { not: "CANCELLED" } as const;

export function hasHalfOpenOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date
): boolean {
  return newStart < existingEnd && newEnd > existingStart;
}

function assertDateRange(startAt: Date, endAt: Date): void {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new AppError(
      400,
      "INVALID_DATE_RANGE",
      "Availability end time must be later than start time."
    );
  }
}

export async function resolveAvailabilityWindow(
  client: PrismaClientLike,
  request: ConflictCheckRequest
): Promise<ConflictCheckRequest> {
  if (request.availabilityStartAt && request.availabilityEndAt) {
    return request;
  }

  if (request.tripType !== "OVERNIGHT") {
    return {
      ...request,
      availabilityStartAt: request.startAt,
      availabilityEndAt: request.endAt
    };
  }

  const settings = await getOvernightSettings(client);
  return {
    ...request,
    availabilityStartAt: new Date(
      request.startAt.getTime() - settings.preTripBufferHours * 60 * 60 * 1000
    ),
    availabilityEndAt: new Date(
      request.endAt.getTime() + settings.postTripBufferHours * 60 * 60 * 1000
    )
  };
}

function conflictWhere(request: ConflictCheckRequest): Prisma.BookingWhereInput {
  const availabilityStartAt = request.availabilityStartAt ?? request.startAt;
  const availabilityEndAt = request.availabilityEndAt ?? request.endAt;

  return {
    id: request.bookingId ? { not: request.bookingId } : undefined,
    deletedAt: null,
    status: blockingStatusWhere,
    availabilityStartAt: { lt: availabilityEndAt },
    availabilityEndAt: { gt: availabilityStartAt }
  };
}

function vehicleUnavailableWhere(request: ConflictCheckRequest): Prisma.BookingWhereInput {
  return {
    ...conflictWhere(request),
    vehicleId: request.vehicleId
  };
}

function driverUnavailableWhere(request: ConflictCheckRequest): Prisma.BookingWhereInput {
  return {
    ...conflictWhere(request),
    driverId: request.driverId
  };
}

function toConflict(type: "VEHICLE" | "DRIVER", booking: ConflictBooking): BookingConflict {
  return {
    type,
    bookingId: booking.id,
    voucherNumber: booking.voucherNumber,
    startAt: booking.startAt,
    endAt: booking.endAt,
    availabilityStartAt: booking.availabilityStartAt,
    availabilityEndAt: booking.availabilityEndAt
  };
}

const conflictSelect = {
  id: true,
  voucherNumber: true,
  startAt: true,
  endAt: true,
  availabilityStartAt: true,
  availabilityEndAt: true
} satisfies Prisma.BookingSelect;

type ConflictBooking = Prisma.BookingGetPayload<{ select: typeof conflictSelect }>;

async function findVehicleConflicts(
  client: PrismaClientLike,
  request: ConflictCheckRequest
): Promise<BookingConflict[]> {
  if (!request.vehicleId) {
    return [];
  }

  const bookings = await client.booking.findMany({
    where: vehicleUnavailableWhere(request),
    select: conflictSelect,
    orderBy: { startAt: "asc" },
    take: 10
  });

  return bookings.map((booking) => toConflict("VEHICLE", booking));
}

async function findDriverConflicts(
  client: PrismaClientLike,
  request: ConflictCheckRequest
): Promise<BookingConflict[]> {
  if (!request.driverId) {
    return [];
  }

  const bookings = await client.booking.findMany({
    where: driverUnavailableWhere(request),
    select: conflictSelect,
    orderBy: { startAt: "asc" },
    take: 10
  });

  return bookings.map((booking) => toConflict("DRIVER", booking));
}

async function findAlternativeVehicles(
  client: PrismaClientLike,
  request: ConflictCheckRequest
): Promise<AlternativeVehicle[]> {
  return client.vehicle.findMany({
    where: {
      deletedAt: null,
      status: "AVAILABLE",
      passengerCapacity: request.passengerCapacity ? { gte: request.passengerCapacity } : undefined,
      bookings: {
        none: {
          ...conflictWhere(request),
          vehicleId: undefined
        }
      }
    },
    select: {
      id: true,
      plateNumber: true,
      make: true,
      model: true,
      passengerCapacity: true
    },
    orderBy: [{ passengerCapacity: "asc" }, { plateNumber: "asc" }],
    take: 10
  });
}

async function findAlternativeDrivers(
  client: PrismaClientLike,
  request: ConflictCheckRequest
): Promise<AlternativeDriver[]> {
  return client.driver.findMany({
    where: {
      deletedAt: null,
      status: "AVAILABLE",
      bookings: {
        none: {
          ...conflictWhere(request),
          driverId: undefined
        }
      }
    },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true
    },
    orderBy: { fullName: "asc" },
    take: 10
  });
}

export class PrismaAvailabilityService implements AvailabilityService {
  constructor(private readonly client: PrismaClientLike = prisma) {}

  async checkBookingConflicts(request: ConflictCheckRequest): Promise<ConflictCheckResponse> {
    const effectiveRequest = await resolveAvailabilityWindow(this.client, request);
    assertDateRange(effectiveRequest.startAt, effectiveRequest.endAt);
    assertDateRange(
      effectiveRequest.availabilityStartAt ?? effectiveRequest.startAt,
      effectiveRequest.availabilityEndAt ?? effectiveRequest.endAt
    );

    const [vehicleConflicts, driverConflicts, alternativeVehicles, alternativeDrivers] =
      await Promise.all([
        findVehicleConflicts(this.client, effectiveRequest),
        findDriverConflicts(this.client, effectiveRequest),
        findAlternativeVehicles(this.client, effectiveRequest),
        findAlternativeDrivers(this.client, effectiveRequest)
      ]);
    const conflicts = [...vehicleConflicts, ...driverConflicts];

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      alternativeVehicles,
      alternativeDrivers
    };
  }
}

export function createAvailabilityService(client: PrismaClientLike): AvailabilityService {
  return new PrismaAvailabilityService(client);
}

export function assertNoAvailabilityConflicts(result: ConflictCheckResponse): void {
  if (result.hasConflict) {
    throw new AppError(409, "BOOKING_CONFLICT", "Booking overlaps an existing booking.", result);
  }
}

export function isDatabaseOverlapConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    error.code === "P2004" &&
    (message.includes("booking_vehicle_no_overlap") ||
      message.includes("booking_driver_no_overlap") ||
      message.includes("exclusion"))
  );
}

export function toDateRangeRequest(input: {
  startAt: string | Date;
  endAt: string | Date;
  availabilityStartAt?: string | Date;
  availabilityEndAt?: string | Date;
  bookingId?: string;
  vehicleId?: string;
  driverId?: string;
  passengerCapacity?: number;
  tripType?: TripType;
}): ConflictCheckRequest {
  return {
    ...input,
    startAt: input.startAt instanceof Date ? input.startAt : new Date(input.startAt),
    endAt: input.endAt instanceof Date ? input.endAt : new Date(input.endAt),
    availabilityStartAt: input.availabilityStartAt
      ? input.availabilityStartAt instanceof Date
        ? input.availabilityStartAt
        : new Date(input.availabilityStartAt)
      : undefined,
    availabilityEndAt: input.availabilityEndAt
      ? input.availabilityEndAt instanceof Date
        ? input.availabilityEndAt
        : new Date(input.availabilityEndAt)
      : undefined
  };
}

export const availabilityService = new PrismaAvailabilityService();

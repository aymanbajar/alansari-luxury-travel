import { BookingStatus, Prisma, type UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { DashboardSummaryInput, DashboardTimelineInput } from "./dashboard.schemas.js";

const attentionStatuses: BookingStatus[] = ["DRAFT", "CONFIRMED"];

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 86_400_000);
}

function parseDate(value: string | undefined, fallback: Date): Date {
  return value ? new Date(value) : fallback;
}

function overlapsWindow(startFrom: Date, endTo: Date): Prisma.BookingWhereInput {
  return {
    availabilityStartAt: { lt: endTo },
    availabilityEndAt: { gt: startFrom }
  };
}

const dashboardBookingInclude = {
  customer: { select: { id: true, fullName: true, phoneCountryCode: true, phoneNumber: true } },
  vehicle: { select: { id: true, plateNumber: true, make: true, model: true, status: true } },
  driver: { select: { id: true, fullName: true, phoneNumber: true, status: true } },
  overnightStays: { orderBy: { createdAt: "desc" as const }, take: 1 }
} satisfies Prisma.BookingInclude;

function mapBooking(
  booking: Prisma.BookingGetPayload<{ include: typeof dashboardBookingInclude }>
) {
  const overnightStay = booking.overnightStays[0] ?? null;
  return {
    id: booking.id,
    voucherNumber: booking.voucherNumber,
    customerId: booking.customerId,
    vehicleId: booking.vehicleId,
    driverId: booking.driverId,
    startAt: booking.startAt,
    endAt: booking.endAt,
    availabilityStartAt: booking.availabilityStartAt,
    availabilityEndAt: booking.availabilityEndAt,
    tripType: booking.tripType,
    destination: booking.destination,
    status: booking.status,
    notes: booking.notes,
    customer: booking.customer,
    vehicle: booking.vehicle,
    driver: booking.driver,
    overnightStay: overnightStay
      ? {
          id: overnightStay.id,
          city: overnightStay.city,
          accommodationName: overnightStay.accommodationName,
          checkInDate: overnightStay.checkInDate,
          checkOutDate: overnightStay.checkOutDate,
          nightsCount: overnightStay.nightsCount,
          driverDailyRate: overnightStay.driverDailyRate.toFixed(2),
          totalDriverCost: overnightStay.totalDriverCost.toFixed(2),
          notes: overnightStay.notes
        }
      : null
  };
}

export async function getDashboardSummary(input: DashboardSummaryInput, role: UserRole) {
  const todayStart = startOfToday();
  const todayEnd = addDays(todayStart, 1);
  const rangeStart = parseDate(input.startFrom, todayStart);
  const rangeEnd = parseDate(input.endTo, addDays(todayStart, 7));
  const activeBookingWhere: Prisma.BookingWhereInput = {
    deletedAt: null,
    status: { not: "CANCELLED" }
  };
  const todayBookingWhere: Prisma.BookingWhereInput = {
    ...activeBookingWhere,
    ...overlapsWindow(todayStart, todayEnd)
  };
  const rangeBookingWhere: Prisma.BookingWhereInput = {
    ...activeBookingWhere,
    ...overlapsWindow(rangeStart, rangeEnd)
  };

  const [
    todayTotalBookings,
    todayConfirmedBookings,
    vehiclesAvailable,
    vehiclesBooked,
    vehiclesUnderMaintenance,
    activeDrivers,
    upcomingBookingsCount,
    overnightBookingsCount,
    attentionBookingsCount,
    todaysDispatch,
    upcomingBookings,
    recentChanges,
    overnightAlerts,
    vehicleStatusGroups
  ] = await Promise.all([
    prisma.booking.count({ where: todayBookingWhere }),
    prisma.booking.count({ where: { ...todayBookingWhere, status: "CONFIRMED" } }),
    prisma.vehicle.count({ where: { deletedAt: null, status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { deletedAt: null, status: "BOOKED" } }),
    prisma.vehicle.count({ where: { deletedAt: null, status: "MAINTENANCE" } }),
    prisma.driver.count({ where: { deletedAt: null, status: { not: "INACTIVE" } } }),
    prisma.booking.count({ where: { ...rangeBookingWhere, startAt: { gte: new Date() } } }),
    prisma.booking.count({ where: { ...rangeBookingWhere, tripType: "OVERNIGHT" } }),
    prisma.booking.count({
      where: {
        deletedAt: null,
        status: { in: attentionStatuses },
        startAt: { gte: todayStart, lt: addDays(todayStart, 2) }
      }
    }),
    prisma.booking.findMany({
      where: todayBookingWhere,
      include: dashboardBookingInclude,
      orderBy: { startAt: "asc" },
      take: 12
    }),
    prisma.booking.findMany({
      where: { ...rangeBookingWhere, startAt: { gte: new Date() } },
      include: dashboardBookingInclude,
      orderBy: { startAt: "asc" },
      take: 12
    }),
    prisma.auditLog.findMany({
      where: {
        entityType: "Booking",
        createdAt: { gte: rangeStart, lt: rangeEnd }
      },
      include: { user: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.booking.findMany({
      where: {
        ...rangeBookingWhere,
        tripType: "OVERNIGHT",
        startAt: { gte: new Date() }
      },
      include: dashboardBookingInclude,
      orderBy: { startAt: "asc" },
      take: 8
    }),
    prisma.vehicle.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true }
    })
  ]);

  return {
    range: { startFrom: rangeStart, endTo: rangeEnd },
    cards: {
      todayTotalBookings,
      todayConfirmedBookings,
      vehiclesAvailable,
      vehiclesBooked,
      vehiclesUnderMaintenance,
      activeDrivers,
      upcomingBookings: upcomingBookingsCount,
      overnightBookings: overnightBookingsCount,
      bookingsRequiringAttention: attentionBookingsCount
    },
    todaysDispatch: todaysDispatch.map(mapBooking),
    upcomingBookings: upcomingBookings.map(mapBooking),
    recentChanges: recentChanges.map((change) => ({
      id: change.id,
      action: change.action,
      entityId: change.entityId,
      createdAt: change.createdAt,
      user: change.user ? { id: change.user.id, fullName: change.user.fullName } : null
    })),
    overnightAlerts: overnightAlerts.map(mapBooking),
    vehicleStatusOverview: vehicleStatusGroups.map((group) => ({
      status: group.status,
      count: group._count._all
    })),
    restricted: {
      financialStatisticsHidden: role === "STAFF"
    }
  };
}

export async function getVehicleTimeline(input: DashboardTimelineInput) {
  const startFrom = new Date(input.startFrom);
  const endTo = new Date(input.endTo);
  const bookingWhere: Prisma.BookingWhereInput = {
    deletedAt: null,
    ...overlapsWindow(startFrom, endTo),
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    customerId: input.customerId,
    status: input.bookingStatus,
    tripType: input.overnightOnly ? "OVERNIGHT" : input.tripType,
    voucherNumber: input.voucherNumber
      ? { contains: input.voucherNumber, mode: "insensitive" }
      : undefined
  };
  const vehicleWhere: Prisma.VehicleWhereInput = {
    deletedAt: null,
    id: input.vehicleId,
    status: input.vehicleStatus
  };

  const [vehicles, bookings] = await Promise.all([
    prisma.vehicle.findMany({
      where: vehicleWhere,
      select: {
        id: true,
        plateNumber: true,
        make: true,
        model: true,
        status: true,
        passengerCapacity: true
      },
      orderBy: { plateNumber: "asc" },
      take: 60
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      include: dashboardBookingInclude,
      orderBy: [{ vehicle: { plateNumber: "asc" } }, { availabilityStartAt: "asc" }],
      take: 500
    })
  ]);

  const bookingsByVehicle = new Map<string, ReturnType<typeof mapBooking>[]>();
  bookings.forEach((booking) => {
    const mapped = mapBooking(booking);
    bookingsByVehicle.set(mapped.vehicleId, [
      ...(bookingsByVehicle.get(mapped.vehicleId) ?? []),
      mapped
    ]);
  });

  return {
    range: { startFrom, endTo },
    view: input.view,
    rows: vehicles.map((vehicle) => ({
      vehicle,
      bookings: bookingsByVehicle.get(vehicle.id) ?? []
    }))
  };
}

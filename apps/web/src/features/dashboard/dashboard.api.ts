import type { BookingStatus, TripType, VehicleStatus } from "@alansari/shared";
import { apiRequest } from "../../lib/api";

export interface DashboardBooking {
  id: string;
  voucherNumber: string;
  customerId: string;
  vehicleId: string;
  driverId: string;
  startAt: string;
  endAt: string;
  availabilityStartAt: string;
  availabilityEndAt: string;
  tripType: TripType;
  destination: string;
  status: BookingStatus;
  notes: string | null;
  customer: { id: string; fullName: string; phoneCountryCode: string; phoneNumber: string };
  vehicle: { id: string; plateNumber: string; make: string; model: string; status: VehicleStatus };
  driver: { id: string; fullName: string; phoneNumber: string; status: string };
  overnightStay: {
    id: string;
    city: string;
    accommodationName: string;
    checkInDate: string;
    checkOutDate: string;
    nightsCount: number;
    driverDailyRate: string;
    totalDriverCost: string;
    notes: string | null;
  } | null;
}

export interface DashboardSummary {
  range: { startFrom: string; endTo: string };
  cards: {
    todayTotalBookings: number;
    todayConfirmedBookings: number;
    vehiclesAvailable: number;
    vehiclesBooked: number;
    vehiclesUnderMaintenance: number;
    activeDrivers: number;
    upcomingBookings: number;
    overnightBookings: number;
    bookingsRequiringAttention: number;
  };
  todaysDispatch: DashboardBooking[];
  upcomingBookings: DashboardBooking[];
  recentChanges: Array<{
    id: string;
    action: string;
    entityId: string;
    createdAt: string;
    user: { id: string; fullName: string } | null;
  }>;
  overnightAlerts: DashboardBooking[];
  vehicleStatusOverview: Array<{ status: VehicleStatus; count: number }>;
  restricted: { financialStatisticsHidden: boolean };
}

export interface TimelineVehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  status: VehicleStatus;
  passengerCapacity: number;
}

export interface TimelineRow {
  vehicle: TimelineVehicle;
  bookings: DashboardBooking[];
}

export interface VehicleTimeline {
  range: { startFrom: string; endTo: string };
  view: "day" | "week" | "month";
  rows: TimelineRow[];
}

export interface TimelineQuery {
  startFrom: string;
  endTo: string;
  view: "day" | "week" | "month";
  vehicleId?: string;
  vehicleStatus?: VehicleStatus | "";
  driverId?: string;
  customerId?: string;
  bookingStatus?: BookingStatus | "";
  tripType?: TripType | "";
  overnightOnly?: boolean;
  voucherNumber?: string;
}

function toQueryString<TQuery extends object>(query: TQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function getDashboardSummary(
  query: { startFrom?: string; endTo?: string } = {}
): Promise<{ dashboard: DashboardSummary }> {
  const queryString = toQueryString(query);
  return apiRequest(`/dashboard/summary${queryString ? `?${queryString}` : ""}`);
}

export function getVehicleTimeline(query: TimelineQuery): Promise<{ timeline: VehicleTimeline }> {
  return apiRequest(`/dashboard/timeline?${toQueryString(query)}`);
}

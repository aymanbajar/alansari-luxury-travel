import type { BookingStatus, TripType } from "@alansari/shared";
import type { Pagination } from "../fleet/fleet.types";
import { apiRequest } from "../../lib/api";

export interface Booking {
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
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  customer: { id: string; fullName: string; phoneCountryCode: string; phoneNumber: string };
  vehicle: { id: string; plateNumber: string; make: string; model: string; status: string };
  driver: { id: string; fullName: string; phoneNumber: string; status: string };
  createdBy: { id: string; fullName: string; email: string };
  updatedBy: { id: string; fullName: string; email: string } | null;
  overnightStay: OvernightStay | null;
}

export interface OvernightStay {
  id: string;
  bookingId: string;
  city: string;
  accommodationName: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  driverDailyRate: string;
  totalDriverCost: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingQuery {
  voucherNumber?: string;
  status?: BookingStatus | "";
  customerId?: string;
  vehicleId?: string;
  driverId?: string;
  startFrom?: string;
  startTo?: string;
  page: number;
  pageSize: number;
  sortBy: "startAt" | "createdAt" | "voucherNumber" | "status";
  sortDirection: "asc" | "desc";
}

export interface SaveBookingInput {
  voucherNumber: string;
  customerId: string;
  vehicleId: string;
  driverId: string;
  startAt: string;
  endAt: string;
  tripType: TripType;
  destination: string;
  notes?: string;
  overnightStay?: {
    city?: string;
    accommodationName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    driverDailyRate?: number;
    totalDriverCost?: number;
    overrideReason?: string;
    notes?: string;
  };
}

function toQueryString(query: BookingQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function listBookings(
  query: BookingQuery
): Promise<{ bookings: Booking[]; pagination: Pagination }> {
  return apiRequest(`/bookings?${toQueryString(query)}`);
}

export function getBooking(id: string): Promise<{ booking: Booking }> {
  return apiRequest(`/bookings/${id}`);
}

export function createBooking(input: SaveBookingInput): Promise<{ booking: Booking }> {
  return apiRequest("/bookings", { method: "POST", body: JSON.stringify(input) });
}

export function updateBooking(id: string, input: SaveBookingInput): Promise<{ booking: Booking }> {
  return apiRequest(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<{ booking: Booking }> {
  return apiRequest(`/bookings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function cancelBooking(id: string, reason?: string): Promise<{ booking: Booking }> {
  return apiRequest(`/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

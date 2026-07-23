import type { BookingStatus, TripType } from "@alansari/shared";
import { apiRequest } from "../../lib/api";

export interface AvailabilityRequest {
  startAt: string;
  endAt: string;
  bookingId?: string;
  vehicleId?: string;
  driverId?: string;
  passengerCapacity?: number;
  tripType?: TripType;
}

export interface AvailabilityConflict {
  type: "VEHICLE" | "DRIVER";
  bookingId: string;
  voucherNumber: string;
  startAt: string;
  endAt: string;
  availabilityStartAt: string;
  availabilityEndAt: string;
  status?: BookingStatus;
}

export interface AlternativeVehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  passengerCapacity: number;
}

export interface AlternativeDriver {
  id: string;
  fullName: string;
  phoneNumber: string;
}

export interface AvailabilityResult {
  hasConflict: boolean;
  availabilityStartAt: string;
  availabilityEndAt: string;
  conflicts: AvailabilityConflict[];
  alternativeVehicles: AlternativeVehicle[];
  alternativeDrivers: AlternativeDriver[];
}

export function checkAvailability(
  input: AvailabilityRequest
): Promise<{ availability: AvailabilityResult }> {
  return apiRequest("/availability/check", { method: "POST", body: JSON.stringify(input) });
}

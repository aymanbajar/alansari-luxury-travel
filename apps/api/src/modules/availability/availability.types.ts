import type { TripType } from "@prisma/client";

export type ConflictResourceType = "VEHICLE" | "DRIVER";

export interface ConflictCheckRequest {
  bookingId?: string;
  vehicleId?: string;
  driverId?: string;
  startAt: Date;
  endAt: Date;
  availabilityStartAt?: Date;
  availabilityEndAt?: Date;
  passengerCapacity?: number;
  tripType?: TripType;
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

export interface BookingConflict {
  type: ConflictResourceType;
  bookingId: string;
  voucherNumber: string;
  startAt: Date;
  endAt: Date;
  availabilityStartAt: Date;
  availabilityEndAt: Date;
}

export interface ConflictCheckResponse {
  hasConflict: boolean;
  conflicts: BookingConflict[];
  alternativeVehicles: AlternativeVehicle[];
  alternativeDrivers: AlternativeDriver[];
}

export interface AvailabilityService {
  checkBookingConflicts(request: ConflictCheckRequest): Promise<ConflictCheckResponse>;
}

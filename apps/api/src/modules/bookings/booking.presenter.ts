import type { Booking, BookingStatus, OvernightStay, TripType } from "@prisma/client";

type BookingWithRelations = Pick<
  Booking,
  | "id"
  | "voucherNumber"
  | "customerId"
  | "vehicleId"
  | "driverId"
  | "startAt"
  | "endAt"
  | "availabilityStartAt"
  | "availabilityEndAt"
  | "tripType"
  | "destination"
  | "status"
  | "notes"
  | "createdById"
  | "updatedById"
  | "createdAt"
  | "updatedAt"
  | "cancelledAt"
  | "deletedAt"
> & {
  customer: { id: string; fullName: string; phoneCountryCode: string; phoneNumber: string };
  vehicle: { id: string; plateNumber: string; make: string; model: string; status: string };
  driver: { id: string; fullName: string; phoneNumber: string; status: string };
  createdBy: { id: string; fullName: string; email: string };
  updatedBy: { id: string; fullName: string; email: string } | null;
  overnightStays: OvernightStay[];
};

export interface SafeBooking {
  id: string;
  voucherNumber: string;
  customerId: string;
  vehicleId: string;
  driverId: string;
  startAt: Date;
  endAt: Date;
  availabilityStartAt: Date;
  availabilityEndAt: Date;
  tripType: TripType;
  destination: string;
  status: BookingStatus;
  notes: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  deletedAt: Date | null;
  customer: BookingWithRelations["customer"];
  vehicle: BookingWithRelations["vehicle"];
  driver: BookingWithRelations["driver"];
  createdBy: BookingWithRelations["createdBy"];
  updatedBy: BookingWithRelations["updatedBy"];
  overnightStay: OvernightStay | null;
}

export function toSafeBooking(booking: BookingWithRelations): SafeBooking {
  const { overnightStays, ...bookingWithoutCollection } = booking;

  return {
    ...bookingWithoutCollection,
    overnightStay: overnightStays?.[0] ?? null
  };
}

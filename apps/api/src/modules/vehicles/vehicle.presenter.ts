import type { Vehicle, VehicleStatus } from "@prisma/client";

type VehicleFields = Pick<
  Vehicle,
  | "id"
  | "plateNumber"
  | "make"
  | "model"
  | "year"
  | "passengerCapacity"
  | "status"
  | "notes"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;

export interface SafeVehicle extends VehicleFields {
  availability: {
    selectableForFutureBookings: boolean;
    reason: string | null;
  };
}

export function getVehicleAvailability(status: VehicleStatus, deletedAt: Date | null) {
  if (deletedAt) {
    return { selectableForFutureBookings: false, reason: "SOFT_DELETED" };
  }

  if (status === "INACTIVE" || status === "OUT_OF_SERVICE") {
    return { selectableForFutureBookings: false, reason: status };
  }

  return { selectableForFutureBookings: true, reason: null };
}

export function toSafeVehicle(vehicle: VehicleFields): SafeVehicle {
  return {
    ...vehicle,
    availability: getVehicleAvailability(vehicle.status, vehicle.deletedAt)
  };
}

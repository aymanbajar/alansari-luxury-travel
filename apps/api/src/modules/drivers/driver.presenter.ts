import type { Driver, DriverStatus } from "@prisma/client";

type DriverFields = Pick<
  Driver,
  | "id"
  | "fullName"
  | "phoneNumber"
  | "status"
  | "overnightDailyRate"
  | "notes"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;

export interface SafeDriver extends Omit<DriverFields, "overnightDailyRate"> {
  overnightDailyRate: string;
  availability: {
    assignableForFutureBookings: boolean;
    reason: string | null;
  };
}

export function getDriverAvailability(status: DriverStatus, deletedAt: Date | null) {
  if (deletedAt) {
    return { assignableForFutureBookings: false, reason: "SOFT_DELETED" };
  }

  if (status === "INACTIVE") {
    return { assignableForFutureBookings: false, reason: status };
  }

  return { assignableForFutureBookings: true, reason: null };
}

export function toSafeDriver(driver: DriverFields): SafeDriver {
  return {
    ...driver,
    overnightDailyRate: driver.overnightDailyRate.toFixed(2),
    availability: getDriverAvailability(driver.status, driver.deletedAt)
  };
}

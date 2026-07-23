export const userRoles = ["ADMIN", "STAFF"] as const;
export type UserRole = (typeof userRoles)[number];

export const bookingStatuses = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const vehicleStatuses = [
  "AVAILABLE",
  "BOOKED",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
  "INACTIVE"
] as const;
export type VehicleStatus = (typeof vehicleStatuses)[number];

export const driverStatuses = ["AVAILABLE", "ASSIGNED", "ON_LEAVE", "INACTIVE"] as const;
export type DriverStatus = (typeof driverStatuses)[number];

export const tripTypes = ["CITY", "OUTSIDE_CITY", "OVERNIGHT"] as const;
export type TripType = (typeof tripTypes)[number];

export const expenseTypes = [
  "FUEL",
  "TOLL",
  "PARKING",
  "ACCOMMODATION",
  "MEAL",
  "MAINTENANCE",
  "OTHER"
] as const;
export type ExpenseType = (typeof expenseTypes)[number];

export const notificationTypes = ["SYSTEM", "BOOKING", "VEHICLE", "DRIVER", "REPORT"] as const;
export type NotificationType = (typeof notificationTypes)[number];

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export interface HealthResponse {
  status: "ok";
  service: "api";
  timestamp: string;
}

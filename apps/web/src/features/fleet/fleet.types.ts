export type VehicleStatus = "AVAILABLE" | "BOOKED" | "MAINTENANCE" | "OUT_OF_SERVICE" | "INACTIVE";
export type DriverStatus = "AVAILABLE" | "ASSIGNED" | "ON_LEAVE" | "INACTIVE";

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  passengerCapacity: number;
  status: VehicleStatus;
  notes: string | null;
  availability: {
    selectableForFutureBookings: boolean;
    reason: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  fullName: string;
  phoneNumber: string;
  status: DriverStatus;
  overnightDailyRate: string;
  notes: string | null;
  availability: {
    assignableForFutureBookings: boolean;
    reason: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

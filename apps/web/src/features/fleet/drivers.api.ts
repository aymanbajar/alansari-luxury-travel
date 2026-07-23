import { apiRequest } from "../../lib/api";
import type { Driver, DriverStatus, Pagination } from "./fleet.types";

export interface DriverQuery {
  search?: string;
  status?: DriverStatus | "";
  page: number;
  pageSize: number;
  sortBy: "fullName" | "createdAt" | "status";
  sortDirection: "asc" | "desc";
}

export interface SaveDriverInput {
  fullName: string;
  phoneNumber: string;
  overnightDailyRate: number;
  notes?: string;
}

function toQueryString(query: DriverQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function listDrivers(
  query: DriverQuery
): Promise<{ drivers: Driver[]; pagination: Pagination }> {
  return apiRequest(`/drivers?${toQueryString(query)}`);
}

export function getDriver(id: string): Promise<{ driver: Driver }> {
  return apiRequest(`/drivers/${id}`);
}

export function createDriver(input: SaveDriverInput): Promise<{ driver: Driver }> {
  return apiRequest("/drivers", { method: "POST", body: JSON.stringify(input) });
}

export function updateDriver(id: string, input: SaveDriverInput): Promise<{ driver: Driver }> {
  return apiRequest(`/drivers/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateDriverStatus(id: string, status: DriverStatus): Promise<{ driver: Driver }> {
  return apiRequest(`/drivers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function deleteDriver(id: string): Promise<{ driver: Driver }> {
  return apiRequest(`/drivers/${id}`, { method: "DELETE" });
}

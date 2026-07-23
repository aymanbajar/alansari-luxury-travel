import { apiRequest } from "../../lib/api";
import type { Pagination, Vehicle, VehicleStatus } from "./fleet.types";

export interface VehicleQuery {
  search?: string;
  status?: VehicleStatus | "";
  page: number;
  pageSize: number;
  sortBy: "plateNumber" | "createdAt" | "status";
  sortDirection: "asc" | "desc";
}

export interface SaveVehicleInput {
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  passengerCapacity: number;
  notes?: string;
}

function toQueryString(query: VehicleQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function listVehicles(
  query: VehicleQuery
): Promise<{ vehicles: Vehicle[]; pagination: Pagination }> {
  return apiRequest(`/vehicles?${toQueryString(query)}`);
}

export function getVehicle(id: string): Promise<{ vehicle: Vehicle }> {
  return apiRequest(`/vehicles/${id}`);
}

export function createVehicle(input: SaveVehicleInput): Promise<{ vehicle: Vehicle }> {
  return apiRequest("/vehicles", { method: "POST", body: JSON.stringify(input) });
}

export function updateVehicle(id: string, input: SaveVehicleInput): Promise<{ vehicle: Vehicle }> {
  return apiRequest(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateVehicleStatus(
  id: string,
  status: VehicleStatus
): Promise<{ vehicle: Vehicle }> {
  return apiRequest(`/vehicles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function deleteVehicle(id: string): Promise<{ vehicle: Vehicle }> {
  return apiRequest(`/vehicles/${id}`, { method: "DELETE" });
}

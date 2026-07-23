import type { Pagination } from "../fleet/fleet.types";
import { apiRequest } from "../../lib/api";

export interface Customer {
  id: string;
  fullName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  nationality: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerBookingHistoryItem {
  id: string;
  voucherNumber: string;
  startAt: string;
  endAt: string;
  tripType: string;
  destination: string;
  status: string;
  vehicle: { id: string; plateNumber: string; make: string; model: string };
  driver: { id: string; fullName: string; phoneNumber: string };
}

export interface CustomerQuery {
  search?: string;
  page: number;
  pageSize: number;
  sortBy: "fullName" | "createdAt";
  sortDirection: "asc" | "desc";
}

export interface SaveCustomerInput {
  fullName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  nationality?: string;
  notes?: string;
}

function toQueryString(query: CustomerQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function listCustomers(
  query: CustomerQuery
): Promise<{ customers: Customer[]; pagination: Pagination }> {
  return apiRequest(`/customers?${toQueryString(query)}`);
}

export function getCustomer(id: string): Promise<{ customer: Customer }> {
  return apiRequest(`/customers/${id}`);
}

export function createCustomer(
  input: SaveCustomerInput
): Promise<{ customer: Customer; possibleMatches: Customer[] }> {
  return apiRequest("/customers", { method: "POST", body: JSON.stringify(input) });
}

export function updateCustomer(
  id: string,
  input: SaveCustomerInput
): Promise<{ customer: Customer; possibleMatches: Customer[] }> {
  return apiRequest(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteCustomer(id: string): Promise<{ customer: Customer }> {
  return apiRequest(`/customers/${id}`, { method: "DELETE" });
}

export function listCustomerBookings(
  id: string
): Promise<{ bookings: CustomerBookingHistoryItem[] }> {
  return apiRequest(`/customers/${id}/bookings`);
}

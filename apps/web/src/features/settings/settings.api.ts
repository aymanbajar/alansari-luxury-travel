import { apiRequest } from "../../lib/api";

export interface OvernightSettings {
  defaultDriverDailyRate: string;
  preTripBufferHours: number;
  postTripBufferHours: number;
  currency: string;
  timezone: string;
}

export interface UpdateOvernightSettingsInput {
  defaultDriverDailyRate: number;
  preTripBufferHours: number;
  postTripBufferHours: number;
  currency: string;
  timezone: string;
}

export function getOvernightSettings(): Promise<{ settings: OvernightSettings }> {
  return apiRequest("/settings/overnight");
}

export function updateOvernightSettings(
  input: UpdateOvernightSettingsInput
): Promise<{ settings: OvernightSettings }> {
  return apiRequest("/settings/overnight", { method: "PATCH", body: JSON.stringify(input) });
}

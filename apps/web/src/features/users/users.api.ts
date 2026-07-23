import { apiRequest } from "../../lib/api";
import type { AuthUser, UserRole } from "../auth/types";

export interface StaffUser extends AuthUser {
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SaveUserInput {
  fullName: string;
  email: string;
  role: UserRole;
  password?: string;
}

export function listUsers(): Promise<{ users: StaffUser[] }> {
  return apiRequest("/users");
}

export function createUser(
  input: SaveUserInput & { password: string }
): Promise<{ user: StaffUser }> {
  return apiRequest("/users", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateUser(
  id: string,
  input: Omit<SaveUserInput, "password">
): Promise<{ user: StaffUser }> {
  return apiRequest(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function updateUserStatus(id: string, isActive: boolean): Promise<{ user: StaffUser }> {
  return apiRequest(`/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive })
  });
}

export function resetPassword(
  id: string,
  newPassword: string
): Promise<{ passwordReset: boolean }> {
  return apiRequest(`/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword, confirmPassword: newPassword })
  });
}

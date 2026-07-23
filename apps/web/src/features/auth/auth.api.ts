import { apiRequest } from "../../lib/api";
import type { AuthUser } from "./types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function login(input: LoginInput): Promise<{ user: AuthUser }> {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function refresh(): Promise<{ user: AuthUser }> {
  return apiRequest("/auth/refresh", { method: "POST" }, false);
}

export function logout(): Promise<{ loggedOut: boolean }> {
  return apiRequest("/auth/logout", { method: "POST" }, false);
}

export function me(): Promise<{ user: AuthUser }> {
  return apiRequest("/auth/me");
}

export function changePassword(input: ChangePasswordInput): Promise<{ passwordChanged: boolean }> {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

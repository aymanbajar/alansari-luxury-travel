export type UserRole = "ADMIN" | "STAFF";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

import type { User, UserRole } from "@prisma/client";

type SafeUserFields = Pick<
  User,
  | "id"
  | "fullName"
  | "email"
  | "role"
  | "isActive"
  | "lastLoginAt"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function toSafeUser(user: SafeUserFields): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt
  };
}

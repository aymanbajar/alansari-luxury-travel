import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      fullName: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};

import type { Request, RequestHandler } from "express";
import type { UserRole } from "@prisma/client";
import { fail } from "../../lib/api-response.js";
import { prisma } from "../../lib/prisma.js";
import { authCookieNames } from "./auth.constants.js";
import { verifyAccessToken } from "./token.service.js";

export const requireAuthentication: RequestHandler = async (req, res, next) => {
  const token = req.cookies[authCookieNames.accessToken];

  if (typeof token !== "string") {
    return fail(res, 401, "UNAUTHORIZED", "يلزم تسجيل الدخول.");
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return fail(res, 401, "UNAUTHORIZED", "يلزم تسجيل الدخول.");
    }

    req.user = user;
    next();
  } catch {
    return fail(res, 401, "UNAUTHORIZED", "انتهت الجلسة أو أنها غير صالحة.");
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, "UNAUTHORIZED", "يلزم تسجيل الدخول.");
    }

    if (!roles.includes(req.user.role)) {
      return fail(res, 403, "FORBIDDEN", "ليست لديك صلاحية لتنفيذ هذا الإجراء.");
    }

    next();
  };
}

export const requireAdmin = requireRole("ADMIN");
export const requireStaffOrAdmin = requireRole("ADMIN", "STAFF");

export function getRequiredUser(req: Request): Express.User {
  if (!req.user) {
    throw new Error("Authenticated user is missing from request context.");
  }

  return req.user;
}

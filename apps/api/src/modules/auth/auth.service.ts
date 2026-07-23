import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { logger } from "../../lib/logger.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import {
  createCsrfToken,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "./token.service.js";
import type { ChangePasswordInput, LoginInput } from "./auth.schemas.js";

const genericLoginError = "بيانات الدخول غير صحيحة.";

function getRequestMetadata(req: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req.ip,
    userAgent: req.header("user-agent")
  };
}

function toSafeUser(user: {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
}

function toAccessTokenPayload(user: {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF";
}) {
  return {
    sub: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };
}

export async function login(input: LoginInput, req: Request) {
  const metadata = getRequestMetadata(req);
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user || user.deletedAt || !user.isActive) {
    await recordAuditLog({
      action: "AUTH_LOGIN_FAILED",
      entityType: "User",
      entityId: user?.id,
      ipAddress: metadata.ipAddress,
      newValues: { email: input.email, reason: !user ? "not_found" : "inactive_or_deleted" }
    });
    logger.warn(
      { email: input.email, ipAddress: metadata.ipAddress },
      "Authentication login failed"
    );
    throw new AppError(401, "INVALID_CREDENTIALS", genericLoginError);
  }

  const passwordIsValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordIsValid) {
    await recordAuditLog({
      userId: user.id,
      action: "AUTH_LOGIN_FAILED",
      entityType: "User",
      entityId: user.id,
      ipAddress: metadata.ipAddress,
      newValues: { reason: "invalid_password" }
    });
    logger.warn({ userId: user.id, ipAddress: metadata.ipAddress }, "Authentication login failed");
    throw new AppError(401, "INVALID_CREDENTIALS", genericLoginError);
  }

  const refresh = signRefreshToken(user.id);
  const csrfToken = createCsrfToken();

  await prisma.$transaction(async (tx) => {
    await tx.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: refresh.tokenHash,
        refreshTokenExpiresAt: refresh.expiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    });

    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await recordAuditLog(
      {
        userId: user.id,
        action: "AUTH_LOGIN_SUCCEEDED",
        entityType: "User",
        entityId: user.id,
        ipAddress: metadata.ipAddress
      },
      tx
    );
  });

  return {
    user: toSafeUser(user),
    accessToken: signAccessToken(toAccessTokenPayload(user)),
    refreshToken: refresh.token,
    csrfToken
  };
}

export async function refreshSession(refreshToken: string | undefined, req: Request) {
  if (!refreshToken) {
    throw new AppError(401, "UNAUTHORIZED", "يلزم تسجيل الدخول.");
  }

  const metadata = getRequestMetadata(req);
  let payload: { sub: string };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    await recordAuditLog({
      action: "AUTH_REFRESH_FAILED",
      entityType: "AuthSession",
      ipAddress: metadata.ipAddress,
      newValues: { reason: "invalid_token" }
    });
    throw new AppError(401, "UNAUTHORIZED", "انتهت الجلسة أو أنها غير صالحة.");
  }

  const oldTokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.authSession.findUnique({
    where: { refreshTokenHash: oldTokenHash },
    include: { user: true }
  });

  if (
    !session ||
    session.revokedAt ||
    session.refreshTokenExpiresAt <= new Date() ||
    !session.user.isActive ||
    session.user.deletedAt
  ) {
    await recordAuditLog({
      userId: session?.userId ?? payload.sub,
      action: "AUTH_REFRESH_FAILED",
      entityType: "AuthSession",
      entityId: session?.id,
      ipAddress: metadata.ipAddress,
      newValues: { reason: "revoked_expired_or_inactive" }
    });
    throw new AppError(401, "UNAUTHORIZED", "انتهت الجلسة أو أنها غير صالحة.");
  }

  const nextRefresh = signRefreshToken(session.userId);
  const csrfToken = createCsrfToken();

  await prisma.$transaction(async (tx) => {
    await tx.authSession.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: nextRefresh.tokenHash
      }
    });

    await tx.authSession.create({
      data: {
        userId: session.userId,
        refreshTokenHash: nextRefresh.tokenHash,
        refreshTokenExpiresAt: nextRefresh.expiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    });

    await recordAuditLog(
      {
        userId: session.userId,
        action: "AUTH_REFRESH_SUCCEEDED",
        entityType: "AuthSession",
        entityId: session.id,
        ipAddress: metadata.ipAddress
      },
      tx
    );
  });

  return {
    user: toSafeUser(session.user),
    accessToken: signAccessToken(toAccessTokenPayload(session.user)),
    refreshToken: nextRefresh.token,
    csrfToken
  };
}

export async function logout(
  refreshToken: string | undefined,
  userId: string | undefined,
  req: Request
): Promise<void> {
  const metadata = getRequestMetadata(req);

  if (refreshToken) {
    await prisma.authSession.updateMany({
      where: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  await recordAuditLog({
    userId,
    action: "AUTH_LOGOUT",
    entityType: "AuthSession",
    ipAddress: metadata.ipAddress
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findFirstOrThrow({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  return user;
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  req: Request
): Promise<void> {
  const user = await prisma.user.findFirstOrThrow({
    where: { id: userId, isActive: true, deletedAt: null }
  });

  const passwordIsValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!passwordIsValid) {
    await recordAuditLog({
      userId,
      action: "AUTH_PASSWORD_CHANGE_FAILED",
      entityType: "User",
      entityId: userId,
      ipAddress: req.ip,
      newValues: { reason: "invalid_current_password" }
    });
    throw new AppError(400, "INVALID_PASSWORD", "كلمة المرور الحالية غير صحيحة.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.newPassword) }
    });

    await tx.authSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });

    await recordAuditLog(
      {
        userId,
        action: "AUTH_PASSWORD_CHANGED",
        entityType: "User",
        entityId: userId,
        ipAddress: req.ip
      },
      tx
    );
  });
}

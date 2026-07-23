import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { hashPassword } from "../auth/password.service.js";
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
  UpdateUserStatusInput
} from "./user.schemas.js";
import { toSafeUser } from "./user.presenter.js";

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
} satisfies Prisma.UserSelect;

function handleUniqueUserError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError(409, "CONFLICT", "البريد الإلكتروني مستخدم مسبقاً.");
  }

  throw error;
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: userSelect
  });

  return users.map(toSafeUser);
}

export async function createUser(input: CreateUserInput, actorId: string, ipAddress?: string) {
  try {
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        isActive: input.isActive ?? true
      },
      select: userSelect
    });

    await recordAuditLog({
      userId: actorId,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      newValues: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      ipAddress
    });

    return toSafeUser(user);
  } catch (error) {
    handleUniqueUserError(error);
  }
}

export async function getUser(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: userSelect
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "المستخدم غير موجود.");
  }

  return toSafeUser(user);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actorId: string,
  ipAddress?: string
) {
  const existing = await getUser(id);

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName,
        email: input.email,
        role: input.role
      },
      select: userSelect
    });

    await recordAuditLog({
      userId: actorId,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: id,
      oldValues: { ...existing },
      newValues: { ...toSafeUser(user) },
      ipAddress
    });

    return toSafeUser(user);
  } catch (error) {
    handleUniqueUserError(error);
  }
}

export async function updateUserStatus(
  id: string,
  input: UpdateUserStatusInput,
  actorId: string,
  ipAddress?: string
) {
  if (id === actorId && !input.isActive) {
    throw new AppError(400, "SELF_DEACTIVATION_NOT_ALLOWED", "لا يمكن تعطيل حسابك الحالي.");
  }

  const existing = await getUser(id);

  if (existing.role === "ADMIN" && existing.isActive && !input.isActive) {
    const activeAdminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
        deletedAt: null
      }
    });

    if (activeAdminCount <= 1) {
      throw new AppError(400, "LAST_ADMIN_NOT_ALLOWED", "لا يمكن تعطيل آخر حساب مدير نشط.");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: input.isActive },
    select: userSelect
  });

  if (!input.isActive) {
    await prisma.authSession.updateMany({
      where: {
        userId: id,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  await recordAuditLog({
    userId: actorId,
    action: input.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: id,
    oldValues: { isActive: existing.isActive },
    newValues: { isActive: user.isActive },
    ipAddress
  });

  return toSafeUser(user);
}

export async function resetPassword(
  id: string,
  input: ResetPasswordInput,
  actorId: string,
  ipAddress?: string
) {
  await getUser(id);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(input.newPassword) }
    });

    await tx.authSession.updateMany({
      where: {
        userId: id,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });

    await recordAuditLog(
      {
        userId: actorId,
        action: "USER_PASSWORD_RESET",
        entityType: "User",
        entityId: id,
        ipAddress
      },
      tx
    );
  });
}

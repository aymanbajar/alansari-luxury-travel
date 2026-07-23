import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

interface AuditInput {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function recordAuditLog(
  input: AuditInput,
  client: PrismaExecutor = prisma
): Promise<void> {
  await client.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValues: input.oldValues,
      newValues: input.newValues,
      ipAddress: input.ipAddress
    }
  });
}

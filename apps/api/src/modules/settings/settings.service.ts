import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditLog } from "../audit/audit.service.js";

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export interface OvernightSettings {
  defaultDriverDailyRate: string;
  preTripBufferHours: number;
  postTripBufferHours: number;
  currency: string;
  timezone: string;
}

const defaultOvernightSettings: OvernightSettings = {
  defaultDriverDailyRate: "250.00",
  preTripBufferHours: 12,
  postTripBufferHours: 12,
  currency: "SAR",
  timezone: "Asia/Riyadh"
};

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

export async function getOvernightSettings(
  client: PrismaClientLike = prisma
): Promise<OvernightSettings> {
  const [overnightDefaults, currencySetting, timezoneSetting] = await Promise.all([
    client.systemSetting.findUnique({ where: { key: "overnightDefaults" } }),
    client.systemSetting.findUnique({ where: { key: "currency" } }),
    client.systemSetting.findUnique({ where: { key: "timezone" } })
  ]);
  const overnight = asRecord(overnightDefaults?.value);

  return {
    defaultDriverDailyRate:
      typeof overnight.defaultDriverDailyRate === "string"
        ? overnight.defaultDriverDailyRate
        : typeof overnight.driverDailyRate === "string"
          ? overnight.driverDailyRate
          : defaultOvernightSettings.defaultDriverDailyRate,
    preTripBufferHours:
      typeof overnight.preTripBufferHours === "number"
        ? overnight.preTripBufferHours
        : defaultOvernightSettings.preTripBufferHours,
    postTripBufferHours:
      typeof overnight.postTripBufferHours === "number"
        ? overnight.postTripBufferHours
        : defaultOvernightSettings.postTripBufferHours,
    currency:
      typeof currencySetting?.value === "string"
        ? currencySetting.value
        : defaultOvernightSettings.currency,
    timezone:
      typeof timezoneSetting?.value === "string"
        ? timezoneSetting.value
        : defaultOvernightSettings.timezone
  };
}

export async function updateOvernightSettings(
  input: OvernightSettings,
  actorId: string,
  ipAddress?: string
): Promise<OvernightSettings> {
  return prisma.$transaction(async (tx) => {
    const existing = await getOvernightSettings(tx);

    await tx.systemSetting.upsert({
      where: { key: "overnightDefaults" },
      update: {
        value: {
          defaultDriverDailyRate: input.defaultDriverDailyRate,
          preTripBufferHours: input.preTripBufferHours,
          postTripBufferHours: input.postTripBufferHours
        },
        updatedById: actorId
      },
      create: {
        key: "overnightDefaults",
        value: {
          defaultDriverDailyRate: input.defaultDriverDailyRate,
          preTripBufferHours: input.preTripBufferHours,
          postTripBufferHours: input.postTripBufferHours
        },
        description: "Default overnight booking rate and availability buffer settings.",
        updatedById: actorId
      }
    });
    await tx.systemSetting.upsert({
      where: { key: "currency" },
      update: { value: input.currency, updatedById: actorId },
      create: {
        key: "currency",
        value: input.currency,
        description: "Default reporting and expense currency.",
        updatedById: actorId
      }
    });
    await tx.systemSetting.upsert({
      where: { key: "timezone" },
      update: { value: input.timezone, updatedById: actorId },
      create: {
        key: "timezone",
        value: input.timezone,
        description: "Default display timezone for operational dates.",
        updatedById: actorId
      }
    });

    await recordAuditLog(
      {
        userId: actorId,
        action: "OVERNIGHT_SETTINGS_UPDATED",
        entityType: "SystemSetting",
        oldValues: { ...existing },
        newValues: { ...input },
        ipAddress
      },
      tx
    );

    return input;
  });
}

export function assertNonNegativeSetting(value: number, code: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(400, code, "Setting value must be non-negative.");
  }
}

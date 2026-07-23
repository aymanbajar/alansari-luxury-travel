import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditLog } from "../audit/audit.service.js";
import type {
  CreateDriverInput,
  ListDriversInput,
  UpdateDriverInput,
  UpdateDriverStatusInput
} from "./driver.schemas.js";
import { toSafeDriver } from "./driver.presenter.js";

const driverSelect = {
  id: true,
  fullName: true,
  phoneNumber: true,
  status: true,
  overnightDailyRate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
} satisfies Prisma.DriverSelect;

export async function listDrivers(input: ListDriversInput) {
  const where: Prisma.DriverWhereInput = {
    deletedAt: null,
    status: input.status,
    OR: input.search
      ? [
          { fullName: { contains: input.search, mode: "insensitive" } },
          { phoneNumber: { contains: input.search, mode: "insensitive" } }
        ]
      : undefined
  };
  const skip = (input.page - 1) * input.pageSize;
  const [items, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      skip,
      take: input.pageSize,
      orderBy: { [input.sortBy]: input.sortDirection },
      select: driverSelect
    }),
    prisma.driver.count({ where })
  ]);

  return {
    items: items.map(toSafeDriver),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.ceil(total / input.pageSize)
    }
  };
}

export async function createDriver(input: CreateDriverInput, actorId: string, ipAddress?: string) {
  const driver = await prisma.driver.create({
    data: input,
    select: driverSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "DRIVER_CREATED",
    entityType: "Driver",
    entityId: driver.id,
    newValues: { ...toSafeDriver(driver) },
    ipAddress
  });

  return toSafeDriver(driver);
}

export async function getDriver(id: string) {
  const driver = await prisma.driver.findFirst({
    where: { id, deletedAt: null },
    select: driverSelect
  });

  if (!driver) {
    throw new AppError(404, "NOT_FOUND", "Driver not found.");
  }

  return toSafeDriver(driver);
}

export async function updateDriver(
  id: string,
  input: UpdateDriverInput,
  actorId: string,
  ipAddress?: string
) {
  const existing = await getDriver(id);
  const driver = await prisma.driver.update({
    where: { id },
    data: input,
    select: driverSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "DRIVER_UPDATED",
    entityType: "Driver",
    entityId: id,
    oldValues: { ...existing },
    newValues: { ...toSafeDriver(driver) },
    ipAddress
  });

  return toSafeDriver(driver);
}

export async function updateDriverStatus(
  id: string,
  input: UpdateDriverStatusInput,
  actorId: string,
  ipAddress?: string
) {
  const existing = await getDriver(id);
  const driver = await prisma.driver.update({
    where: { id },
    data: { status: input.status },
    select: driverSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "DRIVER_STATUS_CHANGED",
    entityType: "Driver",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: driver.status },
    ipAddress
  });

  return toSafeDriver(driver);
}

export async function softDeleteDriver(id: string, actorId: string, ipAddress?: string) {
  const existing = await getDriver(id);
  const driver = await prisma.driver.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: "INACTIVE"
    },
    select: driverSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "DRIVER_SOFT_DELETED",
    entityType: "Driver",
    entityId: id,
    oldValues: { status: existing.status, deletedAt: existing.deletedAt },
    newValues: { status: driver.status, deletedAt: driver.deletedAt },
    ipAddress
  });

  return toSafeDriver(driver);
}

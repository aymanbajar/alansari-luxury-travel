import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditLog } from "../audit/audit.service.js";
import type {
  CreateVehicleInput,
  ListVehiclesInput,
  UpdateVehicleInput,
  UpdateVehicleStatusInput
} from "./vehicle.schemas.js";
import { toSafeVehicle } from "./vehicle.presenter.js";

const vehicleSelect = {
  id: true,
  plateNumber: true,
  make: true,
  model: true,
  year: true,
  passengerCapacity: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
} satisfies Prisma.VehicleSelect;

function handleVehicleError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError(409, "CONFLICT", "Plate number already exists.");
  }

  throw error;
}

export async function listVehicles(input: ListVehiclesInput) {
  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    status: input.status,
    OR: input.search
      ? [
          { plateNumber: { contains: input.search, mode: "insensitive" } },
          { make: { contains: input.search, mode: "insensitive" } },
          { model: { contains: input.search, mode: "insensitive" } }
        ]
      : undefined
  };
  const skip = (input.page - 1) * input.pageSize;
  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: input.pageSize,
      orderBy: { [input.sortBy]: input.sortDirection },
      select: vehicleSelect
    }),
    prisma.vehicle.count({ where })
  ]);

  return {
    items: items.map(toSafeVehicle),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.ceil(total / input.pageSize)
    }
  };
}

export async function createVehicle(
  input: CreateVehicleInput,
  actorId: string,
  ipAddress?: string
) {
  try {
    const vehicle = await prisma.vehicle.create({
      data: input,
      select: vehicleSelect
    });

    await recordAuditLog({
      userId: actorId,
      action: "VEHICLE_CREATED",
      entityType: "Vehicle",
      entityId: vehicle.id,
      newValues: { ...vehicle },
      ipAddress
    });

    return toSafeVehicle(vehicle);
  } catch (error) {
    handleVehicleError(error);
  }
}

export async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    select: vehicleSelect
  });

  if (!vehicle) {
    throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
  }

  return toSafeVehicle(vehicle);
}

export async function updateVehicle(
  id: string,
  input: UpdateVehicleInput,
  actorId: string,
  ipAddress?: string
) {
  const existing = await getVehicle(id);

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: input,
      select: vehicleSelect
    });

    await recordAuditLog({
      userId: actorId,
      action: "VEHICLE_UPDATED",
      entityType: "Vehicle",
      entityId: id,
      oldValues: { ...existing },
      newValues: { ...toSafeVehicle(vehicle) },
      ipAddress
    });

    return toSafeVehicle(vehicle);
  } catch (error) {
    handleVehicleError(error);
  }
}

export async function updateVehicleStatus(
  id: string,
  input: UpdateVehicleStatusInput,
  actorId: string,
  ipAddress?: string
) {
  const existing = await getVehicle(id);
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { status: input.status },
    select: vehicleSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "VEHICLE_STATUS_CHANGED",
    entityType: "Vehicle",
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: vehicle.status },
    ipAddress
  });

  return toSafeVehicle(vehicle);
}

export async function softDeleteVehicle(id: string, actorId: string, ipAddress?: string) {
  const existing = await getVehicle(id);
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: "INACTIVE"
    },
    select: vehicleSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "VEHICLE_SOFT_DELETED",
    entityType: "Vehicle",
    entityId: id,
    oldValues: { status: existing.status, deletedAt: existing.deletedAt },
    newValues: { status: vehicle.status, deletedAt: vehicle.deletedAt },
    ipAddress
  });

  return toSafeVehicle(vehicle);
}

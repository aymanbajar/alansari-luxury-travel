import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditLog } from "../audit/audit.service.js";
import type {
  CreateCustomerInput,
  ListCustomersInput,
  UpdateCustomerInput
} from "./customer.schemas.js";
import { normalizePhone } from "./customer.schemas.js";
import { toSafeCustomer } from "./customer.presenter.js";

const customerSelect = {
  id: true,
  fullName: true,
  phoneCountryCode: true,
  phoneNumber: true,
  nationality: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
} satisfies Prisma.CustomerSelect;

const bookingHistorySelect = {
  id: true,
  voucherNumber: true,
  startAt: true,
  endAt: true,
  tripType: true,
  destination: true,
  status: true,
  vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
  driver: { select: { id: true, fullName: true, phoneNumber: true } }
} satisfies Prisma.BookingSelect;

async function findPossibleMatches(
  phoneCountryCode: string,
  phoneNumber: string,
  excludeId?: string
) {
  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone) {
    return [];
  }

  const matches = await prisma.customer.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      deletedAt: null,
      phoneCountryCode,
      phoneNumber: normalizedPhone
    },
    take: 5,
    select: customerSelect
  });

  return matches.map(toSafeCustomer);
}

export async function listCustomers(input: ListCustomersInput) {
  const normalizedSearch = input.search ? normalizePhone(input.search) : undefined;
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    OR: input.search
      ? [
          { fullName: { contains: input.search, mode: "insensitive" } },
          { phoneNumber: { contains: normalizedSearch || input.search, mode: "insensitive" } }
        ]
      : undefined
  };
  const skip = (input.page - 1) * input.pageSize;
  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: input.pageSize,
      orderBy: { [input.sortBy]: input.sortDirection },
      select: customerSelect
    }),
    prisma.customer.count({ where })
  ]);

  return {
    items: items.map(toSafeCustomer),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.ceil(total / input.pageSize)
    }
  };
}

export async function createCustomer(
  input: CreateCustomerInput,
  actorId: string,
  ipAddress?: string
) {
  const possibleMatches = await findPossibleMatches(input.phoneCountryCode, input.phoneNumber);
  const customer = await prisma.customer.create({
    data: input,
    select: customerSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "CUSTOMER_CREATED",
    entityType: "Customer",
    entityId: customer.id,
    newValues: { ...customer, possibleDuplicateCount: possibleMatches.length },
    ipAddress
  });

  return { customer: toSafeCustomer(customer), possibleMatches };
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    select: customerSelect
  });

  if (!customer) {
    throw new AppError(404, "NOT_FOUND", "Customer not found.");
  }

  return toSafeCustomer(customer);
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  actorId: string,
  ipAddress?: string
) {
  const existing = await getCustomer(id);
  const possibleMatches =
    input.phoneCountryCode && input.phoneNumber
      ? await findPossibleMatches(input.phoneCountryCode, input.phoneNumber, id)
      : [];
  const customer = await prisma.customer.update({
    where: { id },
    data: input,
    select: customerSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "CUSTOMER_UPDATED",
    entityType: "Customer",
    entityId: id,
    oldValues: { ...existing },
    newValues: { ...toSafeCustomer(customer), possibleDuplicateCount: possibleMatches.length },
    ipAddress
  });

  return { customer: toSafeCustomer(customer), possibleMatches };
}

export async function deleteCustomer(id: string, actorId: string, ipAddress?: string) {
  const existing = await getCustomer(id);
  const bookingCount = await prisma.booking.count({ where: { customerId: id } });
  const customer = await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: customerSelect
  });

  await recordAuditLog({
    userId: actorId,
    action: "CUSTOMER_SOFT_DELETED",
    entityType: "Customer",
    entityId: id,
    oldValues: { ...existing, bookingCount },
    newValues: { deletedAt: customer.deletedAt },
    ipAddress
  });

  return toSafeCustomer(customer);
}

export async function getCustomerBookings(id: string) {
  await getCustomer(id);
  return prisma.booking.findMany({
    where: { customerId: id, deletedAt: null },
    orderBy: { startAt: "desc" },
    select: bookingHistorySelect
  });
}

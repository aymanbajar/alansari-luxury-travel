import type { Customer } from "@prisma/client";

type CustomerFields = Pick<
  Customer,
  | "id"
  | "fullName"
  | "phoneCountryCode"
  | "phoneNumber"
  | "nationality"
  | "notes"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;

export function toSafeCustomer(customer: CustomerFields) {
  return {
    id: customer.id,
    fullName: customer.fullName,
    phoneCountryCode: customer.phoneCountryCode,
    phoneNumber: customer.phoneNumber,
    nationality: customer.nationality,
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    deletedAt: customer.deletedAt
  };
}

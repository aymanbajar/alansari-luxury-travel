import { z } from "zod";

const sortFields = ["fullName", "createdAt"] as const;
const sortDirections = ["asc", "desc"] as const;

export function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export const listCustomersSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.enum(sortFields).default("createdAt"),
    sortDirection: z.enum(sortDirections).default("desc")
  })
});

export const customerIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid customer id.")
  })
});

export const createCustomerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, "Customer name is required.").max(160),
    phoneCountryCode: z.string().trim().min(1).max(8),
    phoneNumber: z.string().trim().min(5).max(40).transform(normalizePhone),
    nationality: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(2000).optional()
  })
});

export const updateCustomerSchema = customerIdParamsSchema.extend({
  body: createCustomerSchema.shape.body.partial()
});

export type ListCustomersInput = z.infer<typeof listCustomersSchema>["query"];
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>["body"];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>["body"];

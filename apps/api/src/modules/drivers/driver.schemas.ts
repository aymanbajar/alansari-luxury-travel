import { z } from "zod";

const driverStatuses = ["AVAILABLE", "ASSIGNED", "ON_LEAVE", "INACTIVE"] as const;
const sortFields = ["fullName", "createdAt", "status"] as const;
const sortDirections = ["asc", "desc"] as const;

const phoneNumberSchema = z
  .string()
  .trim()
  .min(7, "Phone number is required.")
  .max(40)
  .regex(/^\+?[0-9\s-]{7,40}$/, "Phone number is invalid.")
  .transform((value) => value.replace(/\s+/g, ""));

export const listDriversSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(driverStatuses).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.enum(sortFields).default("createdAt"),
    sortDirection: z.enum(sortDirections).default("desc")
  })
});

export const driverIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid driver id.")
  })
});

export const createDriverSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, "Driver full name is required.").max(160),
    phoneNumber: phoneNumberSchema,
    status: z.enum(driverStatuses).default("AVAILABLE"),
    overnightDailyRate: z.coerce.number().min(0, "Overnight rate cannot be negative."),
    notes: z.string().trim().max(2000).optional()
  })
});

export const updateDriverSchema = driverIdParamsSchema.extend({
  body: createDriverSchema.shape.body.partial().omit({ status: true })
});

export const updateDriverStatusSchema = driverIdParamsSchema.extend({
  body: z.object({
    status: z.enum(driverStatuses)
  })
});

export type ListDriversInput = z.infer<typeof listDriversSchema>["query"];
export type CreateDriverInput = z.infer<typeof createDriverSchema>["body"];
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>["body"];
export type UpdateDriverStatusInput = z.infer<typeof updateDriverStatusSchema>["body"];

import { z } from "zod";

const vehicleStatuses = [
  "AVAILABLE",
  "BOOKED",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
  "INACTIVE"
] as const;

const sortFields = ["plateNumber", "createdAt", "status"] as const;
const sortDirections = ["asc", "desc"] as const;

const plateNumberSchema = z
  .string()
  .min(1, "Plate number is required.")
  .max(40)
  .transform((value) => value.trim().replace(/\s+/g, " ").toUpperCase());

export const listVehiclesSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(vehicleStatuses).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.enum(sortFields).default("createdAt"),
    sortDirection: z.enum(sortDirections).default("desc")
  })
});

export const vehicleIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid vehicle id.")
  })
});

export const createVehicleSchema = z.object({
  body: z.object({
    plateNumber: plateNumberSchema,
    make: z.string().trim().min(1, "Vehicle make is required.").max(100),
    model: z.string().trim().min(1, "Vehicle model is required.").max(100),
    year: z.coerce.number().int().min(1990).max(2100),
    passengerCapacity: z.coerce.number().int().positive("Passenger capacity must be positive."),
    status: z.enum(vehicleStatuses).default("AVAILABLE"),
    notes: z.string().trim().max(2000).optional()
  })
});

export const updateVehicleSchema = vehicleIdParamsSchema.extend({
  body: createVehicleSchema.shape.body.partial().omit({ status: true })
});

export const updateVehicleStatusSchema = vehicleIdParamsSchema.extend({
  body: z.object({
    status: z.enum(vehicleStatuses)
  })
});

export type ListVehiclesInput = z.infer<typeof listVehiclesSchema>["query"];
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>["body"];
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>["body"];
export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>["body"];

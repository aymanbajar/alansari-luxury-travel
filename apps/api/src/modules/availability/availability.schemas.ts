import { z } from "zod";

const dateTimeSchema = z.string().datetime({ offset: true });
const tripTypes = ["CITY", "OUTSIDE_CITY", "OVERNIGHT"] as const;

const availabilityShape = {
  startAt: dateTimeSchema,
  endAt: dateTimeSchema,
  bookingId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  passengerCapacity: z.coerce.number().int().positive().optional(),
  tripType: z.enum(tripTypes).optional()
};

function dateRangeRefinement(value: { startAt: string; endAt: string }): boolean {
  return new Date(value.endAt) > new Date(value.startAt);
}

export const checkAvailabilitySchema = z.object({
  body: z.object(availabilityShape).refine(dateRangeRefinement, {
    message: "Availability end time must be later than start time.",
    path: ["endAt"]
  })
});

export const listAvailableResourcesSchema = z.object({
  query: z.object(availabilityShape).refine(dateRangeRefinement, {
    message: "Availability end time must be later than start time.",
    path: ["endAt"]
  })
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>["body"];
export type ListAvailableResourcesInput = z.infer<typeof listAvailableResourcesSchema>["query"];

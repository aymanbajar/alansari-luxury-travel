import { z } from "zod";

const bookingStatuses = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const tripTypes = ["CITY", "OUTSIDE_CITY", "OVERNIGHT"] as const;
const vehicleStatuses = [
  "AVAILABLE",
  "BOOKED",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
  "INACTIVE"
] as const;
const timelineViews = ["day", "week", "month"] as const;

const dateTimeSchema = z.string().datetime({ offset: true });

export const dashboardSummarySchema = z.object({
  query: z
    .object({
      startFrom: dateTimeSchema.optional(),
      endTo: dateTimeSchema.optional()
    })
    .refine(
      (value) =>
        !value.startFrom || !value.endTo || new Date(value.endTo) > new Date(value.startFrom),
      {
        message: "Dashboard end date must be later than start date.",
        path: ["endTo"]
      }
    )
});

export const dashboardTimelineSchema = z.object({
  query: z
    .object({
      startFrom: dateTimeSchema,
      endTo: dateTimeSchema,
      view: z.enum(timelineViews).default("day"),
      vehicleId: z.string().uuid().optional(),
      vehicleStatus: z.enum(vehicleStatuses).optional(),
      driverId: z.string().uuid().optional(),
      customerId: z.string().uuid().optional(),
      bookingStatus: z.enum(bookingStatuses).optional(),
      tripType: z.enum(tripTypes).optional(),
      overnightOnly: z.coerce.boolean().default(false),
      voucherNumber: z.string().trim().optional()
    })
    .refine((value) => new Date(value.endTo) > new Date(value.startFrom), {
      message: "Timeline end date must be later than start date.",
      path: ["endTo"]
    })
});

export type DashboardSummaryInput = z.infer<typeof dashboardSummarySchema>["query"];
export type DashboardTimelineInput = z.infer<typeof dashboardTimelineSchema>["query"];

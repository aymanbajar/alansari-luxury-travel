import { z } from "zod";
import { reportTypes } from "./report.types.js";

const bookingStatuses = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const tripTypes = ["CITY", "OUTSIDE_CITY", "OVERNIGHT"] as const;
const formats = ["excel", "pdf"] as const;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

const baseFiltersSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  bookingStatus: z.enum(bookingStatuses).optional(),
  tripType: z.enum(tripTypes).optional(),
  overnightOnly: z.coerce.boolean().default(false),
  destination: z.string().trim().max(220).optional(),
  voucherNumber: z.string().trim().max(80).optional()
});

const filtersSchema = baseFiltersSchema.superRefine((value, context) => {
  const start = new Date(`${value.startDate}T00:00:00.000Z`);
  const end = new Date(`${value.endDate}T00:00:00.000Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  if (days < 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Report end date must be on or after start date.",
      path: ["endDate"]
    });
  }

  if (days > 370) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Report date range cannot exceed 370 days.",
      path: ["endDate"]
    });
  }
});

export const reportPreviewSchema = z.object({
  params: z.object({
    type: z.enum(reportTypes)
  }),
  query: filtersSchema
});

export const reportExportSchema = z.object({
  params: z.object({
    type: z.enum(reportTypes)
  }),
  query: baseFiltersSchema
    .extend({
      format: z.enum(formats)
    })
    .superRefine((value, context) => {
      const start = new Date(`${value.startDate}T00:00:00.000Z`);
      const end = new Date(`${value.endDate}T00:00:00.000Z`);
      const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);

      if (days < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Report end date must be on or after start date.",
          path: ["endDate"]
        });
      }

      if (days > 370) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Report date range cannot exceed 370 days.",
          path: ["endDate"]
        });
      }
    })
});

export type ReportPreviewParams = z.infer<typeof reportPreviewSchema>["params"];
export type ReportPreviewQuery = z.infer<typeof reportPreviewSchema>["query"];
export type ReportExportQuery = z.infer<typeof reportExportSchema>["query"];

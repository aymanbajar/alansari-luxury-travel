import { z } from "zod";

const bookingStatuses = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const tripTypes = ["CITY", "OUTSIDE_CITY", "OVERNIGHT"] as const;
const sortFields = ["startAt", "createdAt", "voucherNumber", "status"] as const;
const sortDirections = ["asc", "desc"] as const;

const dateTimeSchema = z.string().datetime({ offset: true });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");
const overnightStaySchema = z.object({
  city: z.string().trim().max(120).optional(),
  accommodationName: z.string().trim().max(180).optional(),
  checkInDate: dateSchema.optional(),
  checkOutDate: dateSchema.optional(),
  driverDailyRate: z.coerce.number().nonnegative().optional(),
  totalDriverCost: z.coerce.number().nonnegative().optional(),
  overrideReason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional()
});
const bookingBodySchema = z.object({
  voucherNumber: z.string().trim().min(1, "Voucher number is required.").max(80),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  startAt: dateTimeSchema,
  endAt: dateTimeSchema,
  tripType: z.enum(tripTypes),
  destination: z.string().trim().min(2, "Destination is required.").max(220),
  status: z.enum(bookingStatuses).default("DRAFT"),
  overnightStay: overnightStaySchema.optional(),
  notes: z.string().trim().max(2000).optional()
});

export const listBookingsSchema = z.object({
  query: z.object({
    voucherNumber: z.string().trim().optional(),
    status: z.enum(bookingStatuses).optional(),
    customerId: z.string().uuid().optional(),
    vehicleId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    startFrom: dateTimeSchema.optional(),
    startTo: dateTimeSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.enum(sortFields).default("startAt"),
    sortDirection: z.enum(sortDirections).default("desc")
  })
});

export const bookingIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking id.")
  })
});

export const createBookingSchema = z.object({
  body: bookingBodySchema
    .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
      message: "Booking end time must be later than start time.",
      path: ["endAt"]
    })
    .superRefine((value, context) => {
      if (value.tripType === "CITY" && value.overnightStay) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City bookings must not include overnight stay data.",
          path: ["overnightStay"]
        });
      }

      if (value.tripType === "OVERNIGHT") {
        if (!value.overnightStay?.accommodationName) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Accommodation name is required for overnight bookings.",
            path: ["overnightStay", "accommodationName"]
          });
        }
        if (!value.overnightStay?.checkInDate) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Check-in date is required for overnight bookings.",
            path: ["overnightStay", "checkInDate"]
          });
        }
        if (!value.overnightStay?.checkOutDate) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Check-out date is required for overnight bookings.",
            path: ["overnightStay", "checkOutDate"]
          });
        }
      }

      if (value.overnightStay?.checkInDate && value.overnightStay.checkOutDate) {
        const checkIn = new Date(`${value.overnightStay.checkInDate}T00:00:00.000Z`);
        const checkOut = new Date(`${value.overnightStay.checkOutDate}T00:00:00.000Z`);
        if (checkOut <= checkIn) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Check-out date must be after check-in date.",
            path: ["overnightStay", "checkOutDate"]
          });
        }
      }
    })
});

export const updateBookingSchema = bookingIdParamsSchema.extend({
  body: bookingBodySchema.omit({ status: true }).partial()
});

export const updateBookingStatusSchema = bookingIdParamsSchema.extend({
  body: z.object({
    status: z.enum(bookingStatuses)
  })
});

export const cancelBookingSchema = bookingIdParamsSchema.extend({
  body: z.object({
    reason: z.string().trim().max(500).optional()
  })
});

export type ListBookingsInput = z.infer<typeof listBookingsSchema>["query"];
export type CreateBookingInput = z.infer<typeof createBookingSchema>["body"];
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>["body"];
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>["body"];
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>["body"];

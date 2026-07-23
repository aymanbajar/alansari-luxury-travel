import { z } from "zod";

export const updateOvernightSettingsSchema = z.object({
  body: z.object({
    defaultDriverDailyRate: z.coerce
      .number()
      .nonnegative()
      .transform((value) => value.toFixed(2)),
    preTripBufferHours: z.coerce.number().int().nonnegative().max(168),
    postTripBufferHours: z.coerce.number().int().nonnegative().max(168),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/),
    timezone: z.string().trim().min(1).max(80)
  })
});

export type UpdateOvernightSettingsInput = z.infer<typeof updateOvernightSettingsSchema>["body"];

import { z } from "zod";
import { passwordSchema } from "../auth/auth.schemas.js";

export const userIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("معرف المستخدم غير صحيح.")
  })
});

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, "الاسم مطلوب.").max(160),
    email: z
      .string()
      .email("البريد الإلكتروني غير صحيح.")
      .transform((value) => value.toLowerCase()),
    role: z.enum(["ADMIN", "STAFF"]),
    password: passwordSchema,
    isActive: z.boolean().optional()
  })
});

export const updateUserSchema = userIdParamsSchema.extend({
  body: z.object({
    fullName: z.string().min(2).max(160).optional(),
    email: z
      .string()
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    role: z.enum(["ADMIN", "STAFF"]).optional()
  })
});

export const updateUserStatusSchema = userIdParamsSchema.extend({
  body: z.object({
    isActive: z.boolean()
  })
});

export const resetPasswordSchema = userIdParamsSchema.extend({
  body: z
    .object({
      newPassword: passwordSchema,
      confirmPassword: z.string()
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: "تأكيد كلمة المرور غير مطابق.",
      path: ["confirmPassword"]
    })
});

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];

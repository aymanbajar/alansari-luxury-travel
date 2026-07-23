import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل.")
  .regex(/[A-Z]/, "كلمة المرور يجب أن تحتوي على حرف كبير.")
  .regex(/[a-z]/, "كلمة المرور يجب أن تحتوي على حرف صغير.")
  .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم.");

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("البريد الإلكتروني غير صحيح.")
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1, "كلمة المرور مطلوبة.")
  })
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة."),
      newPassword: passwordSchema,
      confirmPassword: z.string()
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: "تأكيد كلمة المرور غير مطابق.",
      path: ["confirmPassword"]
    })
});

export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
export { passwordSchema };

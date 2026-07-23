import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { changePassword } from "../features/auth/auth.api";
import { useAuth } from "../features/auth/useAuth";

const schema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة."),
    newPassword: z
      .string()
      .min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل.")
      .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير.")
      .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير.")
      .regex(/[0-9]/, "يجب أن تحتوي على رقم."),
    confirmPassword: z.string()
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "تأكيد كلمة المرور غير مطابق.",
    path: ["confirmPassword"]
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-bold">تغيير كلمة المرور</h1>
      <form
        className="mt-5 rounded-lg border border-olive/20 bg-white p-5"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          setMessage(null);
          try {
            await changePassword(values);
            setMessage("تم تغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى.");
            await logout().catch(() => undefined);
            navigate("/login", { replace: true });
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "تعذر تغيير كلمة المرور.");
          }
        })}
      >
        {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
          <label className="mb-4 block" key={field}>
            <span className="mb-2 block text-sm font-medium">
              {field === "currentPassword"
                ? "كلمة المرور الحالية"
                : field === "newPassword"
                  ? "كلمة المرور الجديدة"
                  : "تأكيد كلمة المرور"}
            </span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-3"
              type="password"
              {...form.register(field)}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors[field]?.message}
            </span>
          </label>
        ))}
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mb-4 text-sm text-sea">{message}</p> : null}
        <button
          className="rounded-md bg-ink px-4 py-3 font-semibold text-white"
          disabled={form.formState.isSubmitting}
        >
          حفظ
        </button>
      </form>
    </section>
  );
}

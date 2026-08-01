import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ActionButton,
  ErrorAlert,
  fieldClasses,
  FormField,
  PageHeader,
  SectionCard,
  SuccessAlert
} from "../components/admin-ui";
import { changePassword } from "../features/auth/auth.api";
import { useAuth } from "../features/auth/useAuth";
import { ApiError } from "../lib/api";

const schema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة."),
    newPassword: z
      .string()
      .min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل.")
      .regex(/[A-Z]/, "كلمة المرور يجب أن تحتوي على حرف كبير.")
      .regex(/[a-z]/, "كلمة المرور يجب أن تحتوي على حرف صغير.")
      .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم."),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور الجديدة مطلوب.")
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.",
    path: ["newPassword"]
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "تأكيد كلمة المرور غير مطابق.",
    path: ["confirmPassword"]
  });

type FormValues = z.infer<typeof schema>;
type PasswordFieldName = keyof FormValues;

const passwordFields: Array<{
  name: PasswordFieldName;
  label: string;
  autoComplete: "current-password" | "new-password";
}> = [
  { name: "currentPassword", label: "كلمة المرور الحالية", autoComplete: "current-password" },
  { name: "newPassword", label: "كلمة المرور الجديدة", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "تأكيد كلمة المرور الجديدة",
    autoComplete: "new-password"
  }
];

function mapPasswordError(caught: unknown): string {
  if (caught instanceof ApiError) {
    if (caught.code === "INVALID_PASSWORD") {
      return "كلمة المرور الحالية غير صحيحة.";
    }
    if (caught.status === 401) {
      return "انتهت الجلسة أو أصبحت غير صالحة. يرجى تسجيل الدخول مرة أخرى.";
    }
    if (caught.status === 403) {
      return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
    }
  }

  return "تعذر تغيير كلمة المرور. حاول مرة أخرى.";
}

function passwordStrength(value: string): { label: string; percent: string; tone: string } {
  const checks = [
    value.length >= 10,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /[0-9]/.test(value)
  ].filter(Boolean).length;

  if (checks <= 1) {
    return { label: "ضعيفة", percent: "25%", tone: "bg-red-600" };
  }
  if (checks <= 3) {
    return { label: "متوسطة", percent: "65%", tone: "bg-gold" };
  }
  return { label: "قوية", percent: "100%", tone: "bg-emerald-600" };
}

export function ChangePasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<PasswordFieldName, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const { logout } = useAuth();
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  });
  const newPassword = form.watch("newPassword") ?? "";
  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);

  async function submit(values: FormValues): Promise<void> {
    setError(null);
    setMessage(null);
    try {
      await changePassword(values);
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("تم تغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى.");
      await logout().catch(() => undefined);
      navigate("/login", { replace: true });
    } catch (caught) {
      setError(mapPasswordError(caught));
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="تغيير كلمة المرور"
        description="حدّث كلمة مرور حسابك للحفاظ على أمان الوصول إلى النظام."
      />

      <div className="mx-auto max-w-2xl">
        {message ? <SuccessAlert message={message} /> : null}
        {error ? <div className="mb-4"><ErrorAlert message={error} /></div> : null}

        <SectionCard
          title="أمان الحساب"
          description="استخدم كلمة مرور مختلفة عن حساباتك الأخرى ولا تشاركها مع أي شخص."
          icon={<ShieldCheck size={22} aria-hidden="true" />}
        >
          <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
            {passwordFields.map((field) => (
              <FormField
                key={field.name}
                id={field.name}
                label={field.label}
                error={form.formState.errors[field.name]?.message}
              >
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    id={field.name}
                    className={`${fieldClasses} px-12`}
                    type={visibleFields[field.name] ? "text" : "password"}
                    autoComplete={field.autoComplete}
                    aria-invalid={Boolean(form.formState.errors[field.name])}
                    aria-describedby={`${field.name}-error`}
                    {...form.register(field.name)}
                  />
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-olive transition hover:bg-paper hover:text-ink focus:outline-none focus:ring-4 focus:ring-sea/15"
                    aria-label={
                      visibleFields[field.name] ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                    onClick={() =>
                      setVisibleFields((current) => ({
                        ...current,
                        [field.name]: !current[field.name]
                      }))
                    }
                  >
                    {visibleFields[field.name] ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>
            ))}

            <div className="rounded-2xl border border-olive/15 bg-paper/70 p-4">
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span className="text-ink">قوة كلمة المرور</span>
                <span className="text-olive">{strength.label}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-olive/15">
                <div className={`h-full rounded-full ${strength.tone}`} style={{ width: strength.percent }} />
              </div>
              <ul className="mt-4 grid gap-2 text-sm leading-6 text-olive sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  10 أحرف على الأقل
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  حرف كبير وحرف صغير
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  رقم واحد على الأقل
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  مختلفة عن كلمة المرور الحالية
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-sea/15 bg-sea/5 p-4 text-sm leading-7 text-olive">
              <div className="mb-2 flex items-center gap-2 font-bold text-ink">
                <KeyRound size={18} aria-hidden="true" />
                ملاحظة أمنية
              </div>
              <p>لا تشارك كلمة مرورك مع أي شخص. استخدم كلمة مرور مختلفة عن حساباتك الأخرى.</p>
            </div>

            <ActionButton
              type="submit"
              className="w-full"
              isLoading={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "جار الحفظ..." : "حفظ كلمة المرور"}
            </ActionButton>
          </form>
        </SectionCard>
      </div>
    </section>
  );
}

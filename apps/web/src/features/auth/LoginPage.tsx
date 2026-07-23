import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "./useAuth";

const schema = z.object({
  email: z.string().email("أدخل بريداً إلكترونياً صحيحاً."),
  password: z.string().min(1, "كلمة المرور مطلوبة.")
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-ink">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">إدارة الأسطول والحجوزات</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-olive">
            سجّل الدخول للوصول إلى لوحة التشغيل حسب صلاحيات حسابك.
          </p>
        </section>

        <form
          className="rounded-lg border border-olive/20 bg-white p-6 shadow-sm"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await login(values.email, values.password);
              navigate(from, { replace: true });
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "تعذر تسجيل الدخول.");
            }
          })}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-paper">
              <LockKeyhole size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold">تسجيل الدخول</h2>
              <p className="text-sm text-olive">استخدم حساب العمل المعتمد.</p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">البريد الإلكتروني</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-3 outline-none focus:border-sea"
              {...form.register("email")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.email?.message}
            </span>
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">كلمة المرور</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-3 outline-none focus:border-sea"
              type="password"
              {...form.register("password")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.password?.message}
            </span>
          </label>

          {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

          <button
            className="w-full rounded-md bg-ink px-4 py-3 font-semibold text-white disabled:opacity-60"
            disabled={form.formState.isSubmitting}
          >
            دخول
          </button>
        </form>
      </div>
    </main>
  );
}

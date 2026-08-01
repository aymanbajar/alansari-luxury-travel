import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  BriefcaseBusiness,
  Car,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPinned,
  Route,
  ShieldCheck,
  UserCog
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "./useAuth";

const schema = z.object({
  email: z.string().email("أدخل بريدا إلكترونيا صحيحا."),
  password: z.string().min(1, "كلمة المرور مطلوبة.")
});

type LoginForm = z.infer<typeof schema>;

const features = [
  { label: "إدارة الحجوزات", icon: BriefcaseBusiness },
  { label: "متابعة المركبات", icon: Car },
  { label: "تنظيم السائقين", icon: UserCog }
];

function BrandPanel() {
  return (
    <section
      className="relative hidden h-full min-h-[520px] max-h-[min(660px,calc(100dvh-3rem))] overflow-hidden rounded-[1.5rem] bg-ink px-[clamp(1.5rem,2.5vw,2.5rem)] py-[clamp(1.5rem,3dvh,3rem)] text-white shadow-2xl shadow-ink/20 lg:flex lg:flex-col lg:justify-between [@media(max-height:820px)]:min-h-[500px] [@media(max-height:820px)]:max-h-[calc(100dvh-1.5rem)] [@media(max-height:820px)]:py-6"
      aria-labelledby="brand-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(185,137,69,0.28),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(35,100,119,0.34),transparent_26%),linear-gradient(145deg,rgba(24,35,31,0.96),rgba(19,30,34,0.96))]" />
      <div className="absolute -left-16 top-14 h-44 w-44 rounded-full border border-gold/25 [@media(max-height:820px)]:h-36 [@media(max-height:820px)]:w-36" />
      <div className="absolute -bottom-20 right-8 h-56 w-56 rounded-full border border-sea/35 [@media(max-height:820px)]:h-44 [@media(max-height:820px)]:w-44" />
      <svg
        className="absolute inset-x-8 bottom-[clamp(6.5rem,16dvh,8rem)] h-[clamp(10rem,26dvh,16rem)] text-gold/35 [@media(max-height:820px)]:bottom-24 [@media(max-height:820px)]:h-44"
        viewBox="0 0 640 260"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M38 197C116 78 197 228 278 126C361 22 432 210 602 67"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="10 12"
        />
        <path
          d="M100 206H494C520 206 542 191 552 168L577 111C581 101 574 90 563 90H462L423 45C413 34 398 28 383 28H249C232 28 216 36 206 50L171 99H95C82 99 73 111 77 124L96 190C99 199 109 206 100 206Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="202" cy="208" r="26" stroke="currentColor" strokeWidth="2" />
        <circle cx="478" cy="208" r="26" stroke="currentColor" strokeWidth="2" />
      </svg>

      <div className="relative z-10">
        <div className="mb-[clamp(1.25rem,4dvh,2.5rem)] inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs text-white/85 backdrop-blur">
          <MapPinned size={16} aria-hidden="true" />
          <span>حلول تشغيل فاخرة للسياحة والنقل</span>
        </div>
        <p className="mb-3 text-base font-semibold text-gold">الأنصاري للسياحة</p>
        <h1 id="brand-title" className="max-w-xl text-[clamp(2.125rem,4vw,3.625rem)] font-bold leading-tight">
          إدارة الأسطول والحجوزات
        </h1>
        <p className="mt-[clamp(1rem,2.5dvh,1.5rem)] max-w-xl text-[clamp(0.95rem,1.35vw,1.125rem)] leading-8 text-white/80 [@media(max-height:820px)]:leading-7">
          منصة متكاملة لإدارة الحجوزات والمركبات والسائقين بكفاءة واحترافية.
        </p>
      </div>

      <div className="relative z-10 grid gap-2.5 [@media(max-height:820px)]:gap-2">
        {features.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur [@media(max-height:820px)]:min-h-[3.5rem] [@media(max-height:820px)]:py-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold [@media(max-height:820px)]:h-9 [@media(max-height:820px)]:w-9">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="font-semibold text-white/90">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
  const isSubmitting = form.formState.isSubmitting;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[linear-gradient(135deg,#fbf7ee_0%,#f2eee3_46%,#eef5f2_100%)] px-4 py-4 text-ink sm:px-6 sm:py-5 lg:px-8 lg:py-6 [@media(max-height:820px)]:py-3">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(24,35,31,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(24,35,31,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative mx-auto grid min-h-0 w-full max-w-[1200px] items-start gap-5 lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(360px,0.85fr)_minmax(500px,1.15fr)] lg:items-center lg:gap-6 xl:gap-8 [@media(max-height:820px)]:lg:min-h-[calc(100dvh-1.5rem)] [@media(max-height:820px)]:gap-4">
        <BrandPanel />

        <section className="mx-auto flex w-full max-w-[460px] flex-col justify-center py-2 sm:py-4 lg:max-w-[480px] [@media(max-height:820px)]:py-0">
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-olive [@media(max-height:820px)]:mb-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 shadow-sm shadow-ink/5">
              <ShieldCheck size={16} className="text-sea" aria-hidden="true" />
              <span>وصول آمن للنظام</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-gold/10 px-3 py-1.5 text-gold sm:inline-flex">
              <Route size={16} aria-hidden="true" />
              <span>تشغيل يومي منظم</span>
            </div>
          </div>

          <form
            className="rounded-[1.5rem] border border-white/80 bg-white/90 p-[clamp(1.25rem,3vw,2.25rem)] shadow-2xl shadow-ink/10 backdrop-blur transition-shadow duration-300 [@media(max-height:820px)]:p-5"
            noValidate
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
            <div className="mb-5 flex items-start gap-3.5 [@media(max-height:820px)]:mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-gold shadow-lg shadow-ink/20 [@media(max-height:820px)]:h-11 [@media(max-height:820px)]:w-11">
                <LockKeyhole size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[clamp(1.5rem,2.2vw,2rem)] font-bold leading-tight text-ink">تسجيل الدخول</h2>
                <p className="mt-1.5 text-sm leading-6 text-olive">
                  أدخل بيانات حسابك للوصول إلى لوحة التحكم.
                </p>
              </div>
            </div>

            <div className="space-y-3 [@media(max-height:820px)]:space-y-2">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive"
                    size={20}
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    className="min-h-12 w-full rounded-2xl border border-olive/25 bg-white px-4 py-2.5 pr-12 text-left text-ink outline-none transition placeholder:text-olive/45 focus:border-sea focus:ring-4 focus:ring-sea/15 disabled:bg-paper"
                    dir="ltr"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@example.com"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby="email-error"
                    disabled={isSubmitting}
                    {...form.register("email")}
                  />
                </div>
                <p id="email-error" className="mt-1.5 min-h-5 text-sm font-medium leading-5 text-red-700">
                  {form.formState.errors.email?.message}
                </p>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
                  كلمة المرور
                </label>
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive"
                    size={20}
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    className="min-h-12 w-full rounded-2xl border border-olive/25 bg-white px-12 py-2.5 text-ink outline-none transition placeholder:text-olive/45 focus:border-sea focus:ring-4 focus:ring-sea/15 disabled:bg-paper"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="أدخل كلمة المرور"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby="password-error"
                    disabled={isSubmitting}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-olive transition hover:bg-paper hover:text-ink focus:outline-none focus:ring-4 focus:ring-sea/15"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      <EyeOff size={20} aria-hidden="true" />
                    ) : (
                      <Eye size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p id="password-error" className="mt-1.5 min-h-5 text-sm font-medium leading-5 text-red-700">
                  {form.formState.errors.password?.message}
                </p>
              </div>
            </div>

            <div className="mt-1 min-h-[48px]" role="status" aria-live="polite">
              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium leading-6 text-red-800">
                  <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-2.5 font-bold text-white shadow-lg shadow-ink/20 transition hover:bg-[#22312c] focus:outline-none focus:ring-4 focus:ring-gold/35 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin motion-reduce:animate-none" size={20} aria-hidden="true" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <CheckCircle2 size={20} aria-hidden="true" />
                </>
              )}
            </button>

            <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-olive [@media(max-height:820px)]:mt-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-sea" size={17} aria-hidden="true" />
              <span>بيانات الدخول محمية ويتم استخدامها للوصول الآمن إلى النظام.</span>
            </p>
          </form>

          <div className="mt-4 rounded-2xl border border-ink/10 bg-white/70 px-5 py-4 shadow-lg shadow-ink/5 backdrop-blur lg:hidden">
            <p className="text-sm font-semibold text-gold">الأنصاري للسياحة</p>
            <h1 className="mt-2 text-[clamp(1.5rem,5vw,2rem)] font-bold leading-snug text-ink">إدارة الأسطول والحجوزات</h1>
            <p className="mt-2 text-sm leading-7 text-olive">
              منصة متكاملة لإدارة الحجوزات والمركبات والسائقين بكفاءة واحترافية.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

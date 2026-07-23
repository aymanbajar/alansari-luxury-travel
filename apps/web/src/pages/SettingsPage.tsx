import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as settingsApi from "../features/settings/settings.api";

const schema = z.object({
  defaultDriverDailyRate: z.coerce.number().nonnegative("السعر الافتراضي لا يمكن أن يكون سالبا."),
  preTripBufferHours: z.coerce
    .number()
    .int("ساعات الهامش يجب أن تكون رقما صحيحا.")
    .min(0, "هامش ما قبل الرحلة لا يمكن أن يكون سالبا.")
    .max(168, "هامش ما قبل الرحلة كبير جدا."),
  postTripBufferHours: z.coerce
    .number()
    .int("ساعات الهامش يجب أن تكون رقما صحيحا.")
    .min(0, "هامش ما بعد الرحلة لا يمكن أن يكون سالبا.")
    .max(168, "هامش ما بعد الرحلة كبير جدا."),
  currency: z.string().min(3, "رمز العملة مطلوب.").max(3, "استخدم رمز عملة من ثلاثة أحرف."),
  timezone: z.string().min(3, "المنطقة الزمنية مطلوبة.")
});

type FormValues = z.infer<typeof schema>;

export function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      defaultDriverDailyRate: 250,
      preTripBufferHours: 12,
      postTripBufferHours: 12,
      currency: "SAR",
      timezone: "Asia/Riyadh"
    }
  });

  useEffect(() => {
    settingsApi
      .getOvernightSettings()
      .then((result) => {
        form.reset({
          defaultDriverDailyRate: Number(result.settings.defaultDriverDailyRate),
          preTripBufferHours: result.settings.preTripBufferHours,
          postTripBufferHours: result.settings.postTripBufferHours,
          currency: result.settings.currency,
          timezone: result.settings.timezone
        });
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "تعذر تحميل الإعدادات.");
      });
  }, [form]);

  async function submit(values: FormValues): Promise<void> {
    setMessage(null);
    setError(null);
    try {
      await settingsApi.updateOvernightSettings({
        ...values,
        currency: values.currency.toUpperCase(),
        timezone: values.timezone.trim()
      });
      setMessage("تم حفظ إعدادات المبيت بنجاح.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ الإعدادات.");
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">إعدادات النظام</h1>
        <p className="mt-1 text-olive">إعداد القيم الافتراضية للمبيت وفترة حجب الإتاحة.</p>
      </div>

      {message ? (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <form
        className="grid gap-4 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(submit)}
      >
        <label>
          <span className="mb-2 block text-sm font-medium">سعر المبيت الافتراضي للسائق</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            min="0"
            step="0.01"
            type="number"
            {...form.register("defaultDriverDailyRate")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.defaultDriverDailyRate?.message}
          </span>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">العملة الافتراضية</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2 uppercase"
            maxLength={3}
            {...form.register("currency")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.currency?.message}
          </span>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">هامش ما قبل رحلة المبيت بالساعات</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            min="0"
            type="number"
            {...form.register("preTripBufferHours")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.preTripBufferHours?.message}
          </span>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium">هامش ما بعد رحلة المبيت بالساعات</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            min="0"
            type="number"
            {...form.register("postTripBufferHours")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.postTripBufferHours?.message}
          </span>
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium">المنطقة الزمنية التشغيلية</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            {...form.register("timezone")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.timezone?.message}
          </span>
        </label>

        <div className="md:col-span-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-sea px-4 py-2 font-semibold text-white">
            <Save size={18} aria-hidden="true" />
            حفظ الإعدادات
          </button>
        </div>
      </form>
    </section>
  );
}

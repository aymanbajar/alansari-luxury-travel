import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3, Globe2, Loader2, Save, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ActionButton,
  ErrorAlert,
  fieldClasses,
  FormField,
  LoadingState,
  PageHeader,
  SectionCard,
  SuccessAlert
} from "../components/admin-ui";
import * as settingsApi from "../features/settings/settings.api";

const schema = z.object({
  defaultDriverDailyRate: z.coerce
    .number()
    .nonnegative("سعر المطار الافتراضي لا يمكن أن يكون سالبا."),
  preTripBufferHours: z.coerce
    .number()
    .int("ساعات الهامش يجب أن تكون رقما صحيحا.")
    .min(0, "الهامش قبل بداية الرحلة لا يمكن أن يكون سالبا.")
    .max(168, "الهامش قبل بداية الرحلة كبير جدا."),
  postTripBufferHours: z.coerce
    .number()
    .int("ساعات الهامش يجب أن تكون رقما صحيحا.")
    .min(0, "الهامش بعد نهاية الرحلة لا يمكن أن يكون سالبا.")
    .max(168, "الهامش بعد نهاية الرحلة كبير جدا."),
  currency: z
    .string()
    .min(3, "رمز العملة مطلوب.")
    .max(3, "استخدم رمز عملة من ثلاثة أحرف."),
  timezone: z.string().min(3, "المنطقة الزمنية الافتراضية مطلوبة.")
});

type FormValues = z.infer<typeof schema>;

const timezoneOptions = [
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Europe/Istanbul"
];

function normalizeSettings(values: FormValues): FormValues {
  return {
    ...values,
    currency: values.currency.toUpperCase().trim(),
    timezone: values.timezone.trim()
  };
}

export function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    let isMounted = true;

    settingsApi
      .getOvernightSettings()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        form.reset({
          defaultDriverDailyRate: Number(result.settings.defaultDriverDailyRate),
          preTripBufferHours: result.settings.preTripBufferHours,
          postTripBufferHours: result.settings.postTripBufferHours,
          currency: result.settings.currency,
          timezone: result.settings.timezone
        });
      })
      .catch(() => {
        if (isMounted) {
          setError("تعذر تحميل البيانات.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [form]);

  async function submit(values: FormValues): Promise<void> {
    const normalized = normalizeSettings(values);
    setMessage(null);
    setError(null);

    try {
      const result = await settingsApi.updateOvernightSettings(normalized);
      const savedValues = {
        defaultDriverDailyRate: Number(result.settings.defaultDriverDailyRate),
        preTripBufferHours: result.settings.preTripBufferHours,
        postTripBufferHours: result.settings.postTripBufferHours,
        currency: result.settings.currency,
        timezone: result.settings.timezone
      };
      form.reset(savedValues);
      setMessage("تم حفظ الإعدادات بنجاح.");
    } catch {
      setError("تعذر حفظ الإعدادات.");
    }
  }

  const isSaving = form.formState.isSubmitting;
  const isSaveDisabled = isLoading || isSaving || !form.formState.isDirty;
  const selectedTimezone = form.watch("timezone");
  const displayedTimezoneOptions = useMemo(
    () =>
      selectedTimezone && !timezoneOptions.includes(selectedTimezone)
        ? [selectedTimezone, ...timezoneOptions]
        : timezoneOptions,
    [selectedTimezone]
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title="إعدادات النظام"
        description="تحكم هذه الإعدادات قيم التسعير الافتراضية، وهوامش توقيت الحجوزات، والإعدادات الإقليمية المستخدمة في النظام."
        actions={
          <div className="flex items-center gap-3">
            {form.formState.isDirty ? (
              <span className="rounded-full bg-gold/10 px-3 py-2 text-sm font-bold text-gold">
                توجد تغييرات غير محفوظة
              </span>
            ) : null}
            <ActionButton
              type="submit"
              form="settings-form"
              isLoading={isSaving}
              disabled={isSaveDisabled}
            >
              {isSaving ? "جار الحفظ" : "حفظ التغييرات"}
              {!isSaving ? <Save size={18} aria-hidden="true" /> : null}
            </ActionButton>
          </div>
        }
      />

      {message ? <SuccessAlert message={message} /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      {isLoading ? (
        <LoadingState label="جاري تحميل إعدادات النظام..." />
      ) : (
        <form id="settings-form" className="space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
          <SectionCard
            title="التسعير"
            description="القيم المالية الافتراضية المستخدمة عند تجهيز الحجوزات والتكاليف."
            icon={<WalletCards size={21} aria-hidden="true" />}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <FormField
                id="defaultDriverDailyRate"
                label="سعر المطار الافتراضي"
                error={form.formState.errors.defaultDriverDailyRate?.message}
              >
                <div className="relative">
                  <input
                    id="defaultDriverDailyRate"
                    className={`${fieldClasses} pl-16 text-left`}
                    min="0"
                    step="0.01"
                    type="number"
                    aria-invalid={Boolean(form.formState.errors.defaultDriverDailyRate)}
                    aria-describedby="defaultDriverDailyRate-error"
                    {...form.register("defaultDriverDailyRate")}
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-olive">
                    SAR
                  </span>
                </div>
              </FormField>

              <FormField
                id="currency"
                label="العملة الافتراضية"
                error={form.formState.errors.currency?.message}
              >
                <select
                  id="currency"
                  className={fieldClasses}
                  aria-invalid={Boolean(form.formState.errors.currency)}
                  aria-describedby="currency-error"
                  {...form.register("currency")}
                >
                  <option value="SAR">SAR - ريال سعودي</option>
                  <option value="AED">AED - درهم إماراتي</option>
                  <option value="USD">USD - دولار أمريكي</option>
                </select>
              </FormField>
            </div>
          </SectionCard>

          <SectionCard
            title="توقيت الحجوزات"
            description="هوامش الحجز تمنع تضارب الرحلات وتترك وقتا كافيا للتحضير والتسليم."
            icon={<Clock3 size={21} aria-hidden="true" />}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <FormField
                id="preTripBufferHours"
                label="الهامش قبل بداية الرحلة"
                error={form.formState.errors.preTripBufferHours?.message}
              >
                <div className="relative">
                  <input
                    id="preTripBufferHours"
                    className={`${fieldClasses} pl-16 text-left`}
                    min="0"
                    type="number"
                    aria-invalid={Boolean(form.formState.errors.preTripBufferHours)}
                    aria-describedby="preTripBufferHours-error"
                    {...form.register("preTripBufferHours")}
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-olive">
                    ساعة
                  </span>
                </div>
              </FormField>

              <FormField
                id="postTripBufferHours"
                label="الهامش بعد نهاية الرحلة"
                error={form.formState.errors.postTripBufferHours?.message}
              >
                <div className="relative">
                  <input
                    id="postTripBufferHours"
                    className={`${fieldClasses} pl-16 text-left`}
                    min="0"
                    type="number"
                    aria-invalid={Boolean(form.formState.errors.postTripBufferHours)}
                    aria-describedby="postTripBufferHours-error"
                    {...form.register("postTripBufferHours")}
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-olive">
                    ساعة
                  </span>
                </div>
              </FormField>
            </div>
          </SectionCard>

          <SectionCard
            title="الإعدادات الإقليمية"
            description="تستخدم المنطقة الزمنية الافتراضية في عرض المواعيد والتقارير التشغيلية."
            icon={<Globe2 size={21} aria-hidden="true" />}
          >
            <div className="max-w-xl">
              <FormField
                id="timezone"
                label="المنطقة الزمنية الافتراضية"
                error={form.formState.errors.timezone?.message}
              >
                <select
                  id="timezone"
                  className={fieldClasses}
                  aria-invalid={Boolean(form.formState.errors.timezone)}
                  aria-describedby="timezone-error"
                  {...form.register("timezone")}
                >
                  {displayedTimezoneOptions.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <ActionButton
              type="submit"
              isLoading={isSaving}
              disabled={isSaveDisabled}
              className="sm:min-w-44"
            >
              {isSaving ? "جار الحفظ" : "حفظ التغييرات"}
              {!isSaving ? <Save size={18} aria-hidden="true" /> : null}
            </ActionButton>
            {isSaving ? (
              <span className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-olive">
                <Loader2 className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" />
                يتم حفظ القيم الحالية
              </span>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}

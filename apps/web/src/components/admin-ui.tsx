import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

function buttonClasses(variant: ButtonVariant): string {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

  if (variant === "primary") {
    return `${base} bg-ink text-white shadow-lg shadow-ink/10 hover:bg-[#22312c] focus:ring-gold/30`;
  }

  if (variant === "danger") {
    return `${base} bg-red-700 text-white shadow-lg shadow-red-700/10 hover:bg-red-800 focus:ring-red-200`;
  }

  if (variant === "ghost") {
    return `${base} text-olive hover:bg-olive/10 hover:text-ink focus:ring-sea/15`;
  }

  return `${base} border border-olive/20 bg-white text-ink shadow-sm shadow-ink/5 hover:border-olive/35 hover:bg-paper focus:ring-sea/15`;
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function ActionButton({
  children,
  className = "",
  isLoading = false,
  variant = "primary",
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={`${buttonClasses(variant)} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin motion-reduce:animate-none" size={18} /> : null}
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="max-w-3xl">
        <p className="mb-2 text-sm font-bold text-gold">لوحة الإدارة</p>
        <h1 className="text-3xl font-bold leading-tight text-ink">{title}</h1>
        <p className="mt-3 text-base leading-8 text-olive">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  description,
  icon,
  children,
  actions,
  className = ""
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-olive/15 bg-white p-5 shadow-sm shadow-ink/5 sm:p-6 ${className}`}
    >
      {title || description || actions ? (
        <div className="mb-5 flex flex-col gap-4 border-b border-olive/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            {icon ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                {icon}
              </div>
            ) : null}
            <div>
              {title ? <h2 className="text-xl font-bold leading-7 text-ink">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm leading-7 text-olive">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function FormField({
  id,
  label,
  error,
  hint,
  children
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-2 text-sm leading-6 text-olive">{hint}</p> : null}
      <p id={`${id}-error`} className="mt-2 min-h-6 text-sm font-semibold text-red-700">
        {error}
      </p>
    </div>
  );
}

export const fieldClasses =
  "min-h-12 w-full rounded-xl border border-olive/25 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-olive/45 focus:border-sea focus:ring-4 focus:ring-sea/15 disabled:bg-paper disabled:text-olive";

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-7 text-red-800">
      <AlertCircle className="mt-1 shrink-0" size={19} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-7 text-emerald-800">
      {message}
    </div>
  );
}

export function LoadingState({ label = "جاري تحميل البيانات..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-dashed border-olive/25 bg-paper/60 text-sm font-semibold text-olive">
      <Loader2 className="animate-spin motion-reduce:animate-none" size={20} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-olive/25 bg-paper/60 px-5 py-10 text-center">
      <Search className="mx-auto text-olive" size={28} aria-hidden="true" />
      <h3 className="mt-3 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-olive">{description}</p>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "إلغاء",
  variant = "primary",
  isOpen,
  isLoading,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  isOpen: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl shadow-ink/25">
        <h2 id="confirm-dialog-title" className="text-xl font-bold text-ink">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-olive">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ActionButton type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </ActionButton>
          <ActionButton type="button" variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Edit,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ActionButton,
  ConfirmDialog,
  EmptyState,
  ErrorAlert,
  fieldClasses,
  FormField,
  LoadingState,
  PageHeader,
  SectionCard,
  SuccessAlert
} from "../components/admin-ui";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../features/auth/useAuth";
import type { UserRole } from "../features/auth/types";
import * as usersApi from "../features/users/users.api";
import type { StaffUser } from "../features/users/users.api";

const passwordSchema = z
  .string()
  .min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل.")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير.")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير.")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم.");

const userFormSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب."),
  email: z.string().email("البريد الإلكتروني غير صحيح."),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().optional()
});

type UserFormValues = z.infer<typeof userFormSchema>;

type StatusAction = {
  user: StaffUser;
  nextIsActive: boolean;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "لم يسجل الدخول";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function friendlyUserError(fallback: string, caught: unknown): string {
  if (!(caught instanceof Error)) {
    return fallback;
  }

  const message = caught.message.toLowerCase();
  if (message.includes("email") || message.includes("unique") || message.includes("already")) {
    return "البريد الإلكتروني مستخدم مسبقا.";
  }

  if (message.includes("unauthorized") || message.includes("forbidden")) {
    return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
  }

  return fallback;
}

export function StaffManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { fullName: "", email: "", role: "STAFF", password: "" }
  });

  async function loadUsers(): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const result = await usersApi.listUsers();
      setUsers(result.users);
    } catch (caught) {
      setError(friendlyUserError("تعذر تحميل الموظفين.", caught));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!isFormOpen && !resetTarget && !statusAction) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsFormOpen(false);
        setResetTarget(null);
        setStatusAction(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen, resetTarget, statusAction]);

  function beginEdit(staffUser: StaffUser): void {
    setEditingUser(staffUser);
    setMessage(null);
    setError(null);
    setShowPassword(false);
    form.reset({
      fullName: staffUser.fullName,
      email: staffUser.email,
      role: staffUser.role,
      password: ""
    });
    setIsFormOpen(true);
  }

  function beginCreate(): void {
    setEditingUser(null);
    setMessage(null);
    setError(null);
    setShowPassword(false);
    form.reset({ fullName: "", email: "", role: "STAFF", password: "" });
    setIsFormOpen(true);
  }

  async function submit(values: UserFormValues): Promise<void> {
    setError(null);
    setMessage(null);

    try {
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, {
          fullName: values.fullName,
          email: values.email,
          role: values.role as UserRole
        });
        setMessage("تم حفظ بيانات الموظف بنجاح.");
      } else {
        const passwordResult = passwordSchema.safeParse(values.password);
        if (!passwordResult.success) {
          form.setError("password", {
            message: passwordResult.error.issues[0]?.message ?? "كلمة المرور غير صحيحة."
          });
          return;
        }

        await usersApi.createUser({
          fullName: values.fullName,
          email: values.email,
          role: values.role as UserRole,
          password: passwordResult.data
        });
        setMessage("تم إنشاء حساب الموظف بنجاح.");
      }

      setIsFormOpen(false);
      setEditingUser(null);
      form.reset({ fullName: "", email: "", role: "STAFF", password: "" });
      await loadUsers();
    } catch (caught) {
      setError(friendlyUserError("تعذر حفظ المستخدم.", caught));
    }
  }

  async function confirmStatusChange(): Promise<void> {
    if (!statusAction) {
      return;
    }

    setIsMutating(true);
    setError(null);
    setMessage(null);
    try {
      await usersApi.updateUserStatus(statusAction.user.id, statusAction.nextIsActive);
      setMessage(statusAction.nextIsActive ? "تم تفعيل الحساب بنجاح." : "تم تعطيل الحساب بنجاح.");
      setStatusAction(null);
      await loadUsers();
    } catch (caught) {
      setError(friendlyUserError("تعذر تحديث الحالة.", caught));
    } finally {
      setIsMutating(false);
    }
  }

  function openResetPassword(staffUser: StaffUser): void {
    setResetTarget(staffUser);
    setResetPasswordValue("");
    setResetPasswordError(null);
    setShowResetPassword(false);
  }

  async function submitResetPassword(): Promise<void> {
    if (!resetTarget) {
      return;
    }

    const parsed = passwordSchema.safeParse(resetPasswordValue);
    if (!parsed.success) {
      setResetPasswordError(parsed.error.issues[0]?.message ?? "كلمة المرور غير صحيحة.");
      return;
    }

    setIsMutating(true);
    setError(null);
    setMessage(null);
    try {
      await usersApi.resetPassword(resetTarget.id, parsed.data);
      setMessage("تمت إعادة تعيين كلمة المرور بنجاح.");
      setResetTarget(null);
      setResetPasswordValue("");
      await loadUsers();
    } catch (caught) {
      setError(friendlyUserError("تعذر إعادة تعيين كلمة المرور.", caught));
    } finally {
      setIsMutating(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((staffUser) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        staffUser.fullName.toLowerCase().includes(normalizedQuery) ||
        staffUser.email.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "ALL" || staffUser.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? staffUser.isActive : !staffUser.isActive);

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="إدارة الموظفين"
        description="إدارة حسابات الموظفين والصلاحيات وحالة الوصول إلى النظام."
        actions={
          <ActionButton type="button" onClick={beginCreate}>
            <Plus size={18} aria-hidden="true" />
            إضافة موظف جديد
          </ActionButton>
        }
      />

      {message ? <SuccessAlert message={message} /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      <SectionCard
        title="الحسابات"
        description="استعرض الموظفين، حدّث صلاحياتهم، وتحكم بحالة الوصول."
        icon={<ShieldCheck size={21} aria-hidden="true" />}
        actions={
          <ActionButton
            type="button"
            variant="secondary"
            isLoading={isLoading}
            onClick={() => void loadUsers()}
          >
            <RefreshCw size={17} aria-hidden="true" />
            تحديث
          </ActionButton>
        }
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-olive"
              size={18}
              aria-hidden="true"
            />
            <input
              className={`${fieldClasses} pr-11`}
              placeholder="ابحث بالاسم أو البريد الإلكتروني"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="البحث في الموظفين"
            />
          </div>
          <select
            className={fieldClasses}
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "ALL" | UserRole)}
            aria-label="تصفية حسب الدور"
          >
            <option value="ALL">كل الأدوار</option>
            <option value="ADMIN">مدير</option>
            <option value="STAFF">موظف</option>
          </select>
          <select
            className={fieldClasses}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "DISABLED")
            }
            aria-label="تصفية حسب الحالة"
          >
            <option value="ALL">كل الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="DISABLED">معطل</option>
          </select>
        </div>

        {isLoading ? (
          <LoadingState label="جاري تحميل حسابات الموظفين..." />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="لا توجد حسابات مطابقة"
            description="عدّل البحث أو المرشحات لعرض الموظفين المتاحين."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-olive/15 md:block">
              <table className="w-full min-w-[860px] text-right text-sm">
                <thead className="bg-paper text-ink">
                  <tr>
                    <th className="px-4 py-4 font-bold">الاسم</th>
                    <th className="px-4 py-4 font-bold">البريد الإلكتروني</th>
                    <th className="px-4 py-4 font-bold">الدور</th>
                    <th className="px-4 py-4 font-bold">الحالة</th>
                    <th className="px-4 py-4 font-bold">آخر تحديث</th>
                    <th className="px-4 py-4 font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive/10">
                  {filteredUsers.map((staffUser) => (
                    <tr className="transition hover:bg-paper/70" key={staffUser.id}>
                      <td className="px-4 py-4">
                        <p className="font-bold text-ink">{staffUser.fullName}</p>
                        {staffUser.id === currentUser?.id ? (
                          <p className="mt-1 text-xs font-semibold text-gold">حسابك الحالي</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-left" dir="ltr">
                        {staffUser.email}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={staffUser.role} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={staffUser.isActive ? "ACTIVE" : "DISABLED"} />
                      </td>
                      <td className="px-4 py-4 text-olive">{formatDate(staffUser.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            type="button"
                            variant="secondary"
                            className="h-11 w-11 px-0"
                            onClick={() => beginEdit(staffUser)}
                            aria-label={`تعديل ${staffUser.fullName}`}
                            title="تعديل"
                          >
                            <Edit size={17} aria-hidden="true" />
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant="secondary"
                            className="h-11 w-11 px-0"
                            onClick={() => openResetPassword(staffUser)}
                            aria-label={`إعادة تعيين كلمة مرور ${staffUser.fullName}`}
                            title="إعادة تعيين كلمة المرور"
                          >
                            <KeyRound size={17} aria-hidden="true" />
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant={staffUser.isActive ? "danger" : "secondary"}
                            disabled={staffUser.id === currentUser?.id}
                            onClick={() =>
                              setStatusAction({
                                user: staffUser,
                                nextIsActive: !staffUser.isActive
                              })
                            }
                            aria-label={
                              staffUser.isActive
                                ? `تعطيل ${staffUser.fullName}`
                                : `تفعيل ${staffUser.fullName}`
                            }
                            title={staffUser.isActive ? "تعطيل" : "تفعيل"}
                          >
                            {staffUser.isActive ? (
                              <UserX size={17} aria-hidden="true" />
                            ) : (
                              <UserCheck size={17} aria-hidden="true" />
                            )}
                            <span className="hidden xl:inline">
                              {staffUser.isActive ? "تعطيل" : "تفعيل"}
                            </span>
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {filteredUsers.map((staffUser) => (
                <article
                  key={staffUser.id}
                  className="rounded-2xl border border-olive/15 bg-paper/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink">{staffUser.fullName}</h3>
                      <p className="mt-1 break-all text-left text-sm text-olive" dir="ltr">
                        {staffUser.email}
                      </p>
                    </div>
                    <StatusBadge status={staffUser.isActive ? "ACTIVE" : "DISABLED"} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusBadge status={staffUser.role} />
                    <span className="text-xs font-semibold text-olive">
                      آخر تحديث: {formatDate(staffUser.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      className="px-2"
                      onClick={() => beginEdit(staffUser)}
                      aria-label={`تعديل ${staffUser.fullName}`}
                    >
                      <Edit size={17} aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="secondary"
                      className="px-2"
                      onClick={() => openResetPassword(staffUser)}
                      aria-label={`إعادة تعيين كلمة مرور ${staffUser.fullName}`}
                    >
                      <KeyRound size={17} aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant={staffUser.isActive ? "danger" : "secondary"}
                      className="px-2"
                      disabled={staffUser.id === currentUser?.id}
                      onClick={() =>
                        setStatusAction({
                          user: staffUser,
                          nextIsActive: !staffUser.isActive
                        })
                      }
                      aria-label={
                        staffUser.isActive
                          ? `تعطيل ${staffUser.fullName}`
                          : `تفعيل ${staffUser.fullName}`
                      }
                    >
                      {staffUser.isActive ? (
                        <UserX size={17} aria-hidden="true" />
                      ) : (
                        <UserCheck size={17} aria-hidden="true" />
                      )}
                    </ActionButton>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4 py-6 backdrop-blur-sm">
          <button
            className="absolute inset-0 h-full w-full"
            aria-label="إغلاق نموذج الموظف"
            onClick={() => setIsFormOpen(false)}
          />
          <form
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/70 bg-white p-5 shadow-2xl shadow-ink/25 sm:p-6"
            noValidate
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-form-title"
            onSubmit={form.handleSubmit(submit)}
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-olive/10 pb-4">
              <div>
                <h2 id="staff-form-title" className="text-2xl font-bold text-ink">
                  {editingUser ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-olive">
                  {editingUser
                    ? "حدّث بيانات الحساب والدور بدون تغيير كلمة المرور."
                    : "أنشئ حسابا جديدا باستخدام الدور وكلمة المرور المؤقتة."}
                </p>
              </div>
              <ActionButton
                type="button"
                variant="ghost"
                className="h-11 w-11 px-0"
                aria-label="إغلاق"
                onClick={() => setIsFormOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </ActionButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                id="fullName"
                label="الاسم الكامل"
                error={form.formState.errors.fullName?.message}
              >
                <input
                  id="fullName"
                  className={fieldClasses}
                  placeholder="مثال: أحمد محمد"
                  aria-invalid={Boolean(form.formState.errors.fullName)}
                  aria-describedby="fullName-error"
                  {...form.register("fullName")}
                />
              </FormField>

              <FormField
                id="email"
                label="البريد الإلكتروني"
                error={form.formState.errors.email?.message}
              >
                <input
                  id="email"
                  className={`${fieldClasses} text-left`}
                  dir="ltr"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  aria-describedby="email-error"
                  {...form.register("email")}
                />
              </FormField>

              <FormField id="role" label="الدور">
                <select id="role" className={fieldClasses} {...form.register("role")}>
                  <option value="STAFF">موظف</option>
                  <option value="ADMIN">مدير</option>
                </select>
              </FormField>

              {!editingUser ? (
                <FormField
                  id="password"
                  label="كلمة المرور المؤقتة"
                  error={form.formState.errors.password?.message}
                >
                  <div className="relative">
                    <input
                      id="password"
                      className={`${fieldClasses} pl-12`}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="TempPass123"
                      aria-invalid={Boolean(form.formState.errors.password)}
                      aria-describedby="password-error"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-olive transition hover:bg-paper hover:text-ink focus:outline-none focus:ring-4 focus:ring-sea/15"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? (
                        <EyeOff size={18} aria-hidden="true" />
                      ) : (
                        <Eye size={18} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormField>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => setIsFormOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                إلغاء
              </ActionButton>
              <ActionButton type="submit" isLoading={form.formState.isSubmitting}>
                {editingUser ? "حفظ التعديل" : "إنشاء الحساب"}
              </ActionButton>
            </div>
          </form>
        </div>
      ) : null}

      {resetTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4 py-6 backdrop-blur-sm">
          <button
            className="absolute inset-0 h-full w-full"
            aria-label="إغلاق إعادة تعيين كلمة المرور"
            onClick={() => setResetTarget(null)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl shadow-ink/25"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-title"
          >
            <h2 id="reset-password-title" className="text-xl font-bold text-ink">
              إعادة تعيين كلمة المرور
            </h2>
            <p className="mt-2 text-sm leading-7 text-olive">
              أدخل كلمة مرور مؤقتة جديدة لحساب {resetTarget.fullName}.
            </p>
            <div className="mt-5">
              <FormField id="resetPassword" label="كلمة المرور الجديدة" error={resetPasswordError ?? undefined}>
                <div className="relative">
                  <input
                    id="resetPassword"
                    className={`${fieldClasses} pl-12`}
                    type={showResetPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={resetPasswordValue}
                    onChange={(event) => {
                      setResetPasswordValue(event.target.value);
                      setResetPasswordError(null);
                    }}
                    aria-invalid={Boolean(resetPasswordError)}
                    aria-describedby="resetPassword-error"
                  />
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-olive transition hover:bg-paper hover:text-ink focus:outline-none focus:ring-4 focus:ring-sea/15"
                    onClick={() => setShowResetPassword((value) => !value)}
                    aria-label={showResetPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showResetPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => setResetTarget(null)}
                disabled={isMutating}
              >
                إلغاء
              </ActionButton>
              <ActionButton type="button" isLoading={isMutating} onClick={() => void submitResetPassword()}>
                إعادة التعيين
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(statusAction)}
        isLoading={isMutating}
        title={statusAction?.nextIsActive ? "تفعيل الحساب" : "تعطيل الحساب"}
        description={
          statusAction
            ? statusAction.nextIsActive
              ? `سيتم السماح للمستخدم ${statusAction.user.fullName} بالوصول إلى النظام.`
              : `سيتم منع المستخدم ${statusAction.user.fullName} من الوصول إلى النظام.`
            : ""
        }
        confirmLabel={statusAction?.nextIsActive ? "تفعيل الحساب" : "تعطيل الحساب"}
        variant={statusAction?.nextIsActive ? "primary" : "danger"}
        onCancel={() => setStatusAction(null)}
        onConfirm={() => void confirmStatusChange()}
      />
    </section>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, KeyRound, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

export function StaffManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { fullName: "", email: "", role: "STAFF", password: "" }
  });

  async function loadUsers(): Promise<void> {
    setIsLoading(true);
    try {
      const result = await usersApi.listUsers();
      setUsers(result.users);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل الموظفين.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function beginEdit(staffUser: StaffUser): void {
    setEditingUser(staffUser);
    form.reset({
      fullName: staffUser.fullName,
      email: staffUser.email,
      role: staffUser.role,
      password: ""
    });
  }

  function beginCreate(): void {
    setEditingUser(null);
    form.reset({ fullName: "", email: "", role: "STAFF", password: "" });
  }

  async function submit(values: UserFormValues): Promise<void> {
    setError(null);

    try {
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, {
          fullName: values.fullName,
          email: values.email,
          role: values.role as UserRole
        });
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
      }

      beginCreate();
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ المستخدم.");
    }
  }

  async function resetUserPassword(staffUser: StaffUser): Promise<void> {
    const newPassword = window.prompt("أدخل كلمة المرور الجديدة المؤقتة");
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "كلمة المرور غير صحيحة.");
      return;
    }

    await usersApi.resetPassword(staffUser.id, parsed.data);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">إدارة الموظفين</h1>
          <p className="mt-2 text-olive">إدارة حسابات المديرين والموظفين.</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-semibold text-white"
          onClick={beginCreate}
        >
          <Plus size={18} aria-hidden="true" />
          حساب جديد
        </button>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <form
        className="grid gap-4 rounded-lg border border-olive/20 bg-white p-5 md:grid-cols-2"
        onSubmit={form.handleSubmit(submit)}
      >
        <label>
          <span className="mb-2 block text-sm font-medium">الاسم الكامل</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-3"
            {...form.register("fullName")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.fullName?.message}
          </span>
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium">البريد الإلكتروني</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-3"
            {...form.register("email")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.email?.message}
          </span>
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium">الدور</span>
          <select
            className="w-full rounded-md border border-olive/30 px-3 py-3"
            {...form.register("role")}
          >
            <option value="STAFF">موظف</option>
            <option value="ADMIN">مدير</option>
          </select>
        </label>
        {!editingUser ? (
          <label>
            <span className="mb-2 block text-sm font-medium">كلمة المرور المؤقتة</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-3"
              type="password"
              {...form.register("password")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.password?.message}
            </span>
          </label>
        ) : null}
        <div className="md:col-span-2">
          <button
            className="rounded-md bg-sea px-4 py-3 font-semibold text-white"
            disabled={form.formState.isSubmitting}
          >
            {editingUser ? "حفظ التعديل" : "إنشاء الحساب"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-olive/20 bg-white">
        <div className="flex items-center justify-between border-b border-olive/20 p-4">
          <h2 className="font-bold">الحسابات</h2>
          <button
            className="flex items-center gap-2 text-sm text-sea"
            onClick={() => void loadUsers()}
          >
            <RefreshCw size={16} aria-hidden="true" />
            تحديث
          </button>
        </div>
        {isLoading ? <p className="p-4 text-olive">جاري التحميل...</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead className="bg-olive/10">
              <tr>
                <th className="p-3">الاسم</th>
                <th className="p-3">البريد</th>
                <th className="p-3">الدور</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((staffUser) => (
                <tr className="border-t border-olive/10" key={staffUser.id}>
                  <td className="p-3">{staffUser.fullName}</td>
                  <td className="p-3">{staffUser.email}</td>
                  <td className="p-3">{staffUser.role === "ADMIN" ? "مدير" : "موظف"}</td>
                  <td className="p-3">{staffUser.isActive ? "نشط" : "معطل"}</td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <button
                      className="rounded-md border border-olive/30 p-2"
                      onClick={() => beginEdit(staffUser)}
                      title="تعديل"
                    >
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-md border border-olive/30 p-2"
                      onClick={() => void resetUserPassword(staffUser)}
                      title="إعادة تعيين كلمة المرور"
                    >
                      <KeyRound size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-md border border-olive/30 px-3 py-2 disabled:opacity-50"
                      disabled={staffUser.id === currentUser?.id}
                      onClick={() =>
                        void usersApi
                          .updateUserStatus(staffUser.id, !staffUser.isActive)
                          .then(loadUsers)
                          .catch((caught: unknown) =>
                            setError(
                              caught instanceof Error ? caught.message : "تعذر تحديث الحالة."
                            )
                          )
                      }
                    >
                      {staffUser.isActive ? "تعطيل" : "تفعيل"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../features/auth/useAuth";
import * as driversApi from "../features/fleet/drivers.api";
import type { DriverQuery } from "../features/fleet/drivers.api";
import type { Driver, DriverStatus } from "../features/fleet/fleet.types";

const schema = z.object({
  fullName: z.string().min(2, "اسم السائق مطلوب."),
  phoneNumber: z.string().regex(/^\+?[0-9\s-]{7,40}$/, "رقم الهاتف غير صحيح."),
  overnightDailyRate: z.coerce.number().min(0, "بدل المبيت لا يمكن أن يكون سالباً."),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;
const statuses: Array<DriverStatus | ""> = ["", "AVAILABLE", "ASSIGNED", "ON_LEAVE", "INACTIVE"];

export function DriversPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [query, setQuery] = useState<DriverQuery>({
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
    status: ""
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await driversApi.listDrivers(query);
      setDrivers(result.drivers);
      setTotalPages(Math.max(result.pagination.pageCount, 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل السائقين.");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(driver: Driver): void {
    setEditing(driver);
    form.reset({
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      overnightDailyRate: Number(driver.overnightDailyRate),
      notes: driver.notes ?? ""
    });
  }

  async function submit(values: FormValues): Promise<void> {
    try {
      if (editing) {
        await driversApi.updateDriver(editing.id, values);
      } else {
        await driversApi.createDriver(values);
      }
      setEditing(null);
      form.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ السائق.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">السائقون</h1>
          <p className="mt-1 text-olive">إدارة السائقين وبدل المبيت وحالة الجاهزية للتكليف.</p>
        </div>
        {isAdmin ? (
          <button
            className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-semibold text-white"
            onClick={() => {
              setEditing(null);
              form.reset();
            }}
          >
            <Plus size={18} aria-hidden="true" />
            سائق جديد
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-5">
        <input
          className="rounded-md border border-olive/30 px-3 py-2 md:col-span-2"
          placeholder="بحث بالاسم أو رقم الهاتف"
          onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })}
        />
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.status}
          onChange={(event) =>
            setQuery({ ...query, status: event.target.value as DriverStatus | "", page: 1 })
          }
        >
          {statuses.map((status) => (
            <option key={status || "all"} value={status}>
              {status || "كل الحالات"}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.sortBy}
          onChange={(event) =>
            setQuery({ ...query, sortBy: event.target.value as DriverQuery["sortBy"] })
          }
        >
          <option value="createdAt">تاريخ الإنشاء</option>
          <option value="fullName">الاسم</option>
          <option value="status">الحالة</option>
        </select>
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.sortDirection}
          onChange={(event) =>
            setQuery({
              ...query,
              sortDirection: event.target.value as DriverQuery["sortDirection"]
            })
          }
        >
          <option value="desc">تنازلي</option>
          <option value="asc">تصاعدي</option>
        </select>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {isAdmin ? (
        <form
          className="grid gap-4 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-3"
          onSubmit={form.handleSubmit(submit)}
        >
          <label>
            <span className="mb-2 block text-sm font-medium">الاسم الكامل</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              {...form.register("fullName")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.fullName?.message}
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium">رقم الهاتف</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              {...form.register("phoneNumber")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.phoneNumber?.message}
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium">بدل المبيت اليومي</span>
            <input
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              step="0.01"
              type="number"
              {...form.register("overnightDailyRate")}
            />
            <span className="mt-1 block min-h-5 text-sm text-red-700">
              {form.formState.errors.overnightDailyRate?.message}
            </span>
          </label>
          <label className="md:col-span-3">
            <span className="mb-2 block text-sm font-medium">ملاحظات</span>
            <textarea
              className="w-full rounded-md border border-olive/30 px-3 py-2"
              rows={2}
              {...form.register("notes")}
            />
          </label>
          <div className="md:col-span-3">
            <button className="rounded-md bg-sea px-4 py-2 font-semibold text-white">
              {editing ? "حفظ التعديل" : "إضافة السائق"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-olive/20 bg-white">
        {isLoading ? <p className="p-4 text-olive">جاري التحميل...</p> : null}
        {!isLoading && drivers.length === 0 ? (
          <p className="p-4 text-olive">لا يوجد سائقون مطابقون.</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-olive/10">
              <tr>
                <th className="p-3">الاسم</th>
                <th className="p-3">الهاتف</th>
                <th className="p-3">بدل المبيت</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">الإتاحة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr className="border-t border-olive/10" key={driver.id}>
                  <td className="p-3 font-semibold">{driver.fullName}</td>
                  <td className="p-3">{driver.phoneNumber}</td>
                  <td className="p-3">{driver.overnightDailyRate}</td>
                  <td className="p-3">
                    <StatusBadge status={driver.status} />
                  </td>
                  <td className="p-3">
                    {driver.availability.assignableForFutureBookings
                      ? "قابل للتكليف"
                      : "غير قابل للتكليف"}
                  </td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <button
                      className="rounded-md border border-olive/30 px-3 py-2"
                      onClick={() => setSelected(driver)}
                    >
                      تفاصيل
                    </button>
                    {isAdmin ? (
                      <button
                        className="rounded-md border border-olive/30 p-2"
                        onClick={() => edit(driver)}
                      >
                        <Edit size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    {isAdmin ? (
                      <select
                        className="rounded-md border border-olive/30 px-2"
                        value={driver.status}
                        onChange={(event) =>
                          void driversApi
                            .updateDriverStatus(driver.id, event.target.value as DriverStatus)
                            .then(load)
                            .catch((caught: unknown) =>
                              setError(
                                caught instanceof Error ? caught.message : "تعذر تغيير الحالة."
                              )
                            )
                        }
                      >
                        {statuses.filter(Boolean).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {isAdmin ? (
                      <button
                        className="rounded-md border border-red-200 p-2 text-red-700"
                        onClick={() =>
                          window.confirm("هل تريد حذف السائق؟") &&
                          void driversApi.deleteDriver(driver.id).then(load)
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md border border-olive/30 px-3 py-2 disabled:opacity-50"
          disabled={query.page <= 1}
          onClick={() => setQuery({ ...query, page: query.page - 1 })}
        >
          السابق
        </button>
        <span className="text-sm text-olive">
          صفحة {query.page} من {totalPages}
        </span>
        <button
          className="rounded-md border border-olive/30 px-3 py-2 disabled:opacity-50"
          disabled={query.page >= totalPages}
          onClick={() => setQuery({ ...query, page: query.page + 1 })}
        >
          التالي
        </button>
      </div>

      {selected ? (
        <div className="rounded-lg border border-olive/20 bg-white p-4">
          <h2 className="font-bold">تفاصيل السائق</h2>
          <p className="mt-2 text-olive">
            {selected.fullName} - {selected.phoneNumber}
          </p>
          <p className="mt-1 text-olive">{selected.notes || "لا توجد ملاحظات."}</p>
        </div>
      ) : null}
    </section>
  );
}

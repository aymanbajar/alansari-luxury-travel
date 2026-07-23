import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../features/auth/useAuth";
import type { Vehicle, VehicleStatus } from "../features/fleet/fleet.types";
import * as vehiclesApi from "../features/fleet/vehicles.api";
import type { VehicleQuery } from "../features/fleet/vehicles.api";

const schema = z.object({
  plateNumber: z.string().min(1, "رقم اللوحة مطلوب."),
  make: z.string().min(1, "الشركة المصنعة مطلوبة."),
  model: z.string().min(1, "الطراز مطلوب."),
  year: z.coerce.number().int().min(1990).max(2100),
  passengerCapacity: z.coerce.number().int().positive("السعة يجب أن تكون رقماً موجباً."),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

const statuses: Array<VehicleStatus | ""> = [
  "",
  "AVAILABLE",
  "BOOKED",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
  "INACTIVE"
];

export function VehiclesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [query, setQuery] = useState<VehicleQuery>({
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
    status: ""
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await vehiclesApi.listVehicles(query);
      setVehicles(result.vehicles);
      setTotalPages(Math.max(result.pagination.pageCount, 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل المركبات.");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(vehicle: Vehicle): void {
    setEditing(vehicle);
    form.reset({
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      passengerCapacity: vehicle.passengerCapacity,
      notes: vehicle.notes ?? ""
    });
  }

  async function submit(values: FormValues): Promise<void> {
    try {
      if (editing) {
        await vehiclesApi.updateVehicle(editing.id, values);
      } else {
        await vehiclesApi.createVehicle(values);
      }
      setEditing(null);
      form.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ المركبة.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">المركبات</h1>
          <p className="mt-1 text-olive">إدارة الأسطول وحالة جاهزية المركبات للحجوزات القادمة.</p>
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
            مركبة جديدة
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-5">
        <input
          className="rounded-md border border-olive/30 px-3 py-2 md:col-span-2"
          placeholder="بحث باللوحة أو الشركة أو الطراز"
          onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })}
        />
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.status}
          onChange={(event) =>
            setQuery({ ...query, status: event.target.value as VehicleStatus | "", page: 1 })
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
            setQuery({ ...query, sortBy: event.target.value as VehicleQuery["sortBy"] })
          }
        >
          <option value="createdAt">تاريخ الإنشاء</option>
          <option value="plateNumber">رقم اللوحة</option>
          <option value="status">الحالة</option>
        </select>
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.sortDirection}
          onChange={(event) =>
            setQuery({
              ...query,
              sortDirection: event.target.value as VehicleQuery["sortDirection"]
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
          {(["plateNumber", "make", "model", "year", "passengerCapacity"] as const).map((field) => (
            <label key={field}>
              <span className="mb-2 block text-sm font-medium">
                {field === "plateNumber"
                  ? "رقم اللوحة"
                  : field === "make"
                    ? "الشركة"
                    : field === "model"
                      ? "الطراز"
                      : field === "year"
                        ? "السنة"
                        : "سعة الركاب"}
              </span>
              <input
                className="w-full rounded-md border border-olive/30 px-3 py-2"
                {...form.register(field)}
              />
              <span className="mt-1 block min-h-5 text-sm text-red-700">
                {form.formState.errors[field]?.message}
              </span>
            </label>
          ))}
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
              {editing ? "حفظ التعديل" : "إضافة المركبة"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-olive/20 bg-white">
        {isLoading ? <p className="p-4 text-olive">جاري التحميل...</p> : null}
        {!isLoading && vehicles.length === 0 ? (
          <p className="p-4 text-olive">لا توجد مركبات مطابقة.</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-olive/10">
              <tr>
                <th className="p-3">اللوحة</th>
                <th className="p-3">المركبة</th>
                <th className="p-3">السعة</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">الإتاحة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr className="border-t border-olive/10" key={vehicle.id}>
                  <td className="p-3 font-semibold">{vehicle.plateNumber}</td>
                  <td className="p-3">
                    {vehicle.make} {vehicle.model} - {vehicle.year}
                  </td>
                  <td className="p-3">{vehicle.passengerCapacity}</td>
                  <td className="p-3">
                    <StatusBadge status={vehicle.status} />
                  </td>
                  <td className="p-3">
                    {vehicle.availability.selectableForFutureBookings
                      ? "قابلة للاختيار"
                      : "غير قابلة للاختيار"}
                  </td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <button
                      className="rounded-md border border-olive/30 px-3 py-2"
                      onClick={() => setSelected(vehicle)}
                    >
                      تفاصيل
                    </button>
                    {isAdmin ? (
                      <button
                        className="rounded-md border border-olive/30 p-2"
                        onClick={() => edit(vehicle)}
                      >
                        <Edit size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    {isAdmin ? (
                      <select
                        className="rounded-md border border-olive/30 px-2"
                        value={vehicle.status}
                        onChange={(event) =>
                          void vehiclesApi
                            .updateVehicleStatus(vehicle.id, event.target.value as VehicleStatus)
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
                          window.confirm("هل تريد حذف المركبة؟") &&
                          void vehiclesApi.deleteVehicle(vehicle.id).then(load)
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
          <h2 className="font-bold">تفاصيل المركبة</h2>
          <p className="mt-2 text-olive">
            {selected.plateNumber} - {selected.make} {selected.model}
          </p>
          <p className="mt-1 text-olive">{selected.notes || "لا توجد ملاحظات."}</p>
        </div>
      ) : null}
    </section>
  );
}

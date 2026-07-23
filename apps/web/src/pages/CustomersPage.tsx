import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { StatusBadge } from "../components/StatusBadge";
import type {
  Customer,
  CustomerBookingHistoryItem,
  CustomerQuery
} from "../features/customers/customers.api";
import * as customersApi from "../features/customers/customers.api";

const schema = z.object({
  fullName: z.string().min(2, "اسم العميل مطلوب."),
  phoneCountryCode: z.string().min(1, "مفتاح الدولة مطلوب.").max(8),
  phoneNumber: z.string().min(5, "رقم الهاتف غير صالح."),
  nationality: z.string().optional(),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

const dateFormatter = new Intl.DateTimeFormat("ar", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function CustomersPage() {
  const [query, setQuery] = useState<CustomerQuery>({
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortDirection: "desc"
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [history, setHistory] = useState<CustomerBookingHistoryItem[]>([]);
  const [possibleMatches, setPossibleMatches] = useState<Customer[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await customersApi.listCustomers(query);
      setCustomers(result.customers);
      setTotalPages(Math.max(result.pagination.pageCount, 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل العملاء.");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectCustomer(customer: Customer): Promise<void> {
    setSelected(customer);
    try {
      const result = await customersApi.listCustomerBookings(customer.id);
      setHistory(result.bookings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل تاريخ الحجوزات.");
    }
  }

  function edit(customer: Customer): void {
    setEditing(customer);
    setPossibleMatches([]);
    form.reset({
      fullName: customer.fullName,
      phoneCountryCode: customer.phoneCountryCode,
      phoneNumber: customer.phoneNumber,
      nationality: customer.nationality ?? "",
      notes: customer.notes ?? ""
    });
  }

  async function submit(values: FormValues): Promise<void> {
    try {
      const result = editing
        ? await customersApi.updateCustomer(editing.id, values)
        : await customersApi.createCustomer(values);
      setPossibleMatches(result.possibleMatches);
      setEditing(null);
      form.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ العميل.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">العملاء</h1>
          <p className="mt-1 text-olive">
            إدارة بيانات العملاء وأرقام التواصل وتاريخ الحجوزات المرتبط بكل عميل.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-semibold text-white"
          onClick={() => {
            setEditing(null);
            setPossibleMatches([]);
            form.reset();
          }}
        >
          <Plus size={18} aria-hidden="true" />
          عميل جديد
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-4">
        <input
          className="rounded-md border border-olive/30 px-3 py-2 md:col-span-2"
          placeholder="بحث بالاسم أو رقم الهاتف"
          onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })}
        />
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.sortBy}
          onChange={(event) =>
            setQuery({ ...query, sortBy: event.target.value as CustomerQuery["sortBy"] })
          }
        >
          <option value="createdAt">تاريخ الإنشاء</option>
          <option value="fullName">اسم العميل</option>
        </select>
        <select
          className="rounded-md border border-olive/30 px-3 py-2"
          value={query.sortDirection}
          onChange={(event) =>
            setQuery({
              ...query,
              sortDirection: event.target.value as CustomerQuery["sortDirection"]
            })
          }
        >
          <option value="desc">تنازلي</option>
          <option value="asc">تصاعدي</option>
        </select>
      </div>

      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <form
        className="grid gap-4 rounded-lg border border-olive/20 bg-white p-4 md:grid-cols-4"
        onSubmit={form.handleSubmit(submit)}
      >
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium">اسم العميل</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            {...form.register("fullName")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.fullName?.message}
          </span>
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium">مفتاح الدولة</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            {...form.register("phoneCountryCode")}
          />
          <span className="mt-1 block min-h-5 text-sm text-red-700">
            {form.formState.errors.phoneCountryCode?.message}
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
          <span className="mb-2 block text-sm font-medium">الجنسية</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            {...form.register("nationality")}
          />
        </label>
        <label className="md:col-span-3">
          <span className="mb-2 block text-sm font-medium">ملاحظات</span>
          <input
            className="w-full rounded-md border border-olive/30 px-3 py-2"
            {...form.register("notes")}
          />
        </label>
        <div className="flex items-end gap-2">
          <button className="rounded-md bg-sea px-4 py-2 font-semibold text-white">
            {editing ? "حفظ التعديل" : "إضافة العميل"}
          </button>
          {editing ? (
            <button
              type="button"
              className="rounded-md border border-olive/30 px-4 py-2"
              onClick={() => {
                setEditing(null);
                form.reset();
              }}
            >
              إلغاء
            </button>
          ) : null}
        </div>
      </form>

      {possibleMatches.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          تم العثور على عملاء محتملين بنفس رقم الهاتف:{" "}
          {possibleMatches.map((match) => match.fullName).join("، ")}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-olive/20 bg-white">
        {isLoading ? <p className="p-4 text-olive">جاري التحميل...</p> : null}
        {!isLoading && customers.length === 0 ? (
          <p className="p-4 text-olive">لا توجد نتائج مطابقة.</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-olive/10">
              <tr>
                <th className="p-3">الاسم</th>
                <th className="p-3">الهاتف</th>
                <th className="p-3">الجنسية</th>
                <th className="p-3">تاريخ الإنشاء</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr className="border-t border-olive/10" key={customer.id}>
                  <td className="p-3 font-semibold">{customer.fullName}</td>
                  <td className="p-3" dir="ltr">
                    {customer.phoneCountryCode} {customer.phoneNumber}
                  </td>
                  <td className="p-3">{customer.nationality || "-"}</td>
                  <td className="p-3">{dateFormatter.format(new Date(customer.createdAt))}</td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <button
                      className="rounded-md border border-olive/30 px-3 py-2"
                      onClick={() => void selectCustomer(customer)}
                    >
                      تفاصيل
                    </button>
                    <button
                      className="rounded-md border border-olive/30 p-2"
                      onClick={() => edit(customer)}
                    >
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="rounded-md border border-red-200 p-2 text-red-700"
                      onClick={() =>
                        window.confirm("هل تريد حذف العميل؟") &&
                        void customersApi.deleteCustomer(customer.id).then(load)
                      }
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
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
          <h2 className="font-bold">تفاصيل العميل</h2>
          <p className="mt-2 text-olive">{selected.notes || "لا توجد ملاحظات."}</p>
          <h3 className="mt-4 font-semibold">تاريخ الحجوزات</h3>
          {history.length === 0 ? (
            <p className="mt-2 text-olive">لا توجد حجوزات لهذا العميل.</p>
          ) : null}
          <div className="mt-3 grid gap-2">
            {history.map((booking) => (
              <div className="rounded-md border border-olive/20 p-3" key={booking.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{booking.voucherNumber}</span>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="mt-1 text-sm text-olive">
                  {booking.destination} - {dateFormatter.format(new Date(booking.startAt))}
                </p>
                <p className="text-sm text-olive">
                  {booking.vehicle.plateNumber} - {booking.driver.fullName}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

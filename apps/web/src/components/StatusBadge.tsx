const labels: Record<string, string> = {
  AVAILABLE: "متاح",
  BOOKED: "محجوز",
  MAINTENANCE: "صيانة",
  OUT_OF_SERVICE: "خارج الخدمة",
  INACTIVE: "غير نشط",
  ASSIGNED: "مكلف",
  ON_LEAVE: "إجازة",
  DRAFT: "مسودة",
  CONFIRMED: "مؤكد",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
  ADMIN: "مدير",
  STAFF: "موظف",
  ACTIVE: "نشط",
  DISABLED: "معطل"
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "AVAILABLE" ||
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "INACTIVE" || status === "OUT_OF_SERVICE" || status === "CANCELLED" || status === "DISABLED"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "ADMIN"
          ? "border-gold/30 bg-gold/10 text-[#8a622c]"
          : "border-sea/20 bg-sea/10 text-sea";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold leading-5 ${tone}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

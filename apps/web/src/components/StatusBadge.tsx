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
  CANCELLED: "ملغي"
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "AVAILABLE" || status === "CONFIRMED" || status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "INACTIVE" || status === "OUT_OF_SERVICE" || status === "CANCELLED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {labels[status] ?? status}
    </span>
  );
}

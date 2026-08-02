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

function badgeTone(status: string): string {
  if (status === "COMPLETED" || status === "AVAILABLE" || status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "CONFIRMED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "DRAFT" || status === "IN_PROGRESS" || status === "BOOKED" || status === "ASSIGNED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "INACTIVE" || status === "OUT_OF_SERVICE" || status === "CANCELLED" || status === "DISABLED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "ADMIN") {
    return "border-gold/30 bg-gold/10 text-[#8a622c]";
  }

  return "border-sea/20 bg-sea/10 text-sea";
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-black leading-5 shadow-sm ${badgeTone(status)}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

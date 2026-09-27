const COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  confirmed: "bg-green-100 text-green-700",
  succeeded: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  issued: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  pendingpayment: "bg-amber-100 text-amber-700",
  requested: "bg-amber-100 text-amber-700",
  processing: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
  refunded: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-100 text-gray-500",
}

export default function StatusBadge({ value }: { value: unknown }) {
  const text = String(value ?? "")
  const key = text.toLowerCase().replace(/[^a-z]/g, "")
  const cls = COLORS[key] || "bg-gray-100 text-gray-700"
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{text || "—"}</span>
}

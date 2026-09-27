import { Inbox } from "lucide-react"
export default function EmptyState({ title = "Nothing here yet", subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-gray-500">
      <Inbox className="h-10 w-10 text-gray-300" />
      <div className="font-medium text-gray-600">{title}</div>
      {subtitle && <div className="text-sm">{subtitle}</div>}
    </div>
  )
}

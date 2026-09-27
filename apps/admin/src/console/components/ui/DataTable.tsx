import { useMemo, useState } from "react"
import { ChevronUp, ChevronDown, Pencil, Trash2, Eye } from "lucide-react"
import LoadingSkeleton from "./LoadingSkeleton"
import EmptyState from "./EmptyState"
import ErrorState from "./ErrorState"
import SearchInput from "./SearchInput"
import StatusBadge from "./StatusBadge"

// Generic, auto-columned table. Columns are derived at runtime from the actual JSON keys
// the API returns for a resource -- this always matches the real backend response shape
// (ResponseDto) without us having to hand-maintain a column list per resource.
interface Props {
  rows: Record<string, any>[] | undefined
  loading: boolean
  error?: string | null
  onRetry?: () => void
  onView?: (row: any) => void
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
  extraActions?: { label: string; onClick: (row: any) => void; danger?: boolean }[]
  pageSize?: number
}

const HIDDEN_COLUMNS = new Set(["rowVersion"])
const STATUS_LIKE = /status$/i

function isPlainValue(v: unknown) {
  return v === null || v === undefined || ["string", "number", "boolean"].includes(typeof v)
}

function formatCell(key: string, value: any) {
  if (value === null || value === undefined || value === "") return <span className="text-gray-300">—</span>
  if (STATUS_LIKE.test(key)) return <StatusBadge value={value} />
  if (typeof value === "boolean") return value ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>
  if (typeof value === "string" && /\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toLocaleString()
  }
  if (!isPlainValue(value)) {
    if (Array.isArray(value)) return `${value.length} item(s)`
    return <span className="text-gray-400 italic">object</span>
  }
  return String(value)
}

export default function DataTable({ rows, loading, error, onRetry, onView, onEdit, onDelete, extraActions, pageSize = 10 }: Props) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)

  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return []
    const keys = Object.keys(rows[0]).filter((k) => !HIDDEN_COLUMNS.has(k))
    // Prefer simple/plain-valued columns first, then short id-ish fields last.
    const plainKeys = keys.filter((k) => isPlainValue(rows[0][k]))
    return plainKeys.slice(0, 9)
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    let out = rows
    if (search.trim()) {
      const s = search.toLowerCase()
      out = out.filter((r) => columns.some((c) => String(r[c] ?? "").toLowerCase().includes(s)))
    }
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (av === bv) return 0
        const cmp = av > bv ? 1 : -1
        return sortDir === "asc" ? cmp : -cmp
      })
    }
    return out
  }, [rows, search, columns, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!rows || rows.length === 0) return <EmptyState title="No records found" />

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const hasActions = onView || onEdit || onDelete || (extraActions && extraActions.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 p-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} />
        <div className="text-sm text-gray-500">{filtered.length} record(s)</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              {columns.map((c) => (
                <th key={c} className="cursor-pointer select-none whitespace-nowrap px-3 py-2" onClick={() => toggleSort(c)}>
                  <span className="inline-flex items-center gap-1">
                    {c}
                    {sortKey === c && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
              {hasActions && <th className="px-3 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c} className="max-w-[220px] truncate whitespace-nowrap px-3 py-2">{formatCell(c, row[c])}</td>
                ))}
                {hasActions && (
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {onView && <button className="btn-ghost !px-2" title="View" onClick={() => onView(row)}><Eye className="h-4 w-4" /></button>}
                      {onEdit && <button className="btn-ghost !px-2" title="Edit" onClick={() => onEdit(row)}><Pencil className="h-4 w-4" /></button>}
                      {onDelete && <button className="btn-ghost !px-2 text-red-600" title="Delete" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4" /></button>}
                      {extraActions?.map((a) => (
                        <button key={a.label} className={a.danger ? "btn-ghost !px-2 text-red-600" : "btn-ghost !px-2"} onClick={() => a.onClick(row)}>{a.label}</button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between p-3">
        <div className="text-xs text-gray-500">Page {page} of {totalPages}</div>
        <div className="flex gap-1">
          <button className="btn-secondary !px-2 !py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <button className="btn-secondary !px-2 !py-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}

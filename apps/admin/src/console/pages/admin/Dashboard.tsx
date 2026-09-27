import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, Legend, BarChart,
} from "recharts"
import {
  DollarSign, Ticket, Percent, RotateCcw, ClipboardList, RefreshCcw, PlugZap,
  AlertTriangle, Link2Off, Clock, RefreshCw, AlertCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatMoney } from "@/services/paymentService"

// Completion Plan v2, Chunk 9 task 2. Every number below comes from ONE call to
// GET /api/admin/dashboard/summary (AdminDashboardController, Admin-only) - a real SQL
// aggregate computed by the database, not eight list endpoints downloaded in full and reduced
// in the browser the way this page used to work. See ADMIN_DASHBOARD_DATA_MAP.md for exactly
// how each card/chart below maps to a field on that response.

interface OperatorOption { id: string; name: string }

interface Kpi { label: string; value: string; icon: any; tone?: "default" | "warn" }

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return { from: isoDate(from), to: isoDate(to) }
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  PendingPayment: "#f59e0b",
  Confirmed: "#16a34a",
  Completed: "#0891b2",
  PartiallyCancelled: "#db2777",
  Cancelled: "#dc2626",
  Expired: "#7c3aed",
  Failed: "#dc2626",
  Refunded: "#ea580c",
}
const FALLBACK_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"]

export default function Dashboard() {
  const initial = defaultRange()
  const [fromInput, setFromInput] = useState(initial.from)
  const [toInput, setToInput] = useState(initial.to)
  const [operatorIdInput, setOperatorIdInput] = useState("")
  const [appliedFilters, setAppliedFilters] = useState({ from: initial.from, to: initial.to, operatorId: "" })

  const [operators, setOperators] = useState<OperatorOption[]>([])
  const [summary, setSummary] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null)

  // Operator list for the filter dropdown - fetched once. A failure here isn't fatal to the
  // rest of the dashboard, so it's kept separate from the summary error state.
  useEffect(() => {
    let cancelled = false
    api.get("/api/BusOperators")
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        setOperators(list.map((o: any) => ({ id: o.id, name: o.name })))
      })
      .catch(() => { /* dropdown just stays "All operators" */ })
    return () => { cancelled = true }
  }, [])

  // silent=true is used by the background poll below: it refreshes the numbers without
  // flashing the full-page loading skeleton, the same "Live" pattern useAutoRefresh gives
  // every other list page in this console (OperatorInvoices, OperatorPayouts, etc.) - this
  // page just predates that hook and never got wired into it.
  const load = useCallback((filters: { from: string; to: string; operatorId: string }, silent = false) => {
    let cancelled = false
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    api.get("/api/admin/dashboard/summary", {
      params: {
        from: filters.from || undefined,
        to: filters.to || undefined,
        operatorId: filters.operatorId || undefined,
      },
    })
      .then((res) => {
        if (cancelled) return
        setSummary(res.data)
        setLastLoadedAt(new Date())
        setError(null)
      })
      .catch((err: any) => {
        if (cancelled) return
        // A failed background poll shouldn't blank out numbers that are already on screen -
        // only a failed foreground load (silent=false) replaces the dashboard with an error.
        if (!silent) {
          setSummary(null)
          setError(err?.message || "Something went wrong loading the dashboard. Please try again.")
        }
      })
      .finally(() => { if (!cancelled && !silent) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => load(appliedFilters), [appliedFilters, load])

  // Auto-refresh: a new online booking or a processed refund/cancellation changes the ledger
  // rows this summary is aggregated from, but nothing on this page previously re-fetched to
  // pick that up - so the Financial cards and Pending Refunds/Cancellations counts just sat
  // stale until someone hit the refresh icon or reloaded the browser. Poll in the background
  // on the currently applied filters, same 15s cadence as this console's other "Live" pages.
  const appliedFiltersRef = useRef(appliedFilters)
  appliedFiltersRef.current = appliedFilters
  useEffect(() => {
    const id = window.setInterval(() => load(appliedFiltersRef.current, true), 15000)
    return () => window.clearInterval(id)
  }, [load])

  function applyFilters() {
    if (toInput < fromInput) {
      setError("'To' date cannot be before 'From' date.")
      return
    }
    setAppliedFilters({ from: fromInput, to: toInput, operatorId: operatorIdInput })
  }

  function resetFilters() {
    const d = defaultRange()
    setFromInput(d.from)
    setToInput(d.to)
    setOperatorIdInput("")
    setAppliedFilters({ from: d.from, to: d.to, operatorId: "" })
  }

  const financialKpis: Kpi[] = useMemo(() => {
    if (!summary) return []
    return [
      { label: "Online Gross", value: formatMoney(summary.onlineGrossAmount), icon: DollarSign },
      { label: "Online Bookings", value: String(summary.onlineBookingCount), icon: Ticket },
      { label: "Online Commission", value: formatMoney(summary.onlineCommissionEarned), icon: Percent },
      { label: "Counter Tickets", value: String(summary.counterTicketCount), icon: Ticket },
      { label: "Counter Commission", value: formatMoney(summary.counterCommissionEarned), icon: Percent },
      {
        label: "Refunds (online + counter reversed)",
        value: `${formatMoney(summary.onlineRefundAmount)} + ${formatMoney(summary.counterCommissionReversedAmount)}`,
        icon: RotateCcw,
      },
    ]
  }, [summary])

  const alertKpis: Kpi[] = useMemo(() => {
    if (!summary) return []
    return [
      { label: "Pending Cancellations", value: String(summary.pendingCancellationRequests), icon: ClipboardList, tone: summary.pendingCancellationRequests > 0 ? "warn" : "default" },
      { label: "Pending Refunds", value: String(summary.pendingRefunds), icon: RefreshCcw, tone: summary.pendingRefunds > 0 ? "warn" : "default" },
      { label: "Open Complaints", value: String(summary.openComplaints), icon: AlertTriangle, tone: summary.openComplaints > 0 ? "warn" : "default" },
      { label: "Active Seat Holds", value: String(summary.activeSeatHolds), icon: Clock },
      { label: "Integration Failures (24h)", value: String(summary.integrationFailuresLast24h), icon: PlugZap, tone: summary.integrationFailuresLast24h > 0 ? "warn" : "default" },
      { label: "Needs Reconciliation", value: String(summary.paymentsNeedingReconciliation), icon: AlertCircle, tone: summary.paymentsNeedingReconciliation > 0 ? "warn" : "default" },
      { label: "Awaiting External Confirmation", value: String(summary.bookingsAwaitingExternalConfirmation), icon: Link2Off, tone: summary.bookingsAwaitingExternalConfirmation > 0 ? "warn" : "default" },
    ]
  }, [summary])

  const dailyChartData = useMemo(() => {
    if (!summary) return []
    return (summary.dailySeries || []).map((p: any) => ({
      date: String(p.date).slice(5),
      onlineGross: p.onlineGrossAmount,
      counterTickets: p.counterTicketCount,
    }))
  }, [summary])

  const statusPieData = useMemo(() => {
    if (!summary) return []
    const byStatus: Record<string, number> = {}
    for (const row of summary.bookingsByChannelAndStatus || []) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + row.count
    }
    return Object.entries(byStatus).map(([name, value]) => ({ name, value }))
  }, [summary])

  const channelBarData = useMemo(() => {
    if (!summary) return []
    const byChannel: Record<string, number> = {}
    for (const row of summary.bookingsByChannelAndStatus || []) {
      byChannel[row.saleChannel] = (byChannel[row.saleChannel] ?? 0) + row.count
    }
    return Object.entries(byChannel).map(([channel, count]) => ({ channel, count }))
  }, [summary])

  const hasNoActivity = !loading && !error && summary
    && (summary.bookingsByChannelAndStatus || []).length === 0
    && summary.onlineGrossAmount === 0
    && summary.counterTicketCount === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <span className="flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Live
          </span>
          {lastLoadedAt && <span>Updated {lastLoadedAt.toLocaleTimeString()}</span>}
        </span>
      </div>

      {/* Filter bar - the only inputs that change what the summary endpoint computes. */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={fromInput} max={toInput}
              onChange={(e) => setFromInput(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={toInput} min={fromInput}
              onChange={(e) => setToInput(e.target.value)} />
          </div>
          <div className="min-w-[220px]">
            <label className="label">Operator</label>
            <select className="input" value={operatorIdInput} onChange={(e) => setOperatorIdInput(e.target.value)}>
              <option value="">All operators</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={applyFilters} disabled={loading}>
            Apply
          </button>
          <button type="button" className="btn-secondary" onClick={resetFilters} disabled={loading}>
            Reset to last 30 days
          </button>
          <button type="button" className="btn-ghost ml-auto" onClick={() => load(appliedFilters)} disabled={loading}
            title="Refresh without changing filters">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Couldn't load the dashboard</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <button type="button" className="btn-secondary mt-3" onClick={() => load(appliedFilters)}>
            Try again
          </button>
        </div>
      )}

      {!error && loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card p-4"><div className="h-12 animate-pulse rounded bg-gray-100" /></div>
          ))}
        </div>
      )}

      {!error && !loading && hasNoActivity && (
        <div className="card p-6 text-center text-gray-500">
          No bookings, sales, or ledger activity in this period{operatorIdInput ? " for this operator" : ""}.
          Try widening the date range.
        </div>
      )}

      {!error && !loading && summary && !hasNoActivity && (
        <>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Financial - {summary.fromDate} to {summary.toDate}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {financialKpis.map((k, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <k.icon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">{k.label}</span>
                  </div>
                  <div className="mt-1 text-xl font-bold text-gray-900">{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Operational alerts - current, not limited to the date range above
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {alertKpis.map((k, i) => (
                <div key={i} className={`card p-4 ${k.tone === "warn" ? "border-amber-300 bg-amber-50" : ""}`}>
                  <div className={`flex items-center gap-2 ${k.tone === "warn" ? "text-amber-600" : "text-gray-400"}`}>
                    <k.icon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">{k.label}</span>
                  </div>
                  <div className={`mt-1 text-xl font-bold ${k.tone === "warn" ? "text-amber-700" : "text-gray-900"}`}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Online gross vs. counter tickets, by day</h2>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis yAxisId="left" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="right" dataKey="counterTickets" name="Counter tickets" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="onlineGross" name="Online gross" stroke="#2563eb" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Bookings by status (all channels)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-4 lg:col-span-1">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Bookings by channel</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={channelBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="channel" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Settlements by status</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-1">Status</th><th className="pb-1">Direction</th>
                    <th className="pb-1 text-right">Count</th><th className="pb-1 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.settlementsByStatus || []).length === 0 && (
                    <tr><td colSpan={4} className="py-2 text-gray-400">No settlements in this period.</td></tr>
                  )}
                  {(summary.settlementsByStatus || []).map((s: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1">{s.status}</td>
                      <td className="py-1 text-gray-500">{s.direction}</td>
                      <td className="py-1 text-right">{s.count}</td>
                      <td className="py-1 text-right">{formatMoney(s.netAmountSum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Payouts by status</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-1">Status</th><th className="pb-1 text-right">Count</th><th className="pb-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.payoutsByStatus || []).length === 0 && (
                    <tr><td colSpan={3} className="py-2 text-gray-400">No payouts in this period.</td></tr>
                  )}
                  {(summary.payoutsByStatus || []).map((p: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1">{p.status}</td>
                      <td className="py-1 text-right">{p.count}</td>
                      <td className="py-1 text-right">{formatMoney(p.amountSum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(summary.operatorsByInventoryMode || []).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="font-medium uppercase tracking-wide">Operators on the platform:</span>
              {summary.operatorsByInventoryMode.map((m: any, i: number) => (
                <span key={i} className="rounded-full bg-gray-100 px-2 py-1">{m.mode}: {m.operatorCount}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
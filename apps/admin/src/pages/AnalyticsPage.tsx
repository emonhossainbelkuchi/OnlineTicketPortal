import { useEffect, useState } from 'react';
import type {
  AdminDashboardReports,
  ApiError,
  BusOperator,
  OperatorSalesReportRow,
  SettlementReportRow,
} from '@ticketportal-mono/models';
import { apiFetch } from '../lib/apiClient';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';

// Completion Plan v2, Chunk 9 task 3. Replaces the old shortcut-only AnalyticsPage (a plain
// list of links into the console's raw CRUD resources) with a real reports page, backed by
// GET admin/dashboard/reports (AdminDashboardController, Admin-only) — the same server-side
// SQL aggregate approach as the console's rebuilt Dashboard.tsx. See
// ADMIN_DASHBOARD_DATA_MAP.md for exactly how each column below is derived.

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: isoDate(from), to: isoDate(to) };
}

function money(n: number): string {
  return `৳${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Minimal CSV export — no library, just enough to turn a report table into a downloadable file. */
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportSalesByOperatorCsv(rows: OperatorSalesReportRow[], fromDate: string, toDate: string) {
  downloadCsv(
    `sales-by-operator_${fromDate}_to_${toDate}.csv`,
    ['Operator', 'Inventory Mode', 'Online Gross', 'Online Bookings', 'Online Commission', 'Counter Tickets', 'Counter Commission', 'Refunds', 'Net Amount'],
    rows.map((r) => [
      r.busOperatorName, r.inventoryMode, r.onlineGrossAmount, r.onlineBookingCount,
      r.onlineCommissionEarned, r.counterTicketCount, r.counterCommissionEarned, r.refundAmount, r.netAmount,
    ]),
  );
}

function exportSettlementsCsv(rows: SettlementReportRow[], fromDate: string, toDate: string) {
  downloadCsv(
    `settlements_${fromDate}_to_${toDate}.csv`,
    ['Settlement No', 'Operator', 'Period From', 'Period To', 'Direction', 'Status', 'Online Gross', 'Platform Charge', 'Refunds', 'Net Amount'],
    rows.map((r) => [
      r.settlementNo, r.busOperatorName, r.fromDate, r.toDate, r.direction, r.status,
      r.onlineGrossAmount, r.platformCharge, r.refundAmount, r.netAmount,
    ]),
  );
}

export function AnalyticsPage() {
  const initial = defaultRange();
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [operatorIdInput, setOperatorIdInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ from: initial.from, to: initial.to, operatorId: '' });

  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [reports, setReports] = useState<AdminDashboardReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<BusOperator[]>('busoperators').then(setOperators).catch(() => { /* filter just stays "All operators" */ });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (appliedFilters.from) params.set('from', appliedFilters.from);
        if (appliedFilters.to) params.set('to', appliedFilters.to);
        if (appliedFilters.operatorId) params.set('operatorId', appliedFilters.operatorId);
        const data = await apiFetch<AdminDashboardReports>(`admin/dashboard/reports?${params.toString()}`);
        if (!cancelled) setReports(data);
      } catch (err) {
        if (!cancelled) {
          setReports(null);
          setLoadError((err as ApiError).message ?? 'Could not load reports.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [appliedFilters]);

  function applyFilters() {
    if (toInput < fromInput) {
      setRangeError("'To' date cannot be before 'From' date.");
      return;
    }
    setRangeError(null);
    setAppliedFilters({ from: fromInput, to: toInput, operatorId: operatorIdInput });
  }

  function resetFilters() {
    const d = defaultRange();
    setFromInput(d.from);
    setToInput(d.to);
    setOperatorIdInput('');
    setRangeError(null);
    setAppliedFilters({ from: d.from, to: d.to, operatorId: '' });
  }

  const isEmpty = !loading && !loadError && reports
    && reports.salesByOperator.length === 0
    && reports.settlements.length === 0
    && reports.onlineVsCounter.onlineBookingCount === 0
    && reports.onlineVsCounter.counterTicketCount === 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p className="tp-muted">
            Sales by operator, online vs. counter split, commission earned, and settlements for a
            chosen period — computed server-side from the same PlatformLedger a real settlement
            reads, not assembled in the browser.
          </p>
        </div>
      </div>

      <Card className="form-card">
        <div className="form-grid">
          <label className="field">
            From
            <input type="date" value={fromInput} max={toInput} onChange={(e) => setFromInput(e.target.value)} />
          </label>
          <label className="field">
            To
            <input type="date" value={toInput} min={fromInput} onChange={(e) => setToInput(e.target.value)} />
          </label>
          <label className="field">
            Operator
            <select value={operatorIdInput} onChange={(e) => setOperatorIdInput(e.target.value)}>
              <option value="">All operators</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
          <div className="field" style={{ justifyContent: 'flex-end', flexDirection: 'row', gap: 12 }}>
            <Button type="button" onClick={applyFilters} disabled={loading}>Apply</Button>
            <Button type="button" variant="secondary" onClick={resetFilters} disabled={loading}>
              Reset to last 30 days
            </Button>
          </div>
          {rangeError && <p className="error">{rangeError}</p>}
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="tp-muted">Loading reports…</p>
        ) : loadError ? (
          <>
            <p className="error">{loadError}</p>
            <Button type="button" variant="secondary" onClick={() => setAppliedFilters({ ...appliedFilters })}>
              Try again
            </Button>
          </>
        ) : isEmpty ? (
          <p className="tp-muted">
            No sales or settlement activity in this period{appliedFilters.operatorId ? ' for this operator' : ''}.
            Try widening the date range.
          </p>
        ) : reports ? (
          <>
            <h3>Online vs. counter — {reports.fromDate} to {reports.toDate}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Bookings / Tickets</th>
                  <th>Gross</th>
                  <th>Commission Earned</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="data-table__primary">Online</td>
                  <td>{reports.onlineVsCounter.onlineBookingCount}</td>
                  <td>{money(reports.onlineVsCounter.onlineGrossAmount)}</td>
                  <td>{money(reports.onlineVsCounter.onlineCommissionEarned)}</td>
                </tr>
                <tr>
                  <td className="data-table__primary">Counter</td>
                  <td>{reports.onlineVsCounter.counterTicketCount}</td>
                  <td className="tp-muted">— (cash goes straight to the operator)</td>
                  <td>{money(reports.onlineVsCounter.counterCommissionEarned)}</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : null}
      </Card>

      {!loading && !loadError && reports && !isEmpty && (
        <>
          <Card>
            <div className="page-header">
              <h3>Sales by operator</h3>
              {reports.salesByOperator.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => exportSalesByOperatorCsv(reports.salesByOperator, reports.fromDate, reports.toDate)}
                >
                  Export CSV
                </Button>
              )}
            </div>
            {reports.salesByOperator.length === 0 ? (
              <p className="tp-muted">No operators match this filter.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Mode</th>
                    <th>Online Gross</th>
                    <th>Online Bookings</th>
                    <th>Online Commission</th>
                    <th>Counter Tickets</th>
                    <th>Counter Commission</th>
                    <th>Refunds</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.salesByOperator.map((row) => (
                    <tr key={row.busOperatorId}>
                      <td className="data-table__primary">{row.busOperatorName}</td>
                      <td className="tp-muted data-table__secondary">{row.inventoryMode}</td>
                      <td>{money(row.onlineGrossAmount)}</td>
                      <td>{row.onlineBookingCount}</td>
                      <td>{money(row.onlineCommissionEarned)}</td>
                      <td>{row.counterTicketCount}</td>
                      <td>{money(row.counterCommissionEarned)}</td>
                      <td>{money(row.refundAmount)}</td>
                      <td>{money(row.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <div className="page-header">
              <h3>Settlements</h3>
              {reports.settlements.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => exportSettlementsCsv(reports.settlements, reports.fromDate, reports.toDate)}
                >
                  Export CSV
                </Button>
              )}
            </div>
            {reports.settlements.length === 0 ? (
              <p className="tp-muted">No settlements were created in this period.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Settlement No</th>
                    <th>Operator</th>
                    <th>Period</th>
                    <th>Direction</th>
                    <th>Status</th>
                    <th>Online Gross</th>
                    <th>Platform Charge</th>
                    <th>Refunds</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.settlements.map((row) => (
                    <tr key={row.id}>
                      <td className="data-table__primary">{row.settlementNo}</td>
                      <td>{row.busOperatorName}</td>
                      <td className="tp-muted data-table__secondary">{row.fromDate} – {row.toDate}</td>
                      <td className="tp-muted data-table__secondary">{row.direction}</td>
                      <td><StatusPill status={row.status} /></td>
                      <td>{money(row.onlineGrossAmount)}</td>
                      <td>{money(row.platformCharge)}</td>
                      <td>{money(row.refundAmount)}</td>
                      <td>{money(row.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

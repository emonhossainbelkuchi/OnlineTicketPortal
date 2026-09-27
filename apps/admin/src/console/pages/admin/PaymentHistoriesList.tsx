import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAllPaymentHistories,
  subscribeToPaymentHistories,
  getCurrentUserRole,
  historyStatusBadgeClass,
  historyStatusIcon,
  extractErrorMessage,
} from '@/services/paymentHistoryService';
import type { PaymentHistoryResponseDto, PaymentStatus } from '@/types/paymentHistory.types';

const STATUS_OPTIONS: (PaymentStatus | 'ALL')[] = [
  'ALL', 'Initiated', 'Pending', 'Succeeded', 'Failed', 'Cancelled', 'PartiallyRefunded', 'Refunded', 'ReconciliationNeeded',
];
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const POLL_INTERVAL_MS = 10000;

export const PaymentHistoriesList: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();

  const [histories, setHistories] = useState<PaymentHistoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pollRef = useRef<number | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getAllPaymentHistories();
      setHistories(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToPaymentHistories(() => loadData(true));
    pollRef.current = window.setInterval(() => loadData(true), POLL_INTERVAL_MS);
    const onFocus = () => loadData(true);
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, pageSize]);

  const filtered = useMemo(() => {
    return histories.filter((h) => {
      if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return h.id.toLowerCase().includes(q) || h.paymentId.toLowerCase().includes(q) || (h.remarks || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.changedAtUtc).getTime() - new Date(a.changedAtUtc).getTime());
  }, [histories, searchQuery, statusFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: histories.length,
    succeeded: histories.filter((h) => h.status === 'Succeeded').length,
    failed: histories.filter((h) => h.status === 'Failed').length,
    uniquePayments: new Set(histories.map((h) => h.paymentId)).size,
  }), [histories]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Payment Histories</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-clock-rotate-left text-sm" />
            </div>
            Payment Histories
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 badge bg-success-subtle text-success border border-success">
              <span className="d-inline-block rounded-circle bg-success" style={{ width: 6, height: 6 }} />
              Live
            </span>
            <span>
              Read-only audit trail from api/PaymentHistories — written only when a Payment's status changes
              {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}` : ''}.
            </span>
          </p>
        </div>
        <button type="button" onClick={() => loadData()} className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs" title="Refresh now">
          <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0" role="alert">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: stats.total, icon: 'fa-clock-rotate-left', grad: 'from-violet-500 to-fuchsia-600' },
          { label: 'Succeeded Events', value: stats.succeeded, icon: 'fa-circle-check', grad: 'from-emerald-500 to-teal-600' },
          { label: 'Failed Events', value: stats.failed, icon: 'fa-circle-xmark', grad: 'from-rose-500 to-red-600' },
          { label: 'Distinct Payments', value: stats.uniquePayments, icon: 'fa-money-bill-transfer', grad: 'from-indigo-500 to-blue-600' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-white shadow-sm bg-gradient-to-br ${s.grad} relative overflow-hidden`}>
            <i className={`fa-solid ${s.icon} absolute -right-2 -bottom-2 text-5xl opacity-20`} />
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass text-slate-400 absolute left-3 top-2.5 text-xs" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by History ID, Payment ID, or remarks..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'ALL')} className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
          </select>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <i className="fa-solid fa-circle-notch fa-spin me-2" /> Loading payment histories...
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No payment history events found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pageItems.map((h) => (
              <div
                key={h.id}
                onClick={() => navigate(`/admin/payment-histories/${h.id}`)}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-violet-50/30 transition-colors cursor-pointer group"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 ${historyStatusBadgeClass(h.status)}`}>
                  <i className={`${historyStatusIcon(h.status)} text-xs`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-violet-600">Status → {h.status}</span>
                    <span className={`badge ${historyStatusBadgeClass(h.status)}`}>{h.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">Payment {h.paymentId}</div>
                  {h.remarks && <div className="text-[11px] text-slate-600 mt-0.5 truncate">{h.remarks}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-500">{new Date(h.changedAtUtc).toLocaleString()}</div>
                  <Link to={`/admin/payments/${h.paymentId}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-blue-600 hover:underline">
                    View Payment <i className="fa-solid fa-arrow-up-right-from-square ms-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3 text-xs text-slate-500">
            <span>Showing <strong>{(currentPage - 1) * pageSize + 1}</strong>–<strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong></span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setPage(1)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angles-left" /></button>
              <button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angle-left" /></button>
              <span className="px-3 py-1 font-semibold text-slate-700">Page {currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angle-right" /></button>
              <button disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angles-right" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoriesList;

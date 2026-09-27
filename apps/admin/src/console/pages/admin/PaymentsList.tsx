import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAllPayments,
  subscribeToPayments,
  getCurrentUserRole,
  formatMoney,
  paymentStatusBadgeClass,
  paymentStatusIcon,
  methodIcon,
  extractErrorMessage,
} from '@/services/paymentService';
import type { PaymentResponseDto, PaymentStatus } from '@/types/payment.types';

const STATUS_OPTIONS: (PaymentStatus | 'ALL')[] = [
  'ALL', 'Initiated', 'Pending', 'Succeeded', 'Failed', 'Cancelled', 'PartiallyRefunded', 'Refunded', 'ReconciliationNeeded',
];
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const POLL_INTERVAL_MS = 10000;

export const PaymentsList: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canInitiate = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';

  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
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
      const data = await getAllPayments();
      setPayments(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToPayments(() => loadData(true));
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
    return payments.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.id.toLowerCase().includes(q) ||
          p.bookingId.toLowerCase().includes(q) ||
          (p.gatewayTransactionId || '').toLowerCase().includes(q) ||
          (p.merchantInvoiceNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.transactionDateUtc).getTime() - new Date(a.transactionDateUtc).getTime());
  }, [payments, searchQuery, statusFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => {
    const succeeded = payments.filter((p) => p.status === 'Succeeded');
    const grossVolume = succeeded.reduce((sum, p) => sum + p.amount, 0);
    const netReceived = succeeded.reduce((sum, p) => sum + p.netReceivedAmount, 0);
    const gatewayFees = succeeded.reduce((sum, p) => sum + p.gatewayFeeAmount, 0);
    return {
      total: payments.length,
      succeeded: succeeded.length,
      pending: payments.filter((p) => p.status === 'Initiated' || p.status === 'Pending').length,
      failed: payments.filter((p) => p.status === 'Failed').length,
      grossVolume, netReceived, gatewayFees,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Payments</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-money-bill-transfer text-sm" />
            </div>
            Payments
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 badge bg-success-subtle text-success border border-success">
              <span className="d-inline-block rounded-circle bg-success" style={{ width: 6, height: 6 }} />
              Live
            </span>
            <span>Synced with api/Payments{lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}` : ''}.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => loadData()} className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs" title="Refresh now">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          {canInitiate ? (
            <Link to="/admin/payments/create" className="px-3.5 py-2 bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm">
              <i className="fa-solid fa-plus" /> <span>Initiate Payment</span>
            </Link>
          ) : (
            <button disabled className="px-3.5 py-2 bg-slate-200 text-slate-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed">
              <i className="fa-solid fa-plus" /> <span>Initiate Payment</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0" role="alert">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gross Volume (Succeeded)', value: formatMoney(stats.grossVolume), icon: 'fa-sack-dollar', grad: 'from-emerald-500 to-teal-600' },
          { label: 'Net Received', value: formatMoney(stats.netReceived), icon: 'fa-hand-holding-dollar', grad: 'from-indigo-500 to-blue-600' },
          { label: 'Pending / In-flight', value: stats.pending, icon: 'fa-hourglass-half', grad: 'from-amber-500 to-orange-600' },
          { label: 'Failed', value: stats.failed, icon: 'fa-circle-xmark', grad: 'from-rose-500 to-red-600' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-white shadow-sm bg-gradient-to-br ${s.grad} relative overflow-hidden`}>
            <i className={`fa-solid ${s.icon} absolute -right-2 -bottom-2 text-5xl opacity-20`} />
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{s.label}</div>
            <div className="text-xl font-bold mt-1 truncate">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass text-slate-400 absolute left-3 top-2.5 text-xs" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Payment ID, Booking ID, gateway transaction, or invoice number..."
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
            <i className="fa-solid fa-circle-notch fa-spin me-2" /> Loading payments...
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Booking</th>
                  <th className="py-3 px-4">Method / Gateway</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Net Received</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/admin/payments/${p.id}`)} className="hover:bg-emerald-50/30 transition-colors cursor-pointer group">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                      {p.bookingId.slice(0, 8)}…
                      {p.gatewayTransactionId && <div className="text-[10px] text-slate-400">TXN {p.gatewayTransactionId}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="badge bg-light text-dark border">
                        <i className={`${methodIcon(p.method)} me-1`} />{p.method}
                      </span>
                      {p.gateway !== 'None' && <span className="ms-1 badge bg-secondary-subtle text-secondary border">{p.gateway}</span>}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-emerald-600">{formatMoney(p.amount, p.currency)}</td>
                    <td className="py-3.5 px-4 text-slate-700">{formatMoney(p.netReceivedAmount, p.currency)}</td>
                    <td className="py-3.5 px-4"><span className="badge bg-indigo-subtle text-indigo-700 border border-indigo-200">{p.collectedBy}</span></td>
                    <td className="py-3.5 px-4">
                      <span className={`badge ${paymentStatusBadgeClass(p.status)}`}>
                        <i className={`${paymentStatusIcon(p.status)} me-1`} />{p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">{new Date(p.transactionDateUtc).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/admin/payments/${p.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-emerald-600 rounded" title="View">
                          <i className="fa-solid fa-eye" />
                        </Link>
                        {canInitiate && (p.status === 'Initiated' || p.status === 'Pending') && (
                          <Link to={`/admin/payments/edit/${p.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-emerald-600 rounded" title="Confirm / Fail">
                            <i className="fa-solid fa-pen" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default PaymentsList;

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentHistoryById, historyStatusBadgeClass, historyStatusIcon, extractErrorMessage } from '@/services/paymentHistoryService';
import type { PaymentHistoryResponseDto } from '@/types/paymentHistory.types';

export const PaymentHistoriesDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<PaymentHistoryResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const h = await getPaymentHistoryById(id);
      setHistory(h);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-violet-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading history entry...
      </div>
    );
  }

  if (error || !history) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="alert alert-danger text-xs">{error || 'History entry not found.'}</div>
        <Link to="/admin/payment-histories" className="text-xs text-blue-600">&larr; Back to Payment Histories</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/payment-histories" className="hover:text-blue-600">Payment Histories</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium font-mono">{history.id.slice(0, 8)}…</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-clock-rotate-left text-violet-600" />
            Status Transition
            <span className={`badge ${historyStatusBadgeClass(history.status)}`}>
              <i className={`${historyStatusIcon(history.status)} me-1`} />{history.status}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <i className="fa-solid fa-arrows-rotate" /> Refresh
          </button>
          <Link to="/admin/payment-histories" className="px-3 py-1.5 border rounded-lg text-xs font-medium">All Histories</Link>
        </div>
      </div>

      <div className="alert alert-secondary d-flex align-items-start gap-2 text-xs mb-0">
        <i className="fa-solid fa-lock mt-0.5" />
        <div>This is a read-only audit trail entry — written automatically by PaymentConfirmationService whenever the related Payment's status changes. It can't be created, edited, or deleted here.</div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-violet-950 rounded-2xl p-6 text-white shadow-md grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] font-mono text-violet-300 font-bold uppercase">Payment</span>
          <div className="text-sm font-bold font-mono">{history.paymentId}</div>
          <Link to={`/admin/payments/${history.paymentId}`} className="text-[11px] text-violet-200 hover:underline">
            View Payment <i className="fa-solid fa-arrow-up-right-from-square ms-1" />
          </Link>
        </div>
        <div>
          <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">Changed At</span>
          <div className="text-sm font-bold">{new Date(history.changedAtUtc).toLocaleString()}</div>
        </div>
      </div>

      {history.remarks && (
        <div className="bg-white border rounded-xl p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-900 mb-2">Remarks</div>
          <p className="text-xs text-slate-600">{history.remarks}</p>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">API Response DTO (PaymentHistoryResponseDto)</div>
        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
          {JSON.stringify(history, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default PaymentHistoriesDetails;

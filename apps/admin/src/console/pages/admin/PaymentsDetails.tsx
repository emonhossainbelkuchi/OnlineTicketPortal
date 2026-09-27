import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentById, getCurrentUserRole, formatMoney, paymentStatusBadgeClass, paymentStatusIcon, methodIcon, extractErrorMessage } from '@/services/paymentService';
import type { PaymentResponseDto } from '@/types/payment.types';

export const PaymentsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator' || currentRole === 'User';

  const [payment, setPayment] = useState<PaymentResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getPaymentById(id);
      setPayment(p);
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
        <i className="fa-solid fa-circle-notch fa-spin text-emerald-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading payment details...
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="alert alert-danger text-xs">{error || 'Payment not found.'}</div>
        <Link to="/admin/payments" className="text-xs text-blue-600">&larr; Back to Payments</Link>
      </div>
    );
  }

  const editable = payment.status === 'Initiated' || payment.status === 'Pending';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/payments" className="hover:text-blue-600">Payments</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium font-mono">{payment.id.slice(0, 8)}…</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-money-bill-transfer text-emerald-600" />
            {formatMoney(payment.amount, payment.currency)}
            <span className={`badge ${paymentStatusBadgeClass(payment.status)}`}>
              <i className={`${paymentStatusIcon(payment.status)} me-1`} />{payment.status}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <i className="fa-solid fa-arrows-rotate" /> Refresh
          </button>
          <Link to="/admin/payments" className="px-3 py-1.5 border rounded-lg text-xs font-medium">All Payments</Link>
          {canWrite && editable && (
            <Link to={`/admin/payments/edit/${payment.id}`} className="px-3 py-1.5 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
              <i className="fa-solid fa-pen" /> <span>Confirm / Fail</span>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-md grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">Amount</span>
          <div className="text-sm font-bold">{formatMoney(payment.amount, payment.currency)}</div>
          <div className="text-xs text-slate-300">Fee {formatMoney(payment.gatewayFeeAmount, payment.currency)} · Net {formatMoney(payment.netReceivedAmount, payment.currency)}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-blue-300 font-bold uppercase">Method</span>
          <div className="text-sm font-bold"><i className={`${methodIcon(payment.method)} me-1.5`} />{payment.method}</div>
          <div className="text-xs text-slate-300">Gateway: {payment.gateway}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase">Collected By</span>
          <div className="text-sm font-bold">{payment.collectedBy}</div>
          {payment.merchantInvoiceNumber && <div className="text-xs text-slate-300">Invoice {payment.merchantInvoiceNumber}</div>}
        </div>
        <div>
          <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">Timeline</span>
          <div className="text-xs text-slate-300">Txn {new Date(payment.transactionDateUtc).toLocaleString()}</div>
          {payment.paidAtUtc && <div className="text-xs text-emerald-300">Paid {new Date(payment.paidAtUtc).toLocaleString()}</div>}
          {payment.failedAtUtc && <div className="text-xs text-rose-300">Failed {new Date(payment.failedAtUtc).toLocaleString()}</div>}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-xs">
        <div className="text-xs font-bold text-slate-900 mb-3">Booking Reference</div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-slate-700">{payment.bookingId}</span>
          <Link to={`/admin/bookings/${payment.bookingId}`} className="text-blue-600 text-[11px] hover:underline">
            View Booking <i className="fa-solid fa-arrow-up-right-from-square ms-1" />
          </Link>
        </div>
      </div>

      {payment.gatewayTransactionId && (
        <div className="bg-white border rounded-xl p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-900 mb-2">Gateway Transaction</div>
          <div className="font-mono text-xs text-slate-700">{payment.gatewayTransactionId}</div>
          {payment.gatewayResponseJson && (
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-40 mt-2">
              {payment.gatewayResponseJson}
            </pre>
          )}
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">API Response DTO (PaymentResponseDto)</div>
        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
          {JSON.stringify(payment, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default PaymentsDetails;

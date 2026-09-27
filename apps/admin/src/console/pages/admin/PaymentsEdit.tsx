import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getPaymentById, confirmPayment, failPayment, getCurrentUserRole, formatMoney, paymentStatusBadgeClass, extractErrorMessage } from '@/services/paymentService';
import type { PaymentResponseDto } from '@/types/payment.types';

export const PaymentsEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator' || currentRole === 'User';

  const [payment, setPayment] = useState<PaymentResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'confirm' | 'fail'>('confirm');

  // Confirm fields
  const [holdToken, setHoldToken] = useState('');
  const [gatewayTransactionId, setGatewayTransactionId] = useState('');
  const [gatewayFeeAmount, setGatewayFeeAmount] = useState(0);
  const [gatewayResponseJson, setGatewayResponseJson] = useState('');

  // Fail fields
  const [failHoldToken, setFailHoldToken] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const p = await getPaymentById(id);
      setPayment(p);
      if (p.status !== 'Initiated' && p.status !== 'Pending') {
        setError(`This payment is already ${p.status} — it can no longer be confirmed or failed.`);
      }
    } catch (err) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const editable = payment && (payment.status === 'Initiated' || payment.status === 'Pending');

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!holdToken.trim()) { setError('HoldToken is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await confirmPayment(id, {
        holdToken: holdToken.trim(),
        gatewayTransactionId: gatewayTransactionId.trim() || null,
        gatewayFeeAmount,
        gatewayResponseJson: gatewayResponseJson.trim() || null,
      });
      navigate(`/admin/payments/${id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!failHoldToken.trim()) { setError('HoldToken is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await failPayment(id, { holdToken: failHoldToken.trim(), reason: reason.trim() || null });
      navigate(`/admin/payments/${id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-emerald-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading payment...
      </div>
    );
  }

  if (notFound || !payment) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="alert alert-danger text-xs">Payment not found.</div>
        <Link to="/admin/payments" className="text-xs text-blue-600">&larr; Back to Payments</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/payments" className="hover:text-blue-600">Payments</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Resolve</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-money-bill-transfer text-emerald-600" />
            Resolve Payment
            <span className={`badge ${paymentStatusBadgeClass(payment.status)}`}>{payment.status}</span>
          </h1>
        </div>
        <Link to={`/admin/payments/${id}`} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
          <i className="fa-solid fa-arrow-left" /> <span>Cancel</span>
        </Link>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 space-y-1">
        <div><strong>Booking:</strong> <span className="font-mono">{payment.bookingId}</span></div>
        <div><strong>Amount:</strong> {formatMoney(payment.amount, payment.currency)}</div>
        <div><strong>Method:</strong> {payment.method}</div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {!editable ? (
        <div className="alert alert-secondary text-xs">This payment already reached a final state and can't be resolved again.</div>
      ) : (
        <>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            <button type="button" onClick={() => setMode('confirm')} className={`px-4 py-2 text-xs font-semibold ${mode === 'confirm' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'}`}>
              <i className="fa-solid fa-circle-check me-1" /> Confirm (Success)
            </button>
            <button type="button" onClick={() => setMode('fail')} className={`px-4 py-2 text-xs font-semibold ${mode === 'fail' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600'}`}>
              <i className="fa-solid fa-circle-xmark me-1" /> Fail
            </button>
          </div>

          <fieldset disabled={!canWrite}>
            {mode === 'confirm' ? (
              <form onSubmit={handleConfirm} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Hold Token *</label>
                  <input value={holdToken} onChange={(e) => setHoldToken(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Gateway Transaction ID</label>
                    <input value={gatewayTransactionId} onChange={(e) => setGatewayTransactionId(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Gateway Fee Amount</label>
                    <input type="number" min={0} step="0.01" value={gatewayFeeAmount} onChange={(e) => setGatewayFeeAmount(Number(e.target.value))} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Gateway Response JSON</label>
                  <textarea value={gatewayResponseJson} onChange={(e) => setGatewayResponseJson(e.target.value)} rows={3} maxLength={2000} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" placeholder='{ "status": "success", ... }' />
                </div>
                <div className="flex justify-end pt-3 border-t border-slate-200/80">
                  <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                    <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-circle-check'}`} />
                    <span>{submitting ? 'Confirming...' : 'Confirm Payment'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFail} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Hold Token *</label>
                  <input value={failHoldToken} onChange={(e) => setFailHoldToken(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Reason</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="Customer abandoned checkout / gateway declined..." />
                </div>
                <div className="flex justify-end pt-3 border-t border-slate-200/80">
                  <button type="submit" disabled={submitting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                    <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-circle-xmark'}`} />
                    <span>{submitting ? 'Failing...' : 'Mark as Failed'}</span>
                  </button>
                </div>
              </form>
            )}
          </fieldset>
        </>
      )}
    </div>
  );
};

export default PaymentsEdit;

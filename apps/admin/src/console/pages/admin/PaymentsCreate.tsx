import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { initiatePayment, getAllPaymentProvidersLite, getCurrentUserRole, extractErrorMessage } from '@/services/paymentService';
import type { PaymentMethod } from '@/types/payment.types';

const METHODS: PaymentMethod[] = ['Cash', 'Card', 'MobileBanking', 'BankTransfer', 'OnlineGateway', 'Wallet'];

export const PaymentsCreate: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator' || currentRole === 'User';

  const [bookingId, setBookingId] = useState('');
  const [holdToken, setHoldToken] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('OnlineGateway');
  const [paymentProviderId, setPaymentProviderId] = useState('');
  const [providers, setProviders] = useState<{ id: string; name: string; gateway: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllPaymentProvidersLite().then(setProviders).catch(() => {});
  }, []);

  const validate = (): string | null => {
    if (!bookingId.trim()) return 'BookingId is required.';
    if (!holdToken.trim()) return 'HoldToken is required — this is the same token the Booking was created from.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);
    setError(null);
    try {
      const created = await initiatePayment({
        bookingId: bookingId.trim(),
        holdToken: holdToken.trim(),
        method,
        paymentProviderId: paymentProviderId || null,
      });
      navigate(`/admin/payments/${created.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/payments" className="hover:text-blue-600">Payments</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Initiate</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-money-bill-transfer text-sm" />
            </div>
            Initiate Payment
          </h1>
        </div>
        <Link to="/admin/payments" className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
          <i className="fa-solid fa-arrow-left" /> <span>Back</span>
        </Link>
      </div>

      {!canWrite && (
        <div className="alert alert-warning d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <div>You must be logged in to initiate a payment. Currently simulating <strong>{currentRole}</strong>.</div>
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="alert alert-info d-flex align-items-start gap-2 text-xs mb-0">
        <i className="fa-solid fa-circle-info mt-0.5" />
        <div>Amount is never entered here — it's computed server-side from the Booking's own GrandTotal. This only starts the payment attempt.</div>
      </div>

      <fieldset disabled={!canWrite}>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Booking ID *</label>
            <input value={bookingId} onChange={(e) => setBookingId(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" placeholder="GUID of the Booking" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Hold Token *</label>
            <input value={holdToken} onChange={(e) => setHoldToken(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" placeholder="Same token the Booking was created from" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Payment Method *</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Payment Provider</label>
              {providers.length > 0 ? (
                <select value={paymentProviderId} onChange={(e) => setPaymentProviderId(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <option value="">-- None --</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.gateway})</option>)}
                </select>
              ) : (
                <input value={paymentProviderId} onChange={(e) => setPaymentProviderId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" placeholder="Optional PaymentProvider GUID" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80">
            <Link to="/admin/payments" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg">Cancel</Link>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50">
              <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`} />
              <span>{submitting ? 'Initiating...' : 'Initiate Payment'}</span>
            </button>
          </div>
        </form>
      </fieldset>
    </div>
  );
};

export default PaymentsCreate;

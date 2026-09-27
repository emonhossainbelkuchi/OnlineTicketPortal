import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPaymentWebhookEventById, getCurrentUserRole, webhookStatusBadgeClass, webhookStatusIcon, reportedStatusBadgeClass, extractErrorMessage } from '@/services/paymentWebhookEventService';
import type { PaymentWebhookEventResponseDto } from '@/types/paymentWebhookEvent.types';

export const PaymentWebhookEventsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const currentRole = getCurrentUserRole();
  const canView = currentRole === 'Admin' || currentRole === 'Staff';

  const [event, setEvent] = useState<PaymentWebhookEventResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const e = await getPaymentWebhookEventById(id);
      setEvent(e);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!canView) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="alert alert-warning d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-lock mt-0.5" />
          <div>Payment Webhook Events are Admin/Staff-only. Currently simulating <strong>{currentRole}</strong>.</div>
        </div>
        <Link to="/admin" className="text-xs text-blue-600">&larr; Back to Admin</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-cyan-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading webhook event...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="alert alert-danger text-xs">{error || 'Webhook event not found.'}</div>
        <Link to="/admin/payment-webhook-events" className="text-xs text-blue-600">&larr; Back to Webhook Events</Link>
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
            <Link to="/admin/payment-webhook-events" className="hover:text-blue-600">Payment Webhook Events</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium font-mono">{event.id.slice(0, 8)}…</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-satellite-dish text-cyan-600" />
            {event.eventType}
            <span className={`badge ${webhookStatusBadgeClass(event.isProcessed, event.errorMessage)}`}>
              <i className={`${webhookStatusIcon(event.isProcessed, event.errorMessage)} me-1`} />
              {event.errorMessage ? 'Error' : event.isProcessed ? 'Processed' : 'Unprocessed'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <i className="fa-solid fa-arrows-rotate" /> Refresh
          </button>
          <Link to="/admin/payment-webhook-events" className="px-3 py-1.5 border rounded-lg text-xs font-medium">All Events</Link>
        </div>
      </div>

      <div className="alert alert-secondary d-flex align-items-start gap-2 text-xs mb-0">
        <i className="fa-solid fa-lock mt-0.5" />
        <div>Raw inbound gateway data — read-only, Admin/Staff-only, no client-facing write path exists here.</div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-cyan-950 rounded-2xl p-6 text-white shadow-md grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase">Provider Event ID</span>
          <div className="text-sm font-bold font-mono">{event.providerEventId}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">Received At</span>
          <div className="text-sm font-bold">{new Date(event.receivedAtUtc).toLocaleString()}</div>
          {event.processedAtUtc && <div className="text-xs text-slate-300">Processed {new Date(event.processedAtUtc).toLocaleString()}</div>}
        </div>
        {event.paymentId && (
          <div>
            <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">Payment</span>
            <div className="text-sm font-bold font-mono">{event.paymentId}</div>
            <Link to={`/admin/payments/${event.paymentId}`} className="text-[11px] text-emerald-200 hover:underline">
              View Payment <i className="fa-solid fa-arrow-up-right-from-square ms-1" />
            </Link>
          </div>
        )}
        {event.reportedStatus && (
          <div>
            <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase">Reported Status</span>
            <div className="text-sm font-bold"><span className={`badge ${reportedStatusBadgeClass(event.reportedStatus)}`}>{event.reportedStatus}</span></div>
          </div>
        )}
      </div>

      {event.errorMessage && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <div><strong>Error:</strong> {event.errorMessage}</div>
        </div>
      )}

      {event.payloadJson && (
        <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
          <div className="text-xs font-bold text-slate-900">Raw Payload</div>
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
            {event.payloadJson}
          </pre>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">API Response DTO (PaymentWebhookEventResponseDto)</div>
        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
          {JSON.stringify(event, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default PaymentWebhookEventsDetails;

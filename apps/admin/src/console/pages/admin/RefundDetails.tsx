// src/pages/admin/RefundDetails.tsx
//
// Action buttons are gated by status, mirroring exactly what
// RefundProcessingService allows next:
//   Requested            -> Approve, Reject
//   Approved              -> Process
//   PendingManualPayout    -> Complete Manual Payout (platform-only)
//   Processing/Succeeded/Rejected/Failed/ReconciliationNeeded -> no action (terminal/awaiting ops)

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRefund } from '../../hooks/useRefunds';
import refundService from '../../services/refundService';
import { RefundStatus, RefundStatusBadgeClass, RefundStatusLabel } from '../../types/refund.types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col-12 col-md-6 mb-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{children}</div>
    </div>
  );
}

export default function RefundDetails() {
  const { id } = useParams<{ id: string }>();
  const { refund, loading, error, notFound, forbidden, refresh } = useRefund(id, { live: true });

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<'approve' | 'reject' | 'manualPayout' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');

  async function runAction(fn: () => Promise<any>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      setModal(null);
      setRemarks('');
      setRejectReason('');
      setPayoutRef('');
      await refresh();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? err?.message ?? 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <i className="fa-solid fa-spinner fa-spin fa-2x text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-warning">Refund not found.</div>
        <Link to="/admin/resource/Refunds" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back to Refunds
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-lock me-2" /> You don't have access to this refund.
        </div>
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">{error ?? 'Failed to load refund.'}</div>
        <button className="btn btn-outline-secondary" onClick={() => refresh()}>
          <i className="fa-solid fa-rotate me-1" /> Try again
        </button>
      </div>
    );
  }

  const canApproveReject = refund.status === RefundStatus.Requested;
  const canProcess = refund.status === RefundStatus.Approved;
  const canManualPayout = refund.status === RefundStatus.PendingManualPayout;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin/resource/Refunds" className="text-decoration-none text-muted small">
            <i className="fa-solid fa-arrow-left me-1" /> Back to Refunds
          </Link>
          <h3 className="mb-0 mt-1">
            <i className="fa-solid fa-hand-holding-dollar me-2" />
            Refund {refund.currency} {refund.amount.toFixed(2)}
          </h3>
        </div>
        <span className={`badge fs-6 ${RefundStatusBadgeClass[refund.status]}`}>
          {RefundStatusLabel[refund.status]}
        </span>
      </div>

      {actionError && (
        <div className="alert alert-danger">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {actionError}
        </div>
      )}

      {/* Actions */}
      {(canApproveReject || canProcess || canManualPayout) && (
        <div className="card shadow-sm mb-3 border-primary">
          <div className="card-body d-flex gap-2 flex-wrap">
            {canApproveReject && (
              <>
                <button className="btn btn-success" onClick={() => setModal('approve')} disabled={busy}>
                  <i className="fa-solid fa-thumbs-up me-1" /> Approve
                </button>
                <button className="btn btn-outline-danger" onClick={() => setModal('reject')} disabled={busy}>
                  <i className="fa-solid fa-thumbs-down me-1" /> Reject
                </button>
              </>
            )}
            {canProcess && (
              <button
                className="btn btn-primary"
                onClick={() => runAction(() => refundService.process(refund.id))}
                disabled={busy}
              >
                {busy ? (
                  <i className="fa-solid fa-spinner fa-spin me-1" />
                ) : (
                  <i className="fa-solid fa-money-bill-transfer me-1" />
                )}
                Process Refund
              </button>
            )}
            {canManualPayout && (
              <button className="btn btn-warning" onClick={() => setModal('manualPayout')} disabled={busy}>
                <i className="fa-solid fa-hand-holding-dollar me-1" /> Complete Manual Payout
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-circle-info me-2" />
          Refund Info
        </div>
        <div className="card-body row">
          <Field label="Booking">
            <Link to={`/admin/resource/Bookings/${refund.bookingId}`}>{refund.bookingId}</Link>
          </Field>
          <Field label="Payment">
            <Link to={`/admin/resource/Payments/${refund.paymentId}`}>{refund.paymentId}</Link>
          </Field>
          <Field label="Cancellation Request">
            {refund.cancellationRequestId ? (
              <Link to={`/admin/resource/CancellationRequests/${refund.cancellationRequestId}`}>
                {refund.cancellationRequestId}
              </Link>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Amount">
            {refund.currency} {refund.amount.toFixed(2)}
          </Field>
          <Field label="Reason">{refund.reason}</Field>
          <Field label="Gateway Refund Reference">{refund.gatewayRefundReference ?? '—'}</Field>
          <Field label="Manual Payout Reference">{refund.manualPayoutReference ?? '—'}</Field>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-light">
          <i className="fa-regular fa-clock me-2" />
          Timeline
        </div>
        <div className="card-body row">
          <Field label="Requested At">{formatDate(refund.requestedAtUtc)}</Field>
          <Field label="Refunded At">{formatDate(refund.refundedAtUtc)}</Field>
          <Field label="Created At">{formatDate(refund.createdAtUtc)}</Field>
          <Field label="Updated At">{formatDate(refund.updatedAtUtc)}</Field>
        </div>
      </div>

      {/* Approve modal */}
      {modal === 'approve' && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Approve Refund</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                <label className="form-label">Remarks (optional)</label>
                <textarea
                  className="form-control"
                  maxLength={500}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={() =>
                    runAction(() => refundService.approve(refund.id, { remarks: remarks || null }))
                  }
                  disabled={busy}
                >
                  {busy ? <i className="fa-solid fa-spinner fa-spin me-1" /> : null}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {modal === 'reject' && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject Refund</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                <label className="form-label">Reason *</label>
                <textarea
                  className="form-control"
                  maxLength={250}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() =>
                    runAction(() => refundService.reject(refund.id, { reason: rejectReason }))
                  }
                  disabled={busy || !rejectReason.trim()}
                >
                  {busy ? <i className="fa-solid fa-spinner fa-spin me-1" /> : null}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual payout modal */}
      {modal === 'manualPayout' && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Complete Manual Payout</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                <label className="form-label">Manual Payout Reference *</label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={100}
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="Bank/mobile-banking transaction reference"
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() =>
                    runAction(() =>
                      refundService.completeManualPayout(refund.id, { manualPayoutReference: payoutRef })
                    )
                  }
                  disabled={busy || !payoutRef.trim()}
                >
                  {busy ? <i className="fa-solid fa-spinner fa-spin me-1" /> : null}
                  Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

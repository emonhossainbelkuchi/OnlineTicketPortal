// src/pages/admin/RefundHistoryDetails.tsx

import { Link, useParams } from 'react-router-dom';
import { useRefundHistory } from '../../hooks/useRefundHistories';
import { RefundStatusBadgeClass, RefundStatusIcon, RefundStatusLabel } from '../../types/refundHistory.types';

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

export default function RefundHistoryDetails() {
  const { id } = useParams<{ id: string }>();
  const { item, loading, error, notFound, forbidden, refresh } = useRefundHistory(id, { live: true });

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
        <div className="alert alert-warning">Refund history entry not found.</div>
        <Link to="/admin/resource/RefundHistories" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back to Refund Histories
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-lock me-2" /> You don't have access to this record.
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">{error ?? 'Failed to load.'}</div>
        <button className="btn btn-outline-secondary" onClick={() => refresh()}>
          <i className="fa-solid fa-rotate me-1" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link
            to="/admin/resource/RefundHistories"
            className="text-decoration-none text-muted small"
          >
            <i className="fa-solid fa-arrow-left me-1" /> Back to Refund Histories
          </Link>
          <h3 className="mb-0 mt-1">
            <i className={`${RefundStatusIcon[item.status]} me-2`} />
            Refund History Entry
          </h3>
        </div>
        <span className={`badge fs-6 ${RefundStatusBadgeClass[item.status]}`}>
          {RefundStatusLabel[item.status]}
        </span>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-circle-info me-2" />
          Details
        </div>
        <div className="card-body row">
          <Field label="Refund">
            <Link to={`/admin/resource/Refunds/${item.refundId}`}>{item.refundId}</Link>
          </Field>
          <Field label="Status">{RefundStatusLabel[item.status]}</Field>
          <Field label="Changed At">{formatDate(item.changedAtUtc)}</Field>
          <Field label="Remarks">{item.remarks ?? '—'}</Field>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-light">
          <i className="fa-regular fa-clock me-2" />
          Record Timeline
        </div>
        <div className="card-body row">
          <Field label="Created At">{formatDate(item.createdAtUtc)}</Field>
          <Field label="Updated At">{formatDate(item.updatedAtUtc)}</Field>
        </div>
      </div>
    </div>
  );
}

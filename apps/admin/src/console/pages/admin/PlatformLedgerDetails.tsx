// src/pages/admin/PlatformLedgerDetails.tsx

import { Link, useParams } from 'react-router-dom';
import { usePlatformLedger } from '../../hooks/usePlatformLedgers';
import {
  DEBIT_FLAVORED_TYPES,
  SaleChannelLabel,
  StatementItemTypeIcon,
  StatementItemTypeLabel,
} from '../../types/platformLedger.types';

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

export default function PlatformLedgerDetails() {
  const { id } = useParams<{ id: string }>();
  const { item, loading, error, notFound, forbidden, refresh } = usePlatformLedger(id, { live: true });

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
        <div className="alert alert-warning">Ledger entry not found.</div>
        <Link to="/admin/resource/PlatformLedgers" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back to Platform Ledgers
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-lock me-2" /> You don't have access to this ledger entry.
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

  const debitFlavored = DEBIT_FLAVORED_TYPES.has(item.itemType);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin/resource/PlatformLedgers" className="text-decoration-none text-muted small">
            <i className="fa-solid fa-arrow-left me-1" /> Back to Platform Ledgers
          </Link>
          <h3 className="mb-0 mt-1">
            <i className={`${StatementItemTypeIcon[item.itemType]} me-2`} />
            {item.ledgerNo}
          </h3>
        </div>
        <span className={`badge fs-6 ${debitFlavored ? 'bg-danger' : 'bg-success'}`}>
          {StatementItemTypeLabel[item.itemType]}
        </span>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-circle-info me-2" />
          Entry Details
        </div>
        <div className="card-body row">
          <Field label="Ledger No">{item.ledgerNo}</Field>
          <Field label="Item Type">{StatementItemTypeLabel[item.itemType]}</Field>
          <Field label="Sale Channel">{item.saleChannel != null ? SaleChannelLabel[item.saleChannel] : '—'}</Field>
          <Field label="Currency">{item.currency}</Field>
          <Field label="Reference No">{item.referenceNo ?? '—'}</Field>
          <Field label="Description">{item.description ?? '—'}</Field>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-scale-balanced me-2" />
          Amounts
        </div>
        <div className="card-body row">
          <Field label="Debit Amount">
            <span className="text-danger">{item.debitAmount.toFixed(2)}</span>
          </Field>
          <Field label="Credit Amount">
            <span className="text-success">{item.creditAmount.toFixed(2)}</span>
          </Field>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-link me-2" />
          Related Records
        </div>
        <div className="card-body row">
          <Field label="Booking">
            {item.bookingId ? (
              <Link to={`/admin/resource/Bookings/${item.bookingId}`}>{item.bookingId}</Link>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Payment">
            {item.paymentId ? (
              <Link to={`/admin/resource/Payments/${item.paymentId}`}>{item.paymentId}</Link>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Refund">
            {item.refundId ? (
              <Link to={`/admin/resource/Refunds/${item.refundId}`}>{item.refundId}</Link>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Bus Operator">
            {item.busOperatorId ? (
              <Link to={`/admin/resource/BusOperators/${item.busOperatorId}`}>{item.busOperatorId}</Link>
            ) : (
              <span className="text-muted">Platform entry (no operator)</span>
            )}
          </Field>
          <Field label="Operator Settlement">
            {item.operatorSettlementId ? (
              <Link to={`/admin/resource/OperatorSettlements/${item.operatorSettlementId}`}>
                {item.operatorSettlementId}
              </Link>
            ) : (
              '—'
            )}
          </Field>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-light">
          <i className="fa-regular fa-clock me-2" />
          Timeline
        </div>
        <div className="card-body row">
          <Field label="Created At">{formatDate(item.createdAtUtc)}</Field>
          <Field label="Updated At">{formatDate(item.updatedAtUtc)}</Field>
        </div>
      </div>
    </div>
  );
}

// src/pages/admin/PaymentMethodConfigurationDetails.tsx

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePaymentMethodConfiguration } from '../../hooks/usePaymentMethodConfigurations';
import paymentMethodConfigurationService from '../../services/paymentMethodConfigurationService';
import { PaymentMethodIcon, PaymentMethodLabel } from '../../types/paymentMethodConfiguration.types';

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

export default function PaymentMethodConfigurationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, loading, error, notFound, forbidden, refresh } = usePaymentMethodConfiguration(id, {
    live: true,
  });

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await paymentMethodConfigurationService.remove(id);
      navigate('/admin/resource/PaymentMethodConfigurations');
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to delete this configuration.'
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <i className="fa-solid fa-spinner fa-spin fa-2x text-primary" />
        <div className="mt-2 text-muted">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-warning">
          <i className="fa-solid fa-circle-question me-2" />
          Configuration not found.
        </div>
        <Link to="/admin/resource/PaymentMethodConfigurations" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back to list
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-lock me-2" />
          Admin access required.
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {error ?? 'Failed to load.'}
        </div>
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
            to="/admin/resource/PaymentMethodConfigurations"
            className="text-decoration-none text-muted small"
          >
            <i className="fa-solid fa-arrow-left me-1" /> Back to list
          </Link>
          <h3 className="mb-0 mt-1">
            <i className={`${PaymentMethodIcon[item.method]} me-2`} />
            {item.displayName}
          </h3>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className={`badge fs-6 ${item.isActive ? 'bg-success' : 'bg-secondary'}`}>
            {item.isActive ? 'Active' : 'Inactive'}
          </span>
          <Link
            to={`/admin/payment-method-configurations/edit/${item.id}`}
            className="btn btn-outline-secondary"
          >
            <i className="fa-solid fa-pen me-1" /> Edit
          </Link>
          <button className="btn btn-outline-danger" onClick={() => setConfirmOpen(true)}>
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-circle-info me-2" />
          Configuration
        </div>
        <div className="card-body row">
          <Field label="Display Name">{item.displayName}</Field>
          <Field label="Method">{PaymentMethodLabel[item.method]}</Field>
          <Field label="Payment Provider ID">
            <code className="small">{item.paymentProviderId}</code>
          </Field>
          <Field label="Status">
            <span className={`badge ${item.isActive ? 'bg-success' : 'bg-secondary'}`}>
              {item.isActive ? 'Active' : 'Inactive'}
            </span>
          </Field>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-money-bill me-2" />
          Fees
        </div>
        <div className="card-body row">
          <Field label="Fixed Fee">{item.fixedFee != null ? item.fixedFee.toFixed(2) : '—'}</Field>
          <Field label="Percentage Fee">
            {item.percentageFee != null ? `${item.percentageFee}%` : '—'}
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

      {confirmOpen && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
                  Delete Configuration?
                </h5>
                <button className="btn-close" onClick={() => setConfirmOpen(false)} />
              </div>
              <div className="modal-body">
                <p>
                  Delete <strong>{item.displayName}</strong>? This can't be undone from here.
                </p>
                {deleteError && <div className="alert alert-danger">{deleteError}</div>}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin me-1" /> Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

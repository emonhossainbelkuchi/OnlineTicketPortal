// src/pages/admin/PaymentMethodConfigurationEdit.tsx
//
// Loads the current record, then PUTs with its RowVersion echoed back
// (optimistic concurrency — see PaymentMethodConfigurationsController.Update).
// A 409 means someone else saved a change first; this shows that distinctly
// and offers to reload the latest version rather than silently overwriting it.

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePaymentMethodConfiguration } from '../../hooks/usePaymentMethodConfigurations';
import paymentMethodConfigurationService from '../../services/paymentMethodConfigurationService';
import PaymentProviderSelect from '../../components/common/PaymentProviderSelect';
import {
  PaymentMethod,
  PaymentMethodLabel,
  type PaymentMethodConfigurationUpdateDto,
} from '../../types/paymentMethodConfiguration.types';

const METHODS = Object.values(PaymentMethod).filter(
  (v) => typeof v === 'number'
) as PaymentMethod[];

export default function PaymentMethodConfigurationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // live: false — polling while editing risks clobbering in-progress form
  // state with a background refresh; the user explicitly re-fetches via the
  // conflict banner if a 409 happens instead.
  const { item, loading, error, notFound, forbidden, refresh } = usePaymentMethodConfiguration(id, {
    live: false,
  });

  const [form, setForm] = useState<PaymentMethodConfigurationUpdateDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setForm({
        paymentProviderId: item.paymentProviderId,
        method: item.method,
        displayName: item.displayName,
        fixedFee: item.fixedFee,
        percentageFee: item.percentageFee,
        isActive: item.isActive,
        rowVersion: item.rowVersion,
      });
    }
  }, [item]);

  function validate(): boolean {
    if (!form) return false;
    const errs: Record<string, string> = {};
    if (!form.paymentProviderId) errs.paymentProviderId = 'Select a payment provider.';
    if (!form.displayName.trim()) errs.displayName = 'Display name is required.';
    if (form.displayName.length > 80) errs.displayName = 'Max 80 characters.';
    if (form.fixedFee != null && form.fixedFee < 0) errs.fixedFee = 'Cannot be negative.';
    if (form.percentageFee != null && (form.percentageFee < 0 || form.percentageFee > 100))
      errs.percentageFee = 'Must be between 0 and 100.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !form || !validate()) return;

    setSaving(true);
    setSaveError(null);
    setConflict(false);
    try {
      await paymentMethodConfigurationService.update(id, form);
      navigate(`/admin/resource/PaymentMethodConfigurations/${id}`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setConflict(true);
      } else {
        setSaveError(
          err?.response?.data?.message ?? err?.message ?? 'Failed to save changes.'
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function reloadLatest() {
    setConflict(false);
    await refresh();
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
        <div className="alert alert-warning">Configuration not found.</div>
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

  if (error || !form) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">{error ?? 'Failed to load.'}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <Link
        to={`/admin/resource/PaymentMethodConfigurations/${id}`}
        className="text-decoration-none text-muted small"
      >
        <i className="fa-solid fa-arrow-left me-1" /> Back to details
      </Link>
      <h3 className="mt-1 mb-4">
        <i className="fa-solid fa-pen me-2" />
        Edit Payment Method Configuration
      </h3>

      {conflict && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <span>
            <i className="fa-solid fa-triangle-exclamation me-2" />
            This was changed by someone else since you loaded it. Reload the latest version to
            continue.
          </span>
          <button className="btn btn-sm btn-warning" onClick={reloadLatest}>
            <i className="fa-solid fa-rotate me-1" /> Reload latest
          </button>
        </div>
      )}

      {saveError && (
        <div className="alert alert-danger">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {saveError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Payment Provider *</label>
              <PaymentProviderSelect
                value={form.paymentProviderId}
                onChange={(pid) => setForm((f) => (f ? { ...f, paymentProviderId: pid } : f))}
              />
              {fieldErrors.paymentProviderId && (
                <div className="text-danger small mt-1">{fieldErrors.paymentProviderId}</div>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Method *</label>
              <select
                className="form-select"
                value={form.method}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, method: Number(e.target.value) as PaymentMethod } : f))
                }
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PaymentMethodLabel[m]}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12">
              <label className="form-label">Display Name *</label>
              <input
                type="text"
                className={`form-control ${fieldErrors.displayName ? 'is-invalid' : ''}`}
                maxLength={80}
                value={form.displayName}
                onChange={(e) => setForm((f) => (f ? { ...f, displayName: e.target.value } : f))}
              />
              {fieldErrors.displayName && (
                <div className="invalid-feedback">{fieldErrors.displayName}</div>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Fixed Fee</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fa-solid fa-money-bill" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`form-control ${fieldErrors.fixedFee ? 'is-invalid' : ''}`}
                  value={form.fixedFee ?? ''}
                  onChange={(e) =>
                    setForm((f) =>
                      f
                        ? { ...f, fixedFee: e.target.value === '' ? null : Number(e.target.value) }
                        : f
                    )
                  }
                />
                {fieldErrors.fixedFee && <div className="invalid-feedback">{fieldErrors.fixedFee}</div>}
              </div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Percentage Fee</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fa-solid fa-percent" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className={`form-control ${fieldErrors.percentageFee ? 'is-invalid' : ''}`}
                  value={form.percentageFee ?? ''}
                  onChange={(e) =>
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            percentageFee: e.target.value === '' ? null : Number(e.target.value),
                          }
                        : f
                    )
                  }
                />
                {fieldErrors.percentageFee && (
                  <div className="invalid-feedback">{fieldErrors.percentageFee}</div>
                )}
              </div>
            </div>

            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="isActiveEdit"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => (f ? { ...f, isActive: e.target.checked } : f))}
                />
                <label className="form-check-label" htmlFor="isActiveEdit">
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="card-footer d-flex justify-content-end gap-2">
          <Link
            to={`/admin/resource/PaymentMethodConfigurations/${id}`}
            className="btn btn-outline-secondary"
          >
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving || conflict}>
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin me-1" /> Saving...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check me-1" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// src/pages/admin/PaymentMethodConfigurationCreate.tsx

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import paymentMethodConfigurationService from '../../services/paymentMethodConfigurationService';
import PaymentProviderSelect from '../../components/common/PaymentProviderSelect';
import {
  PaymentMethod,
  PaymentMethodLabel,
  type PaymentMethodConfigurationCreateDto,
} from '../../types/paymentMethodConfiguration.types';

const METHODS = Object.values(PaymentMethod).filter(
  (v) => typeof v === 'number'
) as PaymentMethod[];

export default function PaymentMethodConfigurationCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState<PaymentMethodConfigurationCreateDto>({
    paymentProviderId: '',
    method: PaymentMethod.OnlineGateway,
    displayName: '',
    fixedFee: null,
    percentageFee: null,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
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
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      const created = await paymentMethodConfigurationService.create(form);
      navigate(`/admin/resource/PaymentMethodConfigurations/${created.id}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to create payment method configuration.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <Link
        to="/admin/resource/PaymentMethodConfigurations"
        className="text-decoration-none text-muted small"
      >
        <i className="fa-solid fa-arrow-left me-1" /> Back to list
      </Link>
      <h3 className="mt-1 mb-4">
        <i className="fa-solid fa-plus me-2" />
        New Payment Method Configuration
      </h3>

      {error && (
        <div className="alert alert-danger">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Payment Provider *</label>
              <PaymentProviderSelect
                value={form.paymentProviderId}
                onChange={(id) => setForm((f) => ({ ...f, paymentProviderId: id }))}
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
                  setForm((f) => ({ ...f, method: Number(e.target.value) as PaymentMethod }))
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
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g. bKash Mobile Banking"
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
                    setForm((f) => ({
                      ...f,
                      fixedFee: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                  placeholder="0.00"
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
                    setForm((f) => ({
                      ...f,
                      percentageFee: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                  placeholder="0.00"
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
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="isActive">
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="card-footer d-flex justify-content-end gap-2">
          <Link to="/admin/resource/PaymentMethodConfigurations" className="btn btn-outline-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin me-1" /> Saving...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check me-1" /> Create
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

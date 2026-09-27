// src/pages/admin/Offers/OffersCreate.tsx

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import offerService from '../../../services/offerService';
import { useBusOperatorsForOffers } from '../../../hooks/useOffers';
import { OfferStatus, OfferStatusLabel, type OfferCreateDto } from '../../../types/offer.types';

const STATUSES = Object.values(OfferStatus).filter((v) => typeof v === 'number') as OfferStatus[];

function toDateInputValue(iso: string) {
  return iso ? iso.slice(0, 10) : '';
}

export default function OffersCreate() {
  const navigate = useNavigate();
  const { operators, loading: operatorsLoading } = useBusOperatorsForOffers();

  const [form, setForm] = useState<OfferCreateDto>({
    busOperatorId: null,
    title: '',
    description: null,
    status: OfferStatus.Active,
    startDateUtc: new Date().toISOString(),
    endDateUtc: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (form.title.length > 120) errs.title = 'Max 120 characters.';
    if ((form.description ?? '').length > 500) errs.description = 'Max 500 characters.';
    if (new Date(form.endDateUtc).getTime() <= new Date(form.startDateUtc).getTime()) {
      errs.endDateUtc = 'End date must be after start date.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      const created = await offerService.create(form);
      navigate(`/admin/resource/Offers/${created.id}`);
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? 'Admin access required to create offers.'
          : err?.response?.data?.message ?? err?.message ?? 'Failed to create offer.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <Link to="/admin/resource/Offers" className="text-decoration-none text-muted small">
        <i className="fa-solid fa-arrow-left me-1" /> Back to Offers
      </Link>
      <h3 className="mt-1 mb-4">
        <i className="fa-solid fa-plus me-2" />
        New Offer
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
            <div className="col-12">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Eid Special — 20% off all routes"
              />
              {fieldErrors.title && <div className="invalid-feedback">{fieldErrors.title}</div>}
            </div>

            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea
                className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                maxLength={500}
                rows={3}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
              />
              {fieldErrors.description && (
                <div className="invalid-feedback">{fieldErrors.description}</div>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Bus Operator</label>
              <select
                className="form-select"
                value={form.busOperatorId ?? ''}
                disabled={operatorsLoading}
                onChange={(e) =>
                  setForm((f) => ({ ...f, busOperatorId: e.target.value || null }))
                }
              >
                <option value="">Platform-wide (all operators)</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) as OfferStatus }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {OfferStatusLabel[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-control"
                value={toDateInputValue(form.startDateUtc)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDateUtc: new Date(e.target.value).toISOString() }))
                }
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">End Date *</label>
              <input
                type="date"
                className={`form-control ${fieldErrors.endDateUtc ? 'is-invalid' : ''}`}
                value={toDateInputValue(form.endDateUtc)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDateUtc: new Date(e.target.value).toISOString() }))
                }
              />
              {fieldErrors.endDateUtc && (
                <div className="invalid-feedback">{fieldErrors.endDateUtc}</div>
              )}
            </div>
          </div>
        </div>

        <div className="card-footer d-flex justify-content-end gap-2">
          <Link to="/admin/resource/Offers" className="btn btn-outline-secondary">
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

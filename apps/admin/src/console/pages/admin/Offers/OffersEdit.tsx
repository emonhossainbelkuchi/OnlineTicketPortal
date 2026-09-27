// src/pages/admin/Offers/OffersEdit.tsx

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useOffer, useBusOperatorsForOffers } from '../../../hooks/useOffers';
import offerService from '../../../services/offerService';
import { OfferStatus, OfferStatusLabel, type OfferUpdateDto } from '../../../types/offer.types';

const STATUSES = Object.values(OfferStatus).filter((v) => typeof v === 'number') as OfferStatus[];

function toDateInputValue(iso: string) {
  return iso ? iso.slice(0, 10) : '';
}

export default function OffersEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operators, loading: operatorsLoading } = useBusOperatorsForOffers();

  // live: false — polling while editing risks clobbering in-progress form
  // state; a 409 conflict banner offers an explicit reload instead.
  const { offer, loading, error, notFound, forbidden, refresh } = useOffer(id, { live: false });

  const [form, setForm] = useState<OfferUpdateDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (offer) {
      setForm({
        busOperatorId: offer.busOperatorId,
        title: offer.title,
        description: offer.description,
        status: offer.status,
        startDateUtc: offer.startDateUtc,
        endDateUtc: offer.endDateUtc,
        rowVersion: offer.rowVersion,
      });
    }
  }, [offer]);

  function validate(): boolean {
    if (!form) return false;
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
    if (!id || !form || !validate()) return;

    setSaving(true);
    setSaveError(null);
    setConflict(false);
    try {
      await offerService.update(id, form);
      navigate(`/admin/resource/Offers/${id}`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setConflict(true);
      } else if (err?.response?.status === 403) {
        setSaveError('Admin access required to edit offers.');
      } else {
        setSaveError(err?.response?.data?.message ?? err?.message ?? 'Failed to save changes.');
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
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-warning">Offer not found.</div>
        <Link to="/admin/resource/Offers" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back to Offers
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-lock me-2" /> Admin access required.
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
      <Link to={`/admin/resource/Offers/${id}`} className="text-decoration-none text-muted small">
        <i className="fa-solid fa-arrow-left me-1" /> Back to details
      </Link>
      <h3 className="mt-1 mb-4">
        <i className="fa-solid fa-pen me-2" />
        Edit Offer
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
            <div className="col-12">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className={`form-control ${fieldErrors.title ? 'is-invalid' : ''}`}
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
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
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, description: e.target.value || null } : f))
                }
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
                  setForm((f) => (f ? { ...f, busOperatorId: e.target.value || null } : f))
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
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, status: Number(e.target.value) as OfferStatus } : f))
                }
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
                  setForm((f) =>
                    f ? { ...f, startDateUtc: new Date(e.target.value).toISOString() } : f
                  )
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
                  setForm((f) =>
                    f ? { ...f, endDateUtc: new Date(e.target.value).toISOString() } : f
                  )
                }
              />
              {fieldErrors.endDateUtc && (
                <div className="invalid-feedback">{fieldErrors.endDateUtc}</div>
              )}
            </div>
          </div>
        </div>

        <div className="card-footer d-flex justify-content-end gap-2">
          <Link to={`/admin/resource/Offers/${id}`} className="btn btn-outline-secondary">
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

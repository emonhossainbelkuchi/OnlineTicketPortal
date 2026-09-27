// src/pages/admin/Offers/OffersDetails.tsx

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useOffer } from '../../../hooks/useOffers';
import offerService from '../../../services/offerService';
import { OfferStatus, OfferStatusBadgeClass, OfferStatusIcon, OfferStatusLabel } from '../../../types/offer.types';

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

export default function OffersDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { offer, loading, error, notFound, forbidden, refresh } = useOffer(id, { live: true });

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await offerService.remove(id);
      navigate('/admin/resource/Offers');
    } catch (err: any) {
      setDeleteError(
        err?.response?.status === 403
          ? 'Admin access required to delete offers.'
          : err?.response?.data?.message ?? err?.message ?? 'Failed to delete this offer.'
      );
      setDeleting(false);
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
          <i className="fa-solid fa-lock me-2" /> You don't have access to this offer.
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">{error ?? 'Failed to load.'}</div>
        <button className="btn btn-outline-secondary" onClick={() => refresh()}>
          <i className="fa-solid fa-rotate me-1" /> Try again
        </button>
      </div>
    );
  }

  const isLive =
    offer.status === OfferStatus.Active && new Date(offer.endDateUtc).getTime() >= Date.now();

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin/resource/Offers" className="text-decoration-none text-muted small">
            <i className="fa-solid fa-arrow-left me-1" /> Back to Offers
          </Link>
          <h3 className="mb-0 mt-1">
            <i className={`${OfferStatusIcon[offer.status]} me-2`} />
            {offer.title}
          </h3>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {isLive && <span className="badge bg-success bg-opacity-25 text-success">Live now</span>}
          <span className={`badge fs-6 ${OfferStatusBadgeClass[offer.status]}`}>
            {OfferStatusLabel[offer.status]}
          </span>
          <Link to={`/admin/offers/edit/${offer.id}`} className="btn btn-outline-secondary">
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
          Offer Details
        </div>
        <div className="card-body row">
          <Field label="Title">{offer.title}</Field>
          <Field label="Bus Operator">
            {offer.busOperatorId ? (
              <Link to={`/admin/resource/BusOperators/${offer.busOperatorId}`}>{offer.busOperatorId}</Link>
            ) : (
              <span className="text-muted">Platform-wide offer</span>
            )}
          </Field>
          <div className="col-12 mb-3">
            <div className="text-muted small">Description</div>
            <div>{offer.description ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-regular fa-calendar me-2" />
          Validity Period
        </div>
        <div className="card-body row">
          <Field label="Start Date">{formatDate(offer.startDateUtc)}</Field>
          <Field label="End Date">{formatDate(offer.endDateUtc)}</Field>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-light">
          <i className="fa-regular fa-clock me-2" />
          Timeline
        </div>
        <div className="card-body row">
          <Field label="Created At">{formatDate(offer.createdAtUtc)}</Field>
          <Field label="Updated At">{formatDate(offer.updatedAtUtc)}</Field>
        </div>
      </div>

      {confirmOpen && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
                  Delete Offer?
                </h5>
                <button className="btn-close" onClick={() => setConfirmOpen(false)} />
              </div>
              <div className="modal-body">
                <p>
                  Delete <strong>{offer.title}</strong>? This can't be undone from here.
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

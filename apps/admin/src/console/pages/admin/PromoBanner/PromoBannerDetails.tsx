import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getPromoBannerById,
  deletePromoBanner,
  PromoBannerResponseDto,
  PROMO_BANNER_UPDATED_EVENT,
} from '@/services/promoBannerService';
import { useAuth } from '@/lib/auth';

export const PromoBannerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { justCreated?: boolean; justUpdated?: boolean } };
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');

  const [item, setItem] = useState<PromoBannerResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [banner, setBanner] = useState(
    location.state?.justCreated ? 'Promo banner created.' : location.state?.justUpdated ? 'Promo banner updated.' : ''
  );

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getPromoBannerById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load promo banner from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener(PROMO_BANNER_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(PROMO_BANNER_UPDATED_EVENT, handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (banner) {
      const t = setTimeout(() => setBanner(''), 3000);
      return () => clearTimeout(t);
    }
  }, [banner]);

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await deletePromoBanner(item.id);
      toast.success('Promo banner deleted.');
      navigate('/admin/promo-banners');
    } catch (err: any) {
      const msg = err?.message || 'Could not delete promo banner.';
      setError(msg);
      toast.error(msg);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
        Loading promo banner from API...
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Promo banner not found — it may
        have been deleted. <Link to="/admin/promo-banners">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 820 }}>
      {banner && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2">
          <i className="fa-solid fa-circle-check" /> {banner}
        </div>
      )}
      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-exclamation me-1" /> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/promo-banners" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-image text-success me-2" />
            Promo Banner Details
          </h1>
        </div>
        {isAdmin && (
          <div className="btn-group btn-group-sm">
            <Link to={`/admin/promo-banners/edit/${item.id}`} className="btn btn-outline-primary">
              <i className="fa-solid fa-pen me-1" /> Edit
            </Link>
            <button type="button" className="btn btn-outline-danger" onClick={() => setShowDeleteModal(true)}>
              <i className="fa-solid fa-trash me-1" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3 border shadow-sm overflow-hidden mb-3">
        <div
          className="bg-light d-flex align-items-center justify-content-center"
          style={{ height: 280, overflow: 'hidden' }}
        >
          {item.imageUrl && !imageBroken ? (
            <img
              src={item.imageUrl}
              alt="Promo banner"
              className="w-100 h-100"
              style={{ objectFit: 'cover' }}
              onError={() => setImageBroken(true)}
            />
          ) : (
            <div className="text-center text-muted">
              <i className="fa-solid fa-image-slash fa-2x mb-2 d-block" />
              {imageBroken ? "Couldn't load image" : 'No image'}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-12">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Image URL</span>
            <span className="text-break">{item.imageUrl}</span>
          </div>

          <div className="col-12">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Link URL</span>
            {item.linkUrl ? (
              <a href={item.linkUrl} target="_blank" rel="noreferrer" className="text-break">
                {item.linkUrl} <i className="fa-solid fa-arrow-up-right-from-square ms-1 small" />
              </a>
            ) : (
              <span className="text-muted fst-italic">None — banner is not clickable</span>
            )}
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Status</span>
            {item.isActive ? (
              <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle">
                <i className="fa-solid fa-circle-check me-1" /> Active
              </span>
            ) : (
              <span className="badge text-bg-secondary-subtle text-secondary-emphasis border">
                <i className="fa-solid fa-circle-xmark me-1" /> Inactive
              </span>
            )}
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Display Order</span>
            <span className="badge text-bg-light border">
              <i className="fa-solid fa-arrow-up-1-9 me-1" /> {item.displayOrder}
            </span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Concurrency Token</span>
            <span className="badge text-bg-light border font-monospace">{item.rowVersion}</span>
          </div>

          <div className="col-12">
            <hr />
          </div>

          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Created: {new Date(item.createdAtUtc).toLocaleString()}
          </div>
          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Last Updated:{' '}
            {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" /> Delete Promo Banner
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">Delete this promo banner? This is a soft delete.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin me-1" /> Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-trash me-1" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoBannerDetails;

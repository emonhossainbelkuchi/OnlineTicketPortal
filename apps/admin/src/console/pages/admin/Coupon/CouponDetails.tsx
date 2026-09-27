import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCouponById, deleteCoupon, CouponResponseDto, COUPON_UPDATED_EVENT } from '@/services/couponService';
import { useAuth } from '@/lib/auth';

export const CouponDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { justCreated?: boolean; justUpdated?: boolean } };

  // Was: getCurrentUserRole() from '@/services/fareRuleService' (doesn't exist there).
  // AuthProvider already exposes exactly this via hasRole(), so use that instead.
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');

  const [item, setItem] = useState<CouponResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState(
    location.state?.justCreated ? 'Coupon created.' : location.state?.justUpdated ? 'Coupon updated.' : ''
  );

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getCouponById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load coupon from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener(COUPON_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COUPON_UPDATED_EVENT, handleUpdate);
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
      await deleteCoupon(item.id);
      toast.success('Coupon deleted.');
      navigate('/admin/coupons');
    } catch (err: any) {
      const msg = err?.message || 'Could not delete coupon.';
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
        Loading coupon from API...
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Coupon not found — it may have been deleted.{' '}
        <Link to="/admin/coupons">Back to list</Link>
      </div>
    );
  }

  const now = new Date();
  const isExpired = new Date(item.validToUtc) < now;
  const isUpcoming = new Date(item.validFromUtc) > now;
  const isExhausted = item.usageLimit != null && item.usedCount >= item.usageLimit;

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
          <Link to="/admin/coupons" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-ticket text-success me-2" />
            Coupon Details
          </h1>
        </div>
        {isAdmin && (
          <div className="btn-group btn-group-sm">
            <Link to={`/admin/coupons/edit/${item.id}`} className="btn btn-outline-primary">
              <i className="fa-solid fa-pen me-1" /> Edit
            </Link>
            <button type="button" className="btn btn-outline-danger" onClick={() => setShowDeleteModal(true)}>
              <i className="fa-solid fa-trash me-1" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Code</span>
            <span className="badge text-bg-light border font-monospace fs-6">{item.code}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Type</span>
            <span className="badge text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">{item.type}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Status</span>
            {!item.isActive ? (
              <span className="badge text-bg-secondary-subtle text-secondary-emphasis border">
                <i className="fa-solid fa-circle-xmark me-1" /> Inactive
              </span>
            ) : isExpired ? (
              <span className="badge text-bg-secondary-subtle text-secondary-emphasis border">
                <i className="fa-solid fa-calendar-xmark me-1" /> Expired
              </span>
            ) : isUpcoming ? (
              <span className="badge text-bg-info-subtle text-info-emphasis border border-info-subtle">
                <i className="fa-solid fa-clock me-1" /> Upcoming
              </span>
            ) : isExhausted ? (
              <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                <i className="fa-solid fa-ban me-1" /> Exhausted
              </span>
            ) : (
              <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle">
                <i className="fa-solid fa-circle-check me-1" /> Active
              </span>
            )}
          </div>

          {item.description && (
            <div className="col-12">
              <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Description</span>
              <span>{item.description}</span>
            </div>
          )}

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Discount</span>
            <span className="fw-bold fs-6">
              {item.type === 'Percentage'
                ? `${item.discountPercentage ?? 0}%${item.maxDiscountAmount ? ` (cap ${item.maxDiscountAmount})` : ''}`
                : `${item.discountAmount ?? 0} flat`}
            </span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Min. Booking Amount</span>
            <span>{item.minBookingAmount != null ? item.minBookingAmount : <span className="text-muted fst-italic">None</span>}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Usage</span>
            <span>
              {item.usedCount} used
              {item.usageLimit != null ? ` / ${item.usageLimit} limit` : ' · unlimited'}
              {item.perUserLimit ? ` · max ${item.perUserLimit}/user` : ''}
            </span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Valid From</span>
            <span>{new Date(item.validFromUtc).toLocaleString()}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Valid To</span>
            <span>{new Date(item.validToUtc).toLocaleString()}</span>
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
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" /> Delete Coupon
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete coupon <strong>{item.code}</strong>? It has been used {item.usedCount} time(s). This is a soft
                  delete.
                </p>
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

export default CouponDetails;
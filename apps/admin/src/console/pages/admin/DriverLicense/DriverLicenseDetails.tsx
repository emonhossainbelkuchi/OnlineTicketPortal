import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getDriverLicenseById,
  deleteDriverLicense,
  DriverLicenseResponseDto,
  LicenseTypeLabel,
  DRIVER_LICENSE_UPDATED_EVENT,
} from '@/services/driverLicenseService';
import { useAuth } from '@/lib/auth';

const EXPIRING_SOON_DAYS = 30;

export const DriverLicenseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { justCreated?: boolean; justUpdated?: boolean } };
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'Staff', 'Operator');

  const [item, setItem] = useState<DriverLicenseResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState(
    location.state?.justCreated ? 'Driver license created.' : location.state?.justUpdated ? 'Driver license updated.' : ''
  );

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const data = await getDriverLicenseById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) setForbidden(true);
      else setError(err?.message || 'Could not load driver license from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener(DRIVER_LICENSE_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(DRIVER_LICENSE_UPDATED_EVENT, handleUpdate);
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
      await deleteDriverLicense(item.id);
      toast.success('Driver license deleted.');
      navigate('/admin/driver-licenses');
    } catch (err: any) {
      const msg = err?.message || 'Could not delete driver license.';
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
        Loading driver license from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-danger">
        <i className="fa-solid fa-lock me-1" /> You don't have access to this driver license — it
        belongs to a different operator. <Link to="/admin/driver-licenses">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Driver license not found — it may
        have been deleted. <Link to="/admin/driver-licenses">Back to list</Link>
      </div>
    );
  }

  const now = new Date();
  const expiry = new Date(item.expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft < 0;
  const isExpiringSoon = !isExpired && daysLeft <= EXPIRING_SOON_DAYS;

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
      {isExpired && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-xmark me-1" /> This license expired{' '}
          {Math.abs(daysLeft)} day(s) ago.
        </div>
      )}
      {isExpiringSoon && (
        <div className="alert alert-warning py-2 small">
          <i className="fa-solid fa-triangle-exclamation me-1" /> This license expires in {daysLeft} day(s).
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/driver-licenses" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-id-card text-success me-2" />
            Driver License Details
          </h1>
        </div>
        {canManage && (
          <div className="btn-group btn-group-sm">
            <Link to={`/admin/driver-licenses/edit/${item.id}`} className="btn btn-outline-primary">
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
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">License Number</span>
            <span className="badge text-bg-light border font-monospace fs-6">{item.licenseNumber}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Type</span>
            <span className="badge text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
              {LicenseTypeLabel[item.type]}
            </span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Status</span>
            {isExpired ? (
              <span className="badge text-bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                <i className="fa-solid fa-circle-xmark me-1" /> Expired
              </span>
            ) : isExpiringSoon ? (
              <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                <i className="fa-solid fa-triangle-exclamation me-1" /> Expiring Soon
              </span>
            ) : (
              <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle">
                <i className="fa-solid fa-circle-check me-1" /> Valid
              </span>
            )}
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Issue Date</span>
            <span>{new Date(item.issueDate).toLocaleDateString()}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Expiry Date</span>
            <span>{new Date(item.expiryDate).toLocaleDateString()}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Staff Profile ID</span>
            <span className="badge text-bg-light border font-monospace small">{item.staffProfileId}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Concurrency Token</span>
            <span className="badge text-bg-light border font-monospace small">{item.rowVersion}</span>
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
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" /> Delete Driver License
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete license <strong>{item.licenseNumber}</strong>? This is a soft delete.
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

export default DriverLicenseDetails;

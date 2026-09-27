import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getComplaintById,
  updateComplaintStatus,
  deleteComplaint,
  ComplaintResponseDto,
  ComplaintStatus,
  COMPLAINT_UPDATED_EVENT,
} from '@/services/complaintService';
import { getCurrentUserRole } from '@/services/fareRuleService';

const STATUS_STYLE: Record<string, { cls: string; icon: string }> = {
  Open: { cls: 'text-bg-danger-subtle text-danger-emphasis border-danger-subtle', icon: 'fa-circle-exclamation' },
  InProgress: { cls: 'text-bg-warning-subtle text-warning-emphasis border-warning-subtle', icon: 'fa-clock' },
  Resolved: { cls: 'text-bg-success-subtle text-success-emphasis border-success-subtle', icon: 'fa-circle-check' },
  Closed: { cls: 'text-bg-secondary-subtle text-secondary-emphasis border-secondary-subtle', icon: 'fa-box-archive' },
};

export const ComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { justCreated?: boolean; justUpdated?: boolean } };
  const role = getCurrentUserRole();
  const isStaff = role === 'Admin' || role === 'Staff' || role === 'Operator';

  const [item, setItem] = useState<ComplaintResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusDraft, setStatusDraft] = useState<ComplaintStatus>('Open');
  const [changingStatus, setChangingStatus] = useState(false);
  const [banner, setBanner] = useState(
    location.state?.justCreated ? 'Complaint filed.' : location.state?.justUpdated ? 'Complaint updated.' : ''
  );

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const data = await getComplaintById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setStatusDraft(data.status);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setError(err?.message || 'Could not load complaint from the API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener(COMPLAINT_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COMPLAINT_UPDATED_EVENT, handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (banner) {
      const t = setTimeout(() => setBanner(''), 3000);
      return () => clearTimeout(t);
    }
  }, [banner]);

  const handleStatusChange = async () => {
    if (!item) return;
    setChangingStatus(true);
    try {
      const updated = await updateComplaintStatus(item.id, { status: statusDraft });
      setItem(updated);
      toast.success(`Status updated to ${updated.status}.`);
    } catch (err: any) {
      const msg = err?.message || 'Could not update status.';
      setError(msg);
      toast.error(msg);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await deleteComplaint(item.id);
      toast.success('Complaint deleted.');
      navigate('/admin/complaints');
    } catch (err: any) {
      const msg = err?.message || 'Could not delete complaint.';
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
        Loading complaint from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-lock me-1" /> This complaint belongs to another customer — you don't have
        permission to view it. <Link to="/admin/complaints">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Complaint not found — it may have been deleted.{' '}
        <Link to="/admin/complaints">Back to list</Link>
      </div>
    );
  }

  const statusStyle = STATUS_STYLE[item.status] || { cls: 'text-bg-light', icon: 'fa-circle' };

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
          <Link to="/admin/complaints" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
            Complaint Details
          </h1>
        </div>
        <div className="btn-group btn-group-sm">
          <Link to={`/admin/complaints/edit/${item.id}`} className="btn btn-outline-primary">
            <i className="fa-solid fa-pen me-1" /> Edit
          </Link>
          {isStaff && (
            <button type="button" className="btn btn-outline-danger" onClick={() => setShowDeleteModal(true)}>
              <i className="fa-solid fa-trash me-1" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-md-8">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Subject</span>
            <span className="fw-semibold fs-6">{item.subject}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Status</span>
            <span className={`badge border ${statusStyle.cls}`}>
              <i className={`fa-solid ${statusStyle.icon} me-1`} /> {item.status}
            </span>
          </div>

          <div className="col-12">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Description</span>
            <p className="mb-0">{item.description}</p>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Related Booking</span>
            {item.bookingId ? (
              <span className="font-monospace small">{item.bookingId}</span>
            ) : (
              <span className="text-muted fst-italic">—</span>
            )}
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Customer Profile</span>
            <span className="font-monospace small">{item.customerProfileId}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Resolved At</span>
            <span>{item.resolvedAtUtc ? new Date(item.resolvedAtUtc).toLocaleString() : <span className="text-muted fst-italic">Not resolved</span>}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Concurrency Token</span>
            <span className="badge text-bg-light border font-monospace">{item.rowVersion}</span>
          </div>

          <div className="col-12">
            <hr />
          </div>

          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Filed: {new Date(item.createdAtUtc).toLocaleString()}
          </div>
          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Last Updated:{' '}
            {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {isStaff && (
        <div className="bg-white rounded-3 border shadow-sm p-4 mt-3">
          <h2 className="h6 fw-bold mb-2">
            <i className="fa-solid fa-headset text-primary me-2" />
            Update Status (Staff Only)
          </h2>
          <p className="text-muted small mb-3">
            This is the only way a complaint's status actually moves — <code>ResolvedAtUtc</code> is stamped
            automatically the moment it becomes Resolved/Closed, and cleared again if reopened.
          </p>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 220 }}
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as ComplaintStatus)}
            >
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleStatusChange}
              disabled={changingStatus || statusDraft === item.status}
            >
              {changingStatus ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin me-1" /> Updating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check me-1" /> Update Status
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" /> Delete Complaint
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete complaint <strong>{item.subject}</strong>? This is a soft delete.
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

export default ComplaintDetails;

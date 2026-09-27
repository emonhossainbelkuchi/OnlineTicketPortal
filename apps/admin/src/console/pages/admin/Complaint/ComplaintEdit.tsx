import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getComplaintById,
  updateComplaint,
  ComplaintResponseDto,
  ComplaintUpdateDto,
  COMPLAINT_UPDATED_EVENT,
} from '@/services/complaintService';

export const ComplaintEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [original, setOriginal] = useState<ComplaintResponseDto | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);

  const [bookingId, setBookingId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const applyItem = (item: ComplaintResponseDto) => {
    setOriginal(item);
    setBookingId(item.bookingId || '');
    setSubject(item.subject);
    setDescription(item.description);
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    setForbidden(false);
    try {
      const item = await getComplaintById(id);
      if (!item) {
        setNotFound(true);
      } else {
        applyItem(item);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setLoadError(err?.message || 'Could not load complaint from the API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleExternalUpdate = () => {
      if (!id) return;
      getComplaintById(id)
        .then((latest) => {
          if (!latest) return;
          setOriginal((prev) => {
            if (prev && prev.rowVersion !== latest.rowVersion) setStaleWarning(true);
            return prev;
          });
        })
        .catch(() => {
          /* ignore transient sync-check errors */
        });
    };
    window.addEventListener(COMPLAINT_UPDATED_EVENT, handleExternalUpdate);
    return () => window.removeEventListener(COMPLAINT_UPDATED_EVENT, handleExternalUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!subject.trim()) errs.subject = 'Subject is required.';
    if (subject.length > 120) errs.subject = 'Subject must be 120 characters or fewer.';
    if (!description.trim()) errs.description = 'Description is required.';
    if (description.length > 1000) errs.description = 'Description must be 1000 characters or fewer.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!original || !id) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const dto: ComplaintUpdateDto = {
        bookingId: bookingId.trim() || null,
        subject: subject.trim(),
        description: description.trim(),
        rowVersion: original.rowVersion,
      };
      const updated = await updateComplaint(id, dto);
      toast.success('Complaint updated.');
      navigate(`/admin/complaints/${updated.id}`, { state: { justUpdated: true } });
    } catch (err: any) {
      const msg = err?.message || 'Could not update complaint.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const refreshFromServer = async () => {
    setStaleWarning(false);
    await load();
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
        permission to edit it. <Link to="/admin/complaints">Back to list</Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Complaint not found.{' '}
        <Link to="/admin/complaints">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/complaints" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-pen text-primary me-2" />
          Edit Complaint
        </h1>
      </div>

      {staleWarning && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center py-2">
          <span className="small">
            <i className="fa-solid fa-tower-broadcast me-1" />
            This complaint was changed elsewhere just now. Refresh to load the latest version.
          </span>
          <button type="button" className="btn btn-sm btn-warning" onClick={refreshFromServer}>
            <i className="fa-solid fa-rotate me-1" /> Refresh
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-3 border shadow-sm">
        {(error || loadError) && (
          <div className="alert alert-danger py-2 small">
            <i className="fa-solid fa-circle-exclamation me-1" /> {error || loadError}
          </div>
        )}

        {original && (
          <div className="alert alert-secondary py-2 small mb-3">
            <i className="fa-solid fa-lock me-1" /> Status ({original.status}) can only be changed by support staff
            from the complaint's details page — not here.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-semibold">
                Subject <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                maxLength={120}
                className={`form-control form-control-sm ${fieldErrors.subject ? 'is-invalid' : ''}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              {fieldErrors.subject && <div className="invalid-feedback">{fieldErrors.subject}</div>}
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                rows={5}
                maxLength={1000}
                className={`form-control form-control-sm ${fieldErrors.description ? 'is-invalid' : ''}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="form-text text-end">{description.length} / 1000</div>
              {fieldErrors.description && <div className="invalid-feedback d-block">{fieldErrors.description}</div>}
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Related Booking ID (optional)</label>
              <input
                type="text"
                className="form-control form-control-sm font-monospace"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
              />
              <div className="form-text">Must be a booking that belongs to you, or the API will reject it.</div>
            </div>

            {original && (
              <div className="col-12">
                <span className="badge text-bg-light border font-monospace">
                  <i className="fa-solid fa-code-branch me-1" /> RowVersion: {original.rowVersion}
                </span>
              </div>
            )}
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Link to={`/admin/complaints/${id}`} className="btn btn-outline-secondary btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin me-1" /> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-1" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintEdit;

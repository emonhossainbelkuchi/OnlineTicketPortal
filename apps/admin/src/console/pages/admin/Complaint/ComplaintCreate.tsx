import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createComplaint, ComplaintCreateDto } from '@/services/complaintService';

export const ComplaintCreate: React.FC = () => {
  const navigate = useNavigate();

  const [bookingId, setBookingId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    if (!validate()) return;

    setSaving(true);
    try {
      const dto: ComplaintCreateDto = {
        bookingId: bookingId.trim() || null,
        subject: subject.trim(),
        description: description.trim(),
      };
      const created = await createComplaint(dto);
      toast.success('Complaint filed.');
      navigate(`/admin/complaints/${created.id}`, { state: { justCreated: true } });
    } catch (err: any) {
      const msg = err?.message || "Could not file complaint — does that booking belong to you?";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-4" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/complaints" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
          New Complaint
        </h1>
      </div>

      <div className="bg-white p-4 rounded-3 border shadow-sm">
        {error && (
          <div className="alert alert-danger py-2 small">
            <i className="fa-solid fa-circle-exclamation me-1" /> {error}
          </div>
        )}

        <div className="alert alert-info py-2 small mb-3">
          <i className="fa-solid fa-circle-info me-1" />
          This will be filed under your own account — it's resolved automatically from your
          login. Status can only be changed by support staff afterwards.
        </div>

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
                placeholder="Short summary of the issue"
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
                placeholder="Describe what happened in detail"
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
                placeholder="Paste a booking GUID if this is about a specific booking"
              />
              <div className="form-text">Must be a booking that belongs to you, or the API will reject it.</div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Link to="/admin/complaints" className="btn btn-outline-secondary btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin me-1" /> Submitting...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane me-1" /> File Complaint
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintCreate;

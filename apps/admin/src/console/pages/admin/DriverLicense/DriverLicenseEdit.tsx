import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getDriverLicenseById,
  updateDriverLicense,
  DriverLicenseResponseDto,
  DriverLicenseUpdateDto,
  LicenseType,
  DRIVER_LICENSE_UPDATED_EVENT,
} from '@/services/driverLicenseService';

export const DriverLicenseEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [original, setOriginal] = useState<DriverLicenseResponseDto | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);

  const [licenseNumber, setLicenseNumber] = useState('');
  const [type, setType] = useState<LicenseType>(LicenseType.Light);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const applyItem = (item: DriverLicenseResponseDto) => {
    setOriginal(item);
    setLicenseNumber(item.licenseNumber);
    setType(item.type);
    setIssueDate(item.issueDate.slice(0, 10));
    setExpiryDate(item.expiryDate.slice(0, 10));
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    setForbidden(false);
    try {
      const item = await getDriverLicenseById(id);
      if (!item) {
        setNotFound(true);
      } else {
        applyItem(item);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) setForbidden(true);
      else setLoadError(err?.message || 'Could not load driver license from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleExternalUpdate = () => {
      if (!id) return;
      getDriverLicenseById(id)
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
    window.addEventListener(DRIVER_LICENSE_UPDATED_EVENT, handleExternalUpdate);
    return () => window.removeEventListener(DRIVER_LICENSE_UPDATED_EVENT, handleExternalUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!licenseNumber.trim()) errs.licenseNumber = 'License number is required.';
    if (!issueDate) errs.issueDate = 'Issue date is required.';
    if (!expiryDate) errs.expiryDate = 'Expiry date is required.';
    if (issueDate && expiryDate && new Date(expiryDate) <= new Date(issueDate)) {
      errs.expiryDate = 'Expiry date must be after issue date.';
    }
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
      const dto: DriverLicenseUpdateDto = {
        licenseNumber: licenseNumber.trim(),
        type,
        issueDate,
        expiryDate,
        rowVersion: original.rowVersion,
      };
      const updated = await updateDriverLicense(id, dto);
      toast.success('Driver license updated.');
      navigate(`/admin/driver-licenses/${updated.id}`, { state: { justUpdated: true } });
    } catch (err: any) {
      const msg = err?.message || 'Could not update driver license.';
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
        Loading driver license from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-danger">
        <i className="fa-solid fa-lock me-1" /> You don't have access to edit this driver license.{' '}
        <Link to="/admin/driver-licenses">Back to list</Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Driver license not found.{' '}
        <Link to="/admin/driver-licenses">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 700 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/driver-licenses" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-pen text-primary me-2" />
          Edit Driver License
        </h1>
      </div>

      {staleWarning && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center py-2">
          <span className="small">
            <i className="fa-solid fa-tower-broadcast me-1" />
            This license was changed elsewhere just now. Refresh to load the latest version.
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            {original && (
              <div className="col-12">
                <label className="form-label small fw-semibold">Staff Member</label>
                <div>
                  <span className="badge text-bg-light border font-monospace small">
                    {original.staffProfileId}
                  </span>
                </div>
                <div className="form-text">
                  <i className="fa-solid fa-lock me-1" />
                  Can't be reassigned — re-pointing a license to a different employee is a new
                  record, not an edit.
                </div>
              </div>
            )}

            <div className="col-md-6">
              <label className="form-label small fw-semibold">
                License Number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                maxLength={40}
                className={`form-control form-control-sm ${fieldErrors.licenseNumber ? 'is-invalid' : ''}`}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
              {fieldErrors.licenseNumber && <div className="invalid-feedback">{fieldErrors.licenseNumber}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Type</label>
              <select
                className="form-select form-select-sm"
                value={type}
                onChange={(e) => setType(Number(e.target.value) as LicenseType)}
              >
                <option value={LicenseType.Light}>Light</option>
                <option value={LicenseType.Heavy}>Heavy</option>
                <option value={LicenseType.Commercial}>Commercial</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">
                Issue Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`form-control form-control-sm ${fieldErrors.issueDate ? 'is-invalid' : ''}`}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
              {fieldErrors.issueDate && <div className="invalid-feedback">{fieldErrors.issueDate}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">
                Expiry Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`form-control form-control-sm ${fieldErrors.expiryDate ? 'is-invalid' : ''}`}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              {fieldErrors.expiryDate && <div className="invalid-feedback">{fieldErrors.expiryDate}</div>}
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
            <Link to={`/admin/driver-licenses/${id}`} className="btn btn-outline-secondary btn-sm">
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

export default DriverLicenseEdit;

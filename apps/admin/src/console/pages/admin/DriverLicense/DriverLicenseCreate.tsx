import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createDriverLicense, DriverLicenseCreateDto, LicenseType } from '@/services/driverLicenseService';
import StaffProfileSelect from '@/components/common/StaffProfileSelect';

const todayInput = () => new Date().toISOString().slice(0, 10);

export const DriverLicenseCreate: React.FC = () => {
  const navigate = useNavigate();

  const [staffProfileId, setStaffProfileId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [type, setType] = useState<LicenseType>(LicenseType.Light);
  const [issueDate, setIssueDate] = useState(todayInput());
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().slice(0, 10);
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!staffProfileId) errs.staffProfileId = 'Please select a staff member.';
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
    if (!validate()) return;

    setSaving(true);
    try {
      const dto: DriverLicenseCreateDto = {
        staffProfileId,
        licenseNumber: licenseNumber.trim(),
        type,
        issueDate,
        expiryDate,
      };
      const created = await createDriverLicense(dto);
      toast.success('Driver license created.');
      navigate(`/admin/driver-licenses/${created.id}`, { state: { justCreated: true } });
    } catch (err: any) {
      // A 400 here typically means the chosen staff member isn't your own operator's —
      // see DriverLicensesController.Create.
      const msg = err?.message || 'Could not create driver license — is that staff member yours?';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-4" style={{ maxWidth: 700 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/driver-licenses" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-id-card text-success me-2" />
          New Driver License
        </h1>
      </div>

      <div className="bg-white p-4 rounded-3 border shadow-sm">
        {error && (
          <div className="alert alert-danger py-2 small">
            <i className="fa-solid fa-circle-exclamation me-1" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-semibold">
                Staff Member <span className="text-danger">*</span>
              </label>
              <StaffProfileSelect value={staffProfileId} onChange={setStaffProfileId} driversOnly />
              {fieldErrors.staffProfileId && (
                <div className="text-danger small mt-1">{fieldErrors.staffProfileId}</div>
              )}
            </div>

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
                placeholder="e.g. DL-2026-00123"
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
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Link to="/admin/driver-licenses" className="btn btn-outline-secondary btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin me-1" /> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-1" /> Create License
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverLicenseCreate;

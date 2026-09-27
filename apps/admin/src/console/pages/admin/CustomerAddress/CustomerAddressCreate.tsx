import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createCustomerAddress, CustomerAddressCreateDto } from '@/services/customerAddressService';

export const CustomerAddressCreate: React.FC = () => {
  const navigate = useNavigate();

  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [isDefault, setIsDefault] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!label.trim()) errs.label = 'Label is required.';
    if (!addressLine.trim()) errs.addressLine = 'Address line is required.';
    if (!city.trim()) errs.city = 'City is required.';
    if (!district.trim()) errs.district = 'District is required.';
    if (!country.trim()) errs.country = 'Country is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const dto: CustomerAddressCreateDto = {
        label: label.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        district: district.trim(),
        country: country.trim() || 'Bangladesh',
        isDefault,
      };
      const created = await createCustomerAddress(dto);
      toast.success('Address created.');
      navigate(`/admin/customer-addresses/${created.id}`, { state: { justCreated: true } });
    } catch (err: any) {
      const msg = err?.message || 'Could not create address.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-4" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/customer-addresses" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-address-book text-info me-2" />
          New Address
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
          This will be saved under your own customer profile — it's resolved automatically from
          your login, not something you pick here.
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">
                Label <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                maxLength={40}
                className={`form-control form-control-sm ${fieldErrors.label ? 'is-invalid' : ''}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Home, Office"
              />
              {fieldErrors.label && <div className="invalid-feedback">{fieldErrors.label}</div>}
            </div>

            <div className="col-md-8">
              <label className="form-label small fw-semibold">
                Address Line <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                maxLength={250}
                className={`form-control form-control-sm ${fieldErrors.addressLine ? 'is-invalid' : ''}`}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="House/road/area"
              />
              {fieldErrors.addressLine && <div className="invalid-feedback">{fieldErrors.addressLine}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">
                City <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control form-control-sm ${fieldErrors.city ? 'is-invalid' : ''}`}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              {fieldErrors.city && <div className="invalid-feedback">{fieldErrors.city}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">
                District <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control form-control-sm ${fieldErrors.district ? 'is-invalid' : ''}`}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
              {fieldErrors.district && <div className="invalid-feedback">{fieldErrors.district}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">
                Country <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control form-control-sm ${fieldErrors.country ? 'is-invalid' : ''}`}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              {fieldErrors.country && <div className="invalid-feedback">{fieldErrors.country}</div>}
            </div>

            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="addressDefaultSwitch"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="addressDefaultSwitch">
                  Set as default address
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Link to="/admin/customer-addresses" className="btn btn-outline-secondary btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin me-1" /> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-1" /> Create Address
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerAddressCreate;

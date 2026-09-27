import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getCustomerAddressById,
  updateCustomerAddress,
  CustomerAddressResponseDto,
  CustomerAddressUpdateDto,
  CUSTOMER_ADDRESS_UPDATED_EVENT,
} from '@/services/customerAddressService';

export const CustomerAddressEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [original, setOriginal] = useState<CustomerAddressResponseDto | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);

  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [isDefault, setIsDefault] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const applyItem = (item: CustomerAddressResponseDto) => {
    setOriginal(item);
    setLabel(item.label);
    setAddressLine(item.addressLine);
    setCity(item.city);
    setDistrict(item.district);
    setCountry(item.country);
    setIsDefault(item.isDefault);
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    setForbidden(false);
    try {
      const item = await getCustomerAddressById(id);
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
        setLoadError(err?.message || 'Could not load address from the API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleExternalUpdate = () => {
      if (!id) return;
      getCustomerAddressById(id)
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
    window.addEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, handleExternalUpdate);
    return () => window.removeEventListener(CUSTOMER_ADDRESS_UPDATED_EVENT, handleExternalUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    if (!original || !id) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const dto: CustomerAddressUpdateDto = {
        label: label.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        district: district.trim(),
        country: country.trim() || 'Bangladesh',
        isDefault,
        rowVersion: original.rowVersion,
      };
      const updated = await updateCustomerAddress(id, dto);
      toast.success('Address updated.');
      navigate(`/admin/customer-addresses/${updated.id}`, { state: { justUpdated: true } });
    } catch (err: any) {
      const msg = err?.message || 'Could not update address.';
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
        Loading address from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-lock me-1" /> This address belongs to another customer — you don't have permission
        to edit it. <Link to="/admin/customer-addresses">Back to list</Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Address not found.{' '}
        <Link to="/admin/customer-addresses">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/customer-addresses" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-pen text-primary me-2" />
          Edit Address
        </h1>
      </div>

      {staleWarning && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center py-2">
          <span className="small">
            <i className="fa-solid fa-tower-broadcast me-1" />
            This address was changed elsewhere just now. Refresh to load the latest version.
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
                  id="addressDefaultSwitchEdit"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="addressDefaultSwitchEdit">
                  Set as default address
                </label>
              </div>
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
            <Link to={`/admin/customer-addresses/${id}`} className="btn btn-outline-secondary btn-sm">
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

export default CustomerAddressEdit;

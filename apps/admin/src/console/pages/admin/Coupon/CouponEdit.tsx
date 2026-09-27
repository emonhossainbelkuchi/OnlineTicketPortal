import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getCouponById,
  updateCoupon,
  CouponResponseDto,
  CouponUpdateDto,
  CouponType,
  COUPON_UPDATED_EVENT,
} from '@/services/couponService';

const toLocalDateTimeInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const CouponEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [original, setOriginal] = useState<CouponResponseDto | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CouponType>('Percentage');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [minBookingAmount, setMinBookingAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('');
  const [validFromUtc, setValidFromUtc] = useState('');
  const [validToUtc, setValidToUtc] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const applyItem = (item: CouponResponseDto) => {
    setOriginal(item);
    setCode(item.code);
    setDescription(item.description || '');
    setType(item.type);
    setDiscountAmount(item.discountAmount != null ? String(item.discountAmount) : '');
    setDiscountPercentage(item.discountPercentage != null ? String(item.discountPercentage) : '');
    setMaxDiscountAmount(item.maxDiscountAmount != null ? String(item.maxDiscountAmount) : '');
    setMinBookingAmount(item.minBookingAmount != null ? String(item.minBookingAmount) : '');
    setUsageLimit(item.usageLimit != null ? String(item.usageLimit) : '');
    setPerUserLimit(item.perUserLimit != null ? String(item.perUserLimit) : '');
    setValidFromUtc(toLocalDateTimeInput(item.validFromUtc));
    setValidToUtc(toLocalDateTimeInput(item.validToUtc));
    setIsActive(item.isActive);
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const item = await getCouponById(id);
      if (!item) {
        setNotFound(true);
      } else {
        applyItem(item);
        setNotFound(false);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load coupon from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleExternalUpdate = () => {
      if (!id) return;
      getCouponById(id)
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
    window.addEventListener(COUPON_UPDATED_EVENT, handleExternalUpdate);
    return () => window.removeEventListener(COUPON_UPDATED_EVENT, handleExternalUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = 'Code is required.';
    if (type === 'Percentage') {
      if (!discountPercentage || Number(discountPercentage) <= 0 || Number(discountPercentage) > 100) {
        errs.discountPercentage = 'Percentage must be between 1 and 100.';
      }
    } else if (!discountAmount || Number(discountAmount) <= 0) {
      errs.discountAmount = 'Discount amount must be greater than zero.';
    }
    if (!validFromUtc) errs.validFromUtc = 'Valid-from date is required.';
    if (!validToUtc) errs.validToUtc = 'Valid-to date is required.';
    if (validFromUtc && validToUtc && new Date(validToUtc) <= new Date(validFromUtc)) {
      errs.validToUtc = 'Valid-to must be after valid-from.';
    }
    if (usageLimit && Number(usageLimit) < 1) errs.usageLimit = 'Usage limit must be at least 1.';
    if (perUserLimit && Number(perUserLimit) < 1) errs.perUserLimit = 'Per-user limit must be at least 1.';
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
      const dto: CouponUpdateDto = {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        type,
        discountAmount: type === 'FixedAmount' ? Number(discountAmount) : null,
        discountPercentage: type === 'Percentage' ? Number(discountPercentage) : null,
        maxDiscountAmount: type === 'Percentage' && maxDiscountAmount ? Number(maxDiscountAmount) : null,
        minBookingAmount: minBookingAmount ? Number(minBookingAmount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: perUserLimit ? Number(perUserLimit) : null,
        validFromUtc: new Date(validFromUtc).toISOString(),
        validToUtc: new Date(validToUtc).toISOString(),
        isActive,
        rowVersion: original.rowVersion,
      };
      const updated = await updateCoupon(id, dto);
      toast.success('Coupon updated.');
      navigate(`/admin/coupons/${updated.id}`, { state: { justUpdated: true } });
    } catch (err: any) {
      const msg = err?.message || 'Could not update coupon.';
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
        Loading coupon from API...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Coupon not found.{' '}
        <Link to="/admin/coupons">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/coupons" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-pen text-primary me-2" />
          Edit Coupon
        </h1>
      </div>

      {staleWarning && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center py-2">
          <span className="small">
            <i className="fa-solid fa-tower-broadcast me-1" />
            This coupon was changed elsewhere just now. Refresh to load the latest version.
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
                Code <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                maxLength={40}
                className={`form-control form-control-sm text-uppercase ${fieldErrors.code ? 'is-invalid' : ''}`}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              {fieldErrors.code && <div className="invalid-feedback">{fieldErrors.code}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Type</label>
              <select className="form-select form-select-sm" value={type} onChange={(e) => setType(e.target.value as CouponType)}>
                <option value="Percentage">Percentage</option>
                <option value="FixedAmount">Fixed Amount</option>
              </select>
            </div>

            <div className="col-md-4">
              <div className="form-check form-switch mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="couponActiveSwitchEdit"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="couponActiveSwitchEdit">
                  Active
                </label>
              </div>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Description</label>
              <input
                type="text"
                maxLength={250}
                className="form-control form-control-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {type === 'Percentage' ? (
              <>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">
                    Discount % <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step="0.01"
                    className={`form-control form-control-sm ${fieldErrors.discountPercentage ? 'is-invalid' : ''}`}
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                  />
                  {fieldErrors.discountPercentage && <div className="invalid-feedback">{fieldErrors.discountPercentage}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Max Discount Cap</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="form-control form-control-sm"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </>
            ) : (
              <div className="col-md-4">
                <label className="form-label small fw-semibold">
                  Discount Amount <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className={`form-control form-control-sm ${fieldErrors.discountAmount ? 'is-invalid' : ''}`}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
                {fieldErrors.discountAmount && <div className="invalid-feedback">{fieldErrors.discountAmount}</div>}
              </div>
            )}

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Min. Booking Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="form-control form-control-sm"
                value={minBookingAmount}
                onChange={(e) => setMinBookingAmount(e.target.value)}
                placeholder="optional"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Usage Limit (total)</label>
              <input
                type="number"
                min={1}
                className={`form-control form-control-sm ${fieldErrors.usageLimit ? 'is-invalid' : ''}`}
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="unlimited if blank"
              />
              {fieldErrors.usageLimit && <div className="invalid-feedback">{fieldErrors.usageLimit}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Per-User Limit</label>
              <input
                type="number"
                min={1}
                className={`form-control form-control-sm ${fieldErrors.perUserLimit ? 'is-invalid' : ''}`}
                value={perUserLimit}
                onChange={(e) => setPerUserLimit(e.target.value)}
                placeholder="unlimited if blank"
              />
              {fieldErrors.perUserLimit && <div className="invalid-feedback">{fieldErrors.perUserLimit}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">
                Valid From <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                className={`form-control form-control-sm ${fieldErrors.validFromUtc ? 'is-invalid' : ''}`}
                value={validFromUtc}
                onChange={(e) => setValidFromUtc(e.target.value)}
              />
              {fieldErrors.validFromUtc && <div className="invalid-feedback">{fieldErrors.validFromUtc}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">
                Valid To <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                className={`form-control form-control-sm ${fieldErrors.validToUtc ? 'is-invalid' : ''}`}
                value={validToUtc}
                onChange={(e) => setValidToUtc(e.target.value)}
              />
              {fieldErrors.validToUtc && <div className="invalid-feedback">{fieldErrors.validToUtc}</div>}
            </div>

            {original && (
              <div className="col-12">
                <span className="badge text-bg-light border font-monospace">
                  <i className="fa-solid fa-code-branch me-1" /> RowVersion: {original.rowVersion}
                </span>
                <span className="badge text-bg-light border ms-2">
                  <i className="fa-solid fa-chart-simple me-1" /> Used {original.usedCount} time(s)
                </span>
              </div>
            )}
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Link to={`/admin/coupons/${id}`} className="btn btn-outline-secondary btn-sm">
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

export default CouponEdit;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createPromoBanner, PromoBannerCreateDto } from '@/services/promoBannerService';

export const PromoBannerCreate: React.FC = () => {
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [imageBroken, setImageBroken] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!imageUrl.trim()) errs.imageUrl = 'Image URL is required.';
    if (imageUrl.length > 300) errs.imageUrl = 'Max 300 characters.';
    if (linkUrl.length > 300) errs.linkUrl = 'Max 300 characters.';
    if (displayOrder !== '' && Number.isNaN(Number(displayOrder))) {
      errs.displayOrder = 'Display order must be a number.';
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
      const dto: PromoBannerCreateDto = {
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim() || null,
        isActive,
        displayOrder: displayOrder === '' ? 0 : Number(displayOrder),
      };
      const created = await createPromoBanner(dto);
      toast.success('Promo banner created.');
      navigate(`/admin/promo-banners/${created.id}`, { state: { justCreated: true } });
    } catch (err: any) {
      const msg = err?.message || 'Could not create promo banner.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-4" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/promo-banners" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-image text-success me-2" />
          New Promo Banner
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
                Image URL <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                maxLength={300}
                className={`form-control form-control-sm ${fieldErrors.imageUrl ? 'is-invalid' : ''}`}
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageBroken(false);
                }}
                placeholder="https://cdn.example.com/banners/eid-sale.jpg"
              />
              {fieldErrors.imageUrl && <div className="invalid-feedback">{fieldErrors.imageUrl}</div>}
            </div>

            {/* Live preview */}
            <div className="col-12">
              <label className="form-label small fw-semibold">Preview</label>
              <div
                className="bg-light rounded border d-flex align-items-center justify-content-center"
                style={{ height: 180, overflow: 'hidden' }}
              >
                {imageUrl.trim() && !imageBroken ? (
                  <img
                    src={imageUrl}
                    alt="Banner preview"
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                    onError={() => setImageBroken(true)}
                  />
                ) : (
                  <div className="text-center text-muted small">
                    <i className="fa-solid fa-image d-block fa-lg mb-1" />
                    {imageBroken ? "Couldn't load this image URL" : 'Preview appears here'}
                  </div>
                )}
              </div>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Link URL</label>
              <input
                type="text"
                maxLength={300}
                className={`form-control form-control-sm ${fieldErrors.linkUrl ? 'is-invalid' : ''}`}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Optional — where the banner links to when clicked"
              />
              {fieldErrors.linkUrl && <div className="invalid-feedback">{fieldErrors.linkUrl}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Display Order</label>
              <input
                type="number"
                className={`form-control form-control-sm ${fieldErrors.displayOrder ? 'is-invalid' : ''}`}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
              />
              {fieldErrors.displayOrder && <div className="invalid-feedback">{fieldErrors.displayOrder}</div>}
              <div className="form-text">Lower numbers show first.</div>
            </div>

            <div className="col-md-6">
              <div className="form-check form-switch mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="bannerActiveSwitch"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="bannerActiveSwitch">
                  Active immediately
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Link to="/admin/promo-banners" className="btn btn-outline-secondary btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin me-1" /> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-1" /> Create Banner
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromoBannerCreate;

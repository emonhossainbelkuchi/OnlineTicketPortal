import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getPromoBannerById,
  updatePromoBanner,
  PromoBannerResponseDto,
  PromoBannerUpdateDto,
  PROMO_BANNER_UPDATED_EVENT,
} from '@/services/promoBannerService';

export const PromoBannerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [original, setOriginal] = useState<PromoBannerResponseDto | null>(null);
  const [staleWarning, setStaleWarning] = useState(false);

  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [imageBroken, setImageBroken] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const applyItem = (item: PromoBannerResponseDto) => {
    setOriginal(item);
    setImageUrl(item.imageUrl);
    setLinkUrl(item.linkUrl || '');
    setIsActive(item.isActive);
    setDisplayOrder(String(item.displayOrder));
    setImageBroken(false);
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const item = await getPromoBannerById(id);
      if (!item) {
        setNotFound(true);
      } else {
        applyItem(item);
        setNotFound(false);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load promo banner from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleExternalUpdate = () => {
      if (!id) return;
      getPromoBannerById(id)
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
    window.addEventListener(PROMO_BANNER_UPDATED_EVENT, handleExternalUpdate);
    return () => window.removeEventListener(PROMO_BANNER_UPDATED_EVENT, handleExternalUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    if (!original || !id) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const dto: PromoBannerUpdateDto = {
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim() || null,
        isActive,
        displayOrder: displayOrder === '' ? 0 : Number(displayOrder),
        rowVersion: original.rowVersion,
      };
      const updated = await updatePromoBanner(id, dto);
      toast.success('Promo banner updated.');
      navigate(`/admin/promo-banners/${updated.id}`, { state: { justUpdated: true } });
    } catch (err: any) {
      const msg = err?.message || 'Could not update promo banner.';
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
        Loading promo banner from API...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Promo banner not found.{' '}
        <Link to="/admin/promo-banners">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/promo-banners" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-pen text-primary me-2" />
          Edit Promo Banner
        </h1>
      </div>

      {staleWarning && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center py-2">
          <span className="small">
            <i className="fa-solid fa-tower-broadcast me-1" />
            This banner was changed elsewhere just now. Refresh to load the latest version.
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
                placeholder="Optional"
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
                  id="bannerActiveSwitchEdit"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="bannerActiveSwitchEdit">
                  Active
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
            <Link to={`/admin/promo-banners/${id}`} className="btn btn-outline-secondary btn-sm">
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

export default PromoBannerEdit;

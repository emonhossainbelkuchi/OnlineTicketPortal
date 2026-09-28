import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchBusImages, fetchBuses, updateBusImage, busLabel, extractErrorMessage } from '@/services/busImageService';
import type { BusImage } from '@/types/busImage.types';
import type { BusRef } from '@/types/busAmenityMapping.types';

export default function BusImagesEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [image, setImage] = useState<BusImage | null>(null);
  const [buses, setBuses] = useState<BusRef[]>([]);
  const [busId, setBusId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [images, b] = await Promise.all([fetchBusImages(), fetchBuses()]);
        const found = images.find((i) => i.id === id) ?? null;
        setImage(found);
        setBuses(b);
        if (found) {
          setBusId(found.busId);
          setImageUrl(found.imageUrl);
          setCaption(found.caption ?? '');
          setIsPrimary(found.isPrimary);
          setDisplayOrder(found.displayOrder);
        }
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const busOptions = useMemo(() => [...buses].sort((a, b) => busLabel(a).localeCompare(busLabel(b))), [buses]);

  async function handleSave() {
    if (!image || !busId || !imageUrl.trim()) return;
    setSaving(true);
    try {
      // rowVersion is echoed back exactly as GET returned it — that's the optimistic-
      // concurrency token; if someone else edited this row in between, the API rejects the
      // save instead of silently overwriting their change, and extractErrorMessage below
      // surfaces that as a toast rather than a blank failure.
      await updateBusImage(image.id, {
        busId,
        imageUrl: imageUrl.trim(),
        caption: caption.trim() || null,
        isPrimary,
        displayOrder,
        rowVersion: image.rowVersion,
      });
      toast.success('Saved.');
      navigate(`/admin/bus-images/${image.id}`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" />
        Loading...
      </div>
    );
  }

  if (!image) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        Image not found — it may have already been deleted.
        <div className="mt-3">
          <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/bus-images')}>
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 640 }}>
      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2" />
        Edit Bus Image
      </h4>

      <div className="mb-3">
        <label className="form-label">Bus</label>
        <select className="form-select" value={busId} onChange={(e) => setBusId(e.target.value)}>
          {busOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {busLabel(b)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Image URL</label>
        <input type="text" className="form-control" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        {imageUrl.trim() && (
          <img src={imageUrl.trim()} alt="Preview" className="mt-2 rounded border" style={{ maxHeight: 140 }} />
        )}
      </div>

      <div className="mb-3">
        <label className="form-label">Caption</label>
        <input type="text" className="form-control" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>

      <div className="row mb-3">
        <div className="col-6">
          <label className="form-label">Display order</label>
          <input
            type="number"
            className="form-control"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
          />
        </div>
        <div className="col-6 d-flex align-items-end">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="isPrimaryEdit"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="isPrimaryEdit">
              Primary image
            </label>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn-primary" disabled={!busId || !imageUrl.trim() || saving} onClick={handleSave}>
          {saving ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-check me-1" />}
          Save
        </button>
        <button className="btn btn-outline-secondary" onClick={() => navigate(`/admin/bus-images/${image.id}`)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchBuses, createBusImage, busLabel, extractErrorMessage } from '@/services/busImageService';
import type { BusRef } from '@/types/busAmenityMapping.types';

export default function BusImagesCreate() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<BusRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [busId, setBusId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setBuses(await fetchBuses());
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const busOptions = useMemo(() => [...buses].sort((a, b) => busLabel(a).localeCompare(busLabel(b))), [buses]);

  async function handleSave() {
    if (!busId || !imageUrl.trim()) return;
    setSaving(true);
    try {
      const created = await createBusImage({
        busId,
        imageUrl: imageUrl.trim(),
        caption: caption.trim() || null,
        isPrimary,
        displayOrder,
      });
      toast.success('Image added.');
      navigate(`/admin/bus-images/${created.id}`);
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

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 640 }}>
      <h4 className="mb-3">
        <i className="fa-solid fa-plus me-2" />
        New Bus Image
      </h4>

      <div className="mb-3">
        <label className="form-label">Bus</label>
        <select className="form-select" value={busId} onChange={(e) => setBusId(e.target.value)}>
          <option value="">Select a bus...</option>
          {busOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {busLabel(b)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Image URL</label>
        <input
          type="text"
          className="form-control"
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
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
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="isPrimary">
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
        <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/bus-images')}>
          Cancel
        </button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchMappings,
  fetchBuses,
  fetchAmenities,
  updateMapping,
  busLabel,
  extractErrorMessage,
} from '@/services/busAmenityMappingService';
import type { BusAmenityMapping, BusRef, BusAmenityRef } from '@/types/busAmenityMapping.types';

export default function BusAmenityMappingsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mapping, setMapping] = useState<BusAmenityMapping | null>(null);
  const [buses, setBuses] = useState<BusRef[]>([]);
  const [amenities, setAmenities] = useState<BusAmenityRef[]>([]);
  const [busId, setBusId] = useState('');
  const [busAmenityId, setBusAmenityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mappings, b, a] = await Promise.all([fetchMappings(), fetchBuses(), fetchAmenities()]);
        const found = mappings.find((m) => m.id === id) ?? null;
        setMapping(found);
        setBuses(b);
        setAmenities(a);
        if (found) {
          setBusId(found.busId);
          setBusAmenityId(found.busAmenityId);
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
    if (!mapping || !busId || !busAmenityId) return;
    setSaving(true);
    try {
      await updateMapping(mapping.id, { busId, busAmenityId });
      toast.success('Saved.');
      navigate(`/admin/bus-amenity-mappings/${mapping.id}`);
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

  if (!mapping) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        Mapping not found — it may have already been deleted.
        <div className="mt-3">
          <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/bus-amenity-mappings')}>
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 560 }}>
      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2" />
        Edit Bus Amenity Mapping
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
        <label className="form-label">Amenity</label>
        <select className="form-select" value={busAmenityId} onChange={(e) => setBusAmenityId(e.target.value)}>
          {amenities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {!a.isActive ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="d-flex gap-2">
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-check me-1" />}
          Save
        </button>
        <button className="btn btn-outline-secondary" onClick={() => navigate(`/admin/bus-amenity-mappings/${mapping.id}`)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// BusAmenityMappingsCreate.tsx — pick a bus, check off however many amenities it should have,
// Save posts one api/BusAmenityMappings row per checked amenity. Bus/amenity lists and the
// existing-mappings check are all fetched live on mount; nothing is cached.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchBuses,
  fetchAmenities,
  fetchMappings,
  createMapping,
  busLabel,
  extractErrorMessage,
} from '@/services/busAmenityMappingService';
import type { BusRef, BusAmenityRef } from '@/types/busAmenityMapping.types';

export default function BusAmenityMappingsCreate() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<BusRef[]>([]);
  const [amenities, setAmenities] = useState<BusAmenityRef[]>([]);
  const [existingAmenityIds, setExistingAmenityIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busId, setBusId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, a] = await Promise.all([fetchBuses(), fetchAmenities()]);
        setBuses(b);
        setAmenities(a);
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Re-check which amenities this specific bus already has, live, whenever the bus changes —
  // so the checklist never lets you try to create a duplicate mapping.
  useEffect(() => {
    if (!busId) {
      setExistingAmenityIds(new Set());
      return;
    }
    (async () => {
      try {
        const all = await fetchMappings();
        setExistingAmenityIds(new Set(all.filter((m) => m.busId === busId).map((m) => m.busAmenityId)));
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    })();
  }, [busId]);

  const busOptions = useMemo(
    () => [...buses].sort((a, b) => busLabel(a).localeCompare(busLabel(b))),
    [buses],
  );

  function toggle(amenityId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(amenityId)) next.delete(amenityId);
      else next.add(amenityId);
      return next;
    });
  }

  async function handleSave() {
    if (!busId || selected.size === 0) return;
    setSaving(true);
    try {
      // Sequential, not Promise.all — a partial failure this way leaves fewer duplicate/half
      // -created rows to clean up, and the error message points at exactly which one failed.
      for (const amenityId of selected) {
        await createMapping({ busId, busAmenityId: amenityId });
      }
      toast.success(`Added ${selected.size} amenity mapping(s).`);
      navigate('/admin/bus-amenity-mappings');
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
        New Bus Amenity Mapping
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

      {busId && (
        <div className="mb-3">
          <label className="form-label">Amenities</label>
          <div className="border rounded p-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {amenities.map((a) => {
              const already = existingAmenityIds.has(a.id);
              return (
                <div className="form-check" key={a.id}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`amenity-${a.id}`}
                    disabled={already}
                    checked={already || selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                  />
                  <label className="form-check-label" htmlFor={`amenity-${a.id}`}>
                    {a.name}
                    {!a.isActive && <span className="text-muted"> (inactive)</span>}
                    {already && <span className="text-muted"> — already on this bus</span>}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="d-flex gap-2">
        <button
          className="btn btn-primary"
          disabled={!busId || selected.size === 0 || saving}
          onClick={handleSave}
        >
          {saving ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-check me-1" />}
          Save
        </button>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/bus-amenity-mappings')}>
          Cancel
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchMappings,
  fetchBuses,
  fetchAmenities,
  deleteMapping,
  busLabel,
  extractErrorMessage,
} from '@/services/busAmenityMappingService';
import type { BusAmenityMapping, BusRef, BusAmenityRef } from '@/types/busAmenityMapping.types';

export default function BusAmenityMappingsDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mapping, setMapping] = useState<BusAmenityMapping | null>(null);
  const [bus, setBus] = useState<BusRef | undefined>();
  const [amenity, setAmenity] = useState<BusAmenityRef | undefined>();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mappings, buses, amenities] = await Promise.all([fetchMappings(), fetchBuses(), fetchAmenities()]);
        const found = mappings.find((m) => m.id === id) ?? null;
        setMapping(found);
        setBus(buses.find((b) => b.id === found?.busId));
        setAmenity(amenities.find((a) => a.id === found?.busAmenityId));
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleDelete() {
    if (!mapping || !window.confirm('Delete this mapping?')) return;
    setDeleting(true);
    try {
      await deleteMapping(mapping.id);
      toast.success('Deleted.');
      navigate('/admin/bus-amenity-mappings');
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setDeleting(false);
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
        <i className="fa-solid fa-shuttle-van me-2" />
        Bus Amenity Mapping
      </h4>

      <dl className="row">
        <dt className="col-sm-4">Bus</dt>
        <dd className="col-sm-8">{busLabel(bus)}</dd>

        <dt className="col-sm-4">Amenity</dt>
        <dd className="col-sm-8">
          {amenity?.name ?? 'Unknown amenity'}
          {amenity && !amenity.isActive && <span className="badge bg-secondary ms-2">Inactive</span>}
        </dd>

        <dt className="col-sm-4">Mapping Id</dt>
        <dd className="col-sm-8 text-muted small">{mapping.id}</dd>
      </dl>

      <div className="d-flex gap-2">
        <button className="btn btn-outline-primary" onClick={() => navigate(`/admin/bus-amenity-mappings/${mapping.id}/edit`)}>
          <i className="fa-solid fa-pen me-1" />
          Edit
        </button>
        <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
          {deleting ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-trash me-1" />}
          Delete
        </button>
        <button className="btn btn-outline-secondary ms-auto" onClick={() => navigate('/admin/bus-amenity-mappings')}>
          Back
        </button>
      </div>
    </div>
  );
}

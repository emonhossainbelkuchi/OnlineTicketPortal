// BusAmenityMappingsList.tsx
// Replaces the generic raw-GUID resource table for api/BusAmenityMappings (see the comment
// on the redirect routes this replaces in AppRoutes.tsx) with a grouped-by-bus view: each bus
// as one row, its mapped amenities as removable chips, plus an inline "add amenity" control.
// Every fetch/create/delete below goes straight to the real API — nothing is cached in
// localStorage, and every mutation re-fetches from the server rather than patching local state
// from what the request body said should have happened.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchMappings,
  fetchBuses,
  fetchAmenities,
  createMapping,
  deleteMapping,
  busLabel,
  extractErrorMessage,
} from '@/services/busAmenityMappingService';
import type { BusAmenityMapping, BusRef, BusAmenityRef } from '@/types/busAmenityMapping.types';

const PAGE_SIZE = 8;

export default function BusAmenityMappingsList() {
  const navigate = useNavigate();

  const [mappings, setMappings] = useState<BusAmenityMapping[]>([]);
  const [buses, setBuses] = useState<BusRef[]>([]);
  const [amenities, setAmenities] = useState<BusAmenityRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyKey, setBusyKey] = useState<string | null>(null); // `${busId}:${amenityId}` while adding/removing
  const [addingFor, setAddingFor] = useState<string | null>(null); // busId currently showing the "add amenity" select

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [m, b, a] = await Promise.all([fetchMappings(), fetchBuses(), fetchAmenities()]);
      setMappings(m);
      setBuses(b);
      setAmenities(a);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const amenityById = useMemo(() => new Map(amenities.map((a) => [a.id, a])), [amenities]);

  const grouped = useMemo(() => {
    const byBus = new Map<string, BusAmenityMapping[]>();
    for (const m of mappings) {
      const list = byBus.get(m.busId) ?? [];
      list.push(m);
      byBus.set(m.busId, list);
    }
    return buses
      .map((bus) => ({ bus, mappings: byBus.get(bus.id) ?? [] }))
      .sort((a, b) => busLabel(a.bus).localeCompare(busLabel(b.bus)));
  }, [buses, mappings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped.filter(({ bus, mappings: rows }) => {
      if (busLabel(bus).toLowerCase().includes(q)) return true;
      return rows.some((r) => amenityById.get(r.busAmenityId)?.name.toLowerCase().includes(q));
    });
  }, [grouped, search, amenityById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  async function handleAdd(busId: string, busAmenityId: string) {
    setBusyKey(`${busId}:${busAmenityId}`);
    try {
      await createMapping({ busId, busAmenityId });
      toast.success('Amenity added.');
      setAddingFor(null);
      await loadAll();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(mapping: BusAmenityMapping) {
    if (!window.confirm('Remove this amenity from the bus?')) return;
    setBusyKey(`${mapping.busId}:${mapping.busAmenityId}`);
    try {
      await deleteMapping(mapping.id);
      toast.success('Removed.');
      await loadAll();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-shuttle-van me-2" />
          Bus Amenity Mappings
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
        <button className="btn btn-primary" onClick={() => navigate('/admin/bus-amenity-mappings/new')}>
          <i className="fa-solid fa-plus me-1" />
          New Mapping
        </button>
      </div>

      <div className="row mb-3 g-2">
        <div className="col-md-5">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by bus (reg. no, brand, model) or amenity name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="col-md-auto ms-auto text-muted align-self-center">
          {filtered.length} bus(es) · {mappings.length} mapping(s) total
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted">
          <i className="fa-solid fa-spinner fa-spin me-2" />
          Loading...
        </div>
      ) : pageItems.length === 0 ? (
        <div className="text-center py-5 text-muted">No buses match your search.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {pageItems.map(({ bus, mappings: rows }) => {
            const mappedIds = new Set(rows.map((r) => r.busAmenityId));
            const available = amenities.filter((a) => !mappedIds.has(a.id));
            return (
              <div key={bus.id} className="card shadow-sm">
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <strong className="me-2">
                      <i className="fa-solid fa-bus me-1 text-muted" />
                      {busLabel(bus)}
                    </strong>

                    {rows.length === 0 && <span className="text-muted small">No amenities yet</span>}

                    {rows.map((r) => {
                      const amenity = amenityById.get(r.busAmenityId);
                      const key = `${r.busId}:${r.busAmenityId}`;
                      return (
                        <span key={r.id} className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-dark text-decoration-none"
                            onClick={() => navigate(`/admin/bus-amenity-mappings/${r.id}`)}
                          >
                            {amenity?.name ?? 'Unknown amenity'}
                          </button>
                          <button
                            type="button"
                            className="btn-close btn-close-sm"
                            style={{ fontSize: '0.55em' }}
                            disabled={busyKey === key}
                            title="Remove"
                            onClick={() => handleRemove(r)}
                          />
                        </span>
                      );
                    })}

                    <div className="ms-auto">
                      {addingFor === bus.id ? (
                        <select
                          autoFocus
                          className="form-select form-select-sm"
                          style={{ width: 200 }}
                          disabled={available.length === 0}
                          onBlur={() => setAddingFor(null)}
                          onChange={(e) => e.target.value && handleAdd(bus.id, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            {available.length === 0 ? 'All amenities added' : 'Select amenity...'}
                          </option>
                          {available.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                              {!a.isActive ? ' (inactive)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setAddingFor(bus.id)}>
                          <i className="fa-solid fa-plus me-1" />
                          Add amenity
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center mb-0">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <i className="fa-solid fa-angle-left" />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <i className="fa-solid fa-angle-right" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

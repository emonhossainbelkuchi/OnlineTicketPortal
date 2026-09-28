// BusImagesList.tsx — same pattern as BusAmenityMappingsList.tsx: replaces the generic
// raw-GUID resource table for api/BusImages with a grouped-by-bus view showing actual image
// thumbnails. No localStorage — every fetch/mutation goes straight to the API and reloads.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchBusImages, fetchBuses, deleteBusImage, busLabel, extractErrorMessage } from '@/services/busImageService';
import type { BusImage } from '@/types/busImage.types';
import type { BusRef } from '@/types/busAmenityMapping.types';

const PAGE_SIZE = 6;

export default function BusImagesList() {
  const navigate = useNavigate();
  const [images, setImages] = useState<BusImage[]>([]);
  const [buses, setBuses] = useState<BusRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [imgs, b] = await Promise.all([fetchBusImages(), fetchBuses()]);
      setImages(imgs);
      setBuses(b);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const busById = useMemo(() => new Map(buses.map((b) => [b.id, b])), [buses]);

  const grouped = useMemo(() => {
    const byBus = new Map<string, BusImage[]>();
    for (const img of images) {
      const list = byBus.get(img.busId) ?? [];
      list.push(img);
      byBus.set(img.busId, list);
    }
    return buses
      .map((bus) => ({
        bus,
        images: (byBus.get(bus.id) ?? []).sort((a, b) => a.displayOrder - b.displayOrder),
      }))
      .filter((g) => g.images.length > 0)
      .sort((a, b) => busLabel(a.bus).localeCompare(busLabel(b.bus)));
  }, [buses, images]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped.filter(
      ({ bus, images: rows }) =>
        busLabel(bus).toLowerCase().includes(q) || rows.some((r) => r.caption?.toLowerCase().includes(q)),
    );
  }, [grouped, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  async function handleDelete(img: BusImage) {
    if (!window.confirm('Delete this image?')) return;
    setBusyId(img.id);
    try {
      await deleteBusImage(img.id);
      toast.success('Deleted.');
      await loadAll();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-images me-2" />
          Bus Images
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
        <button className="btn btn-primary" onClick={() => navigate('/admin/bus-images/new')}>
          <i className="fa-solid fa-plus me-1" />
          New Image
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
              placeholder="Search by bus (reg. no, brand, model) or caption..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="col-md-auto ms-auto text-muted align-self-center">
          {filtered.length} bus(es) · {images.length} image(s) total
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
        <div className="text-center py-5 text-muted">No buses with images match your search.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {pageItems.map(({ bus, images: rows }) => (
            <div key={bus.id} className="card shadow-sm">
              <div className="card-body">
                <strong className="d-block mb-2">
                  <i className="fa-solid fa-bus me-1 text-muted" />
                  {busLabel(bus)}
                </strong>
                <div className="d-flex flex-wrap gap-3">
                  {rows.map((img) => (
                    <div key={img.id} className="border rounded" style={{ width: 160 }}>
                      <button
                        type="button"
                        className="btn p-0 border-0 w-100"
                        onClick={() => navigate(`/admin/bus-images/${img.id}`)}
                        title="View details"
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.caption ?? busLabel(bus)}
                          style={{ width: '100%', height: 100, objectFit: 'cover' }}
                          className="rounded-top"
                        />
                      </button>
                      <div className="p-2">
                        <div className="small text-truncate" title={img.caption ?? ''}>
                          {img.caption || <span className="text-muted">No caption</span>}
                        </div>
                        <div className="d-flex align-items-center justify-content-between mt-1">
                          <span>
                            {img.isPrimary && <span className="badge bg-success">Primary</span>}
                            <span className="text-muted small ms-1">#{img.displayOrder}</span>
                          </span>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => navigate(`/admin/bus-images/${img.id}/edit`)}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              disabled={busyId === img.id}
                              onClick={() => handleDelete(img)}
                            >
                              {busyId === img.id ? (
                                <i className="fa-solid fa-spinner fa-spin" />
                              ) : (
                                <i className="fa-solid fa-trash" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
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

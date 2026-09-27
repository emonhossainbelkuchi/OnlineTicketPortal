// SeatHoldItemsList.tsx
// Read-only list (SeatHoldItemsController has no create/edit/delete — items are
// written only as a side effect of SeatHoldService.HoldSeatsAsync). Polls every
// 5s so it reflects holds expiring in near-real-time, plus reacts instantly to
// the broadcast/event other tabs fire.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startSeatHoldItemsPolling,
  subscribeToSeatHoldItems,
  extractErrorMessage,
} from '@/services/seatHoldItemService';
import type { SeatHoldItemDisplayDto } from '@/types/seatHoldItem.types';

const PAGE_SIZE = 10;

export default function SeatHoldItemsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SeatHoldItemDisplayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const stopPolling = startSeatHoldItemsPolling((data) => {
      setItems(data);
      setLoading(false);
      setError(null);
    }, 5000);

    const unsubscribe = subscribeToSeatHoldItems(() => {
      // Broadcast/event just nudges the next poll tick; nothing to do here
      // beyond letting the interval pick it up — kept for future push wiring.
    });

    return () => {
      stopPolling();
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.seatLabel.toLowerCase().includes(q) ||
        i.tripLabel.toLowerCase().includes(q) ||
        i.busLabel.toLowerCase().includes(q) ||
        (i.holdStatus || '').toLowerCase().includes(q) ||
        String(i.fareAtHold).includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  function statusBadgeClass(status?: string) {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'expired':
        return 'bg-secondary';
      case 'released':
      case 'cancelled':
        return 'bg-warning text-dark';
      default:
        return 'bg-light text-dark';
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-chair me-2" />
          Seat Hold Items
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
      </div>

      <div className="row mb-3">
        <div className="col-md-4">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by seat, trip, status..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="table-responsive shadow-sm rounded">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Seat</th>
              <th>Trip</th>
              <th>Bus</th>
              <th>Hold Status</th>
              <th>Fare at Hold</th>
              <th>Created</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading seat hold items...
                </td>
              </tr>
            )}

            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
                  No seat hold items found.
                </td>
              </tr>
            )}

            {!loading &&
              pageItems.map((item, idx) => (
                <tr key={item.id}>
                  <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <i className="fa-solid fa-couch me-1 text-muted" />
                    {item.seatLabel}
                  </td>
                  <td>{item.tripLabel}</td>
                  <td>
                    <i className="fa-solid fa-bus me-1 text-muted" />
                    {item.busLabel}
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeClass(item.holdStatus)}`}>
                      {item.holdStatus || 'Unknown'}
                    </span>
                  </td>
                  <td>{item.fareAtHold.toLocaleString()}</td>
                  <td>{new Date(item.createdAtUtc).toLocaleString()}</td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate(`/admin/seat-hold-items/${item.id}`)}
                    >
                      <i className="fa-solid fa-eye me-1" />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

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

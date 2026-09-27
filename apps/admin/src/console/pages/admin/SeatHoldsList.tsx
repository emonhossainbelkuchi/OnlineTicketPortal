// SeatHoldsList.tsx
// Polls every 5s for status/list changes (SeatHoldsController is role-scoped
// server-side). The per-row countdown ticks every 1s client-side from
// holdExpiresAtUtc, so it doesn't need a network round trip every second.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startSeatHoldsPolling,
  subscribeToSeatHolds,
  releaseSeatHold,
  extractErrorMessage,
} from '@/services/seatHoldService';
import type { SeatHoldDisplayDto } from '@/types/seatHold.types';

const PAGE_SIZE = 10;

export default function SeatHoldsList() {
  const navigate = useNavigate();
  const [holds, setHolds] = useState<SeatHoldDisplayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [releasingId, setReleasingId] = useState<string | null>(null);

  useEffect(() => {
    const stopPolling = startSeatHoldsPolling((data) => {
      setHolds(data);
      setLoading(false);
      setError(null);
    }, 5000);

    const unsubscribe = subscribeToSeatHolds(() => {
      /* next poll tick picks up the change; kept for future push wiring */
    });

    const tickInterval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      stopPolling();
      unsubscribe();
      window.clearInterval(tickInterval);
    };
  }, []);

  function liveSecondsRemaining(hold: SeatHoldDisplayDto): number {
    if (hold.status !== 'Active') return 0;
    return Math.max(0, Math.floor((new Date(hold.holdExpiresAtUtc).getTime() - now) / 1000));
  }

  function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return holds;
    return holds.filter(
      (h) =>
        h.tripLabel.toLowerCase().includes(q) ||
        h.busLabel.toLowerCase().includes(q) ||
        h.heldByLabel.toLowerCase().includes(q) ||
        h.status.toLowerCase().includes(q) ||
        h.holdToken.toLowerCase().includes(q)
    );
  }, [holds, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  async function handleRelease(id: string) {
    if (!window.confirm('Release this seat hold? The seats become available immediately.')) return;
    setReleasingId(id);
    try {
      await releaseSeatHold(id);
      setHolds((prev) => prev.map((h) => (h.id === id ? { ...h, status: 'Released', secondsRemaining: 0 } : h)));
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setReleasingId(null);
    }
  }

  function statusBadgeClass(status: string) {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'expired':
        return 'bg-secondary';
      case 'converttobooking':
      case 'convertedtobooking':
        return 'bg-primary';
      case 'released':
        return 'bg-warning text-dark';
      default:
        return 'bg-light text-dark';
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-hourglass-half me-2" />
          Seat Holds
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
              placeholder="Search by trip, bus, held by, status..."
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
              <th>Trip</th>
              <th>Bus</th>
              <th>Held By</th>
              <th>Status</th>
              <th>Time Left</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading seat holds...
                </td>
              </tr>
            )}

            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">
                  No seat holds found.
                </td>
              </tr>
            )}

            {!loading &&
              pageItems.map((hold, idx) => {
                const secs = liveSecondsRemaining(hold);
                return (
                  <tr key={hold.id}>
                    <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td>{hold.tripLabel}</td>
                    <td>
                      <i className="fa-solid fa-bus me-1 text-muted" />
                      {hold.busLabel}
                    </td>
                    <td>
                      <i className="fa-solid fa-user me-1 text-muted" />
                      {hold.heldByLabel}
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeClass(hold.status)}`}>{hold.status}</span>
                    </td>
                    <td>
                      {hold.status === 'Active' ? (
                        <span className={secs <= 30 ? 'text-danger fw-bold' : ''}>
                          <i className="fa-regular fa-clock me-1" />
                          {formatCountdown(secs)}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => navigate(`/admin/seat-holds/${hold.id}`)}
                      >
                        <i className="fa-solid fa-eye me-1" />
                        Details
                      </button>
                      {hold.status === 'Active' && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={releasingId === hold.id}
                          onClick={() => handleRelease(hold.id)}
                        >
                          {releasingId === hold.id ? (
                            <i className="fa-solid fa-spinner fa-spin" />
                          ) : (
                            <>
                              <i className="fa-solid fa-lock-open me-1" />
                              Release
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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

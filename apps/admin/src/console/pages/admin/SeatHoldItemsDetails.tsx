// SeatHoldItemsDetails.tsx
// Read-only detail view (no edit/delete — see SeatHoldItemsController). Polls
// the parent item every 5s so an expiring/released hold reflects near-instantly.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSeatHoldItemById,
  enrichSeatHoldItems,
  extractErrorMessage,
} from '@/services/seatHoldItemService';
import type { SeatHoldItemDisplayDto } from '@/types/seatHoldItem.types';

export default function SeatHoldItemsDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<SeatHoldItemDisplayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const raw = await getSeatHoldItemById(id!);
        if (!raw) {
          if (!cancelled) setError('Seat hold item not found.');
          return;
        }
        const [enriched] = await enrichSeatHoldItems([raw]);
        if (!cancelled) {
          setItem(enriched);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const handle = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container-fluid py-4 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" />
        Loading...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">{error || 'Seat hold item not found.'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/seat-hold-items')}>
          <i className="fa-solid fa-arrow-left me-1" />
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-chair me-2" />
          Seat Hold Item Details
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/seat-hold-items')}>
          <i className="fa-solid fa-arrow-left me-1" />
          Back to List
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-4">
              <i className="fa-solid fa-couch me-1 text-muted" />
              Seat
            </dt>
            <dd className="col-sm-8">{item.seatLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-route me-1 text-muted" />
              Trip
            </dt>
            <dd className="col-sm-8">{item.tripLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-bus me-1 text-muted" />
              Bus
            </dt>
            <dd className="col-sm-8">{item.busLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-clock me-1 text-muted" />
              Hold Status
            </dt>
            <dd className="col-sm-8">
              <span className="badge bg-secondary">{item.holdStatus || 'Unknown'}</span>
            </dd>

            {item.holdExpiresAtUtc && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-hourglass-end me-1 text-muted" />
                  Hold Expires
                </dt>
                <dd className="col-sm-8">{new Date(item.holdExpiresAtUtc).toLocaleString()}</dd>
              </>
            )}

            <dt className="col-sm-4">
              <i className="fa-solid fa-money-bill me-1 text-muted" />
              Fare at Hold
            </dt>
            <dd className="col-sm-8">{item.fareAtHold.toLocaleString()}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-calendar-plus me-1 text-muted" />
              Created (UTC)
            </dt>
            <dd className="col-sm-8">{new Date(item.createdAtUtc).toLocaleString()}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-calendar-check me-1 text-muted" />
              Updated (UTC)
            </dt>
            <dd className="col-sm-8">{item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : '-'}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

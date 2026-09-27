// SeatHoldsDetails.tsx
// Live-updating detail view: polls the hold every 5s and ticks its own
// 1s countdown from holdExpiresAtUtc. Offers Release while the hold is Active.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSeatHoldById,
  enrichSeatHolds,
  releaseSeatHold,
  extractErrorMessage,
} from '@/services/seatHoldService';
import type { SeatHoldDisplayDto } from '@/types/seatHold.types';

export default function SeatHoldsDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hold, setHold] = useState<SeatHoldDisplayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const raw = await getSeatHoldById(id!);
        if (!raw) {
          if (!cancelled) setError('Seat hold not found.');
          return;
        }
        const [enriched] = await enrichSeatHolds([raw]);
        if (!cancelled) {
          setHold(enriched);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const pollHandle = window.setInterval(load, 5000);
    const tickHandle = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(pollHandle);
      window.clearInterval(tickHandle);
    };
  }, [id]);

  async function handleRelease() {
    if (!id || !window.confirm('Release this seat hold? The seats become available immediately.')) return;
    setReleasing(true);
    try {
      await releaseSeatHold(id);
      setHold((prev) => (prev ? { ...prev, status: 'Released', secondsRemaining: 0 } : prev));
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setReleasing(false);
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

  if (loading) {
    return (
      <div className="container-fluid py-4 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" />
        Loading...
      </div>
    );
  }

  if (error || !hold) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">{error || 'Seat hold not found.'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/seat-holds')}>
          <i className="fa-solid fa-arrow-left me-1" />
          Back to List
        </button>
      </div>
    );
  }

  const secondsLeft =
    hold.status === 'Active'
      ? Math.max(0, Math.floor((new Date(hold.holdExpiresAtUtc).getTime() - now) / 1000))
      : 0;
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-hourglass-half me-2" />
          Seat Hold Details
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
        <div>
          {hold.status === 'Active' && (
            <button className="btn btn-outline-danger me-2" disabled={releasing} onClick={handleRelease}>
              {releasing ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-lock-open me-1" />}
              Release
            </button>
          )}
          <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/seat-holds')}>
            <i className="fa-solid fa-arrow-left me-1" />
            Back to List
          </button>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-4">
              <i className="fa-solid fa-route me-1 text-muted" />
              Trip
            </dt>
            <dd className="col-sm-8">{hold.tripLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-bus me-1 text-muted" />
              Bus
            </dt>
            <dd className="col-sm-8">{hold.busLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-user me-1 text-muted" />
              Held By
            </dt>
            <dd className="col-sm-8">{hold.heldByLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-flag me-1 text-muted" />
              Status
            </dt>
            <dd className="col-sm-8">
              <span className={`badge ${statusBadgeClass(hold.status)}`}>{hold.status}</span>
            </dd>

            {hold.status === 'Active' && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-regular fa-clock me-1 text-muted" />
                  Time Left
                </dt>
                <dd className="col-sm-8">
                  <span className={secondsLeft <= 30 ? 'text-danger fw-bold' : ''}>
                    {m}:{s.toString().padStart(2, '0')}
                  </span>
                </dd>
              </>
            )}

            <dt className="col-sm-4">
              <i className="fa-solid fa-play me-1 text-muted" />
              Hold Started (UTC)
            </dt>
            <dd className="col-sm-8">{new Date(hold.holdStartedAtUtc).toLocaleString()}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-hourglass-end me-1 text-muted" />
              Hold Expires (UTC)
            </dt>
            <dd className="col-sm-8">{new Date(hold.holdExpiresAtUtc).toLocaleString()}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-key me-1 text-muted" />
              Hold Token
            </dt>
            <dd className="col-sm-8">
              <code>{hold.holdToken}</code>
            </dd>

            {hold.clientIpAddress && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-network-wired me-1 text-muted" />
                  IP Address
                </dt>
                <dd className="col-sm-8">{hold.clientIpAddress}</dd>
              </>
            )}

            {hold.userAgent && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-desktop me-1 text-muted" />
                  User Agent
                </dt>
                <dd className="col-sm-8 text-break">{hold.userAgent}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPen,
  faSyncAlt,
  faTrash,
  faUpload,
  faWifi,
  faRestroom,
  faWheelchair,
} from '@fortawesome/free-solid-svg-icons';
import tripService from '@/services/tripService';
import { API_BASE_URL } from '@/lib/api';
import {
  Trip,
  TripStatusLabel,
  TripStatusBadgeClass,
  TripSeatStatus,
  TripSeatStatusLabel,
  SeatTypeLabel,
} from '@/types/trip.types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="col-md-4 mb-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-medium">{value}</div>
    </div>
  );
}

const seatBadgeClass: Record<TripSeatStatus, string> = {
  [TripSeatStatus.Available]: 'bg-success',
  [TripSeatStatus.Held]: 'bg-warning text-dark',
  [TripSeatStatus.Booked]: 'bg-danger',
  [TripSeatStatus.Blocked]: 'bg-secondary',
};

export default function TripsDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await tripService.getById(id));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load trip.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this trip?')) return;
    setDeleting(true);
    try {
      const result = await tripService.remove(id);
      if (result && (result as any).softDeleted) {
        alert((result as any).message);
        await load();
      } else {
        navigate('/admin/resource/Trips');
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      await tripService.uploadImage(id, file);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Image upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <FontAwesomeIcon icon={faSyncAlt} spin size="2x" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container-fluid py-3">
        <div className="alert alert-danger">{error ?? 'Trip not found.'}</div>
        <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/Trips">
          <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
          Back to list
        </Link>
      </div>
    );
  }

  const available = item.tripSeats.filter((s) => s.status === TripSeatStatus.Available);
  const lowestFare = available.length > 0 ? Math.min(...available.map((s) => s.fare)) : null;

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <h4 className="mb-0">
          Trip {item.tripCode}{' '}
          <span className={`badge ${TripStatusBadgeClass[item.status]} align-middle`}>
            {TripStatusLabel[item.status]}
          </span>
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={load}>
            <FontAwesomeIcon icon={faSyncAlt} className="me-1" />
            Refresh
          </button>
          <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/Trips">
            <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
            Back
          </Link>
          <Link className="btn btn-primary btn-sm" to={`/admin/resource/Trips/${item.id}/edit`}>
            <FontAwesomeIcon icon={faPen} className="me-1" />
            Edit
          </Link>
          <button className="btn btn-outline-danger btn-sm" onClick={handleDelete} disabled={deleting}>
            <FontAwesomeIcon icon={faTrash} className="me-1" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {item.deletedAtUtc && (
        <div className="alert alert-warning">
          This trip is soft-deleted (cancelled after bookings were made against it). Existing
          bookings are untouched, but it no longer appears in customer trip searches.
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="row">
                <Field label="Operator" value={item.busOperatorName ?? item.busOperatorId} />
                <Field label="Route" value={`${item.busRouteCode ?? ''} ${item.busRouteName ?? ''}`.trim() || '—'} />
                <Field
                  label="Bus"
                  value={
                    <>
                      {[item.busBrand, item.busModel].filter(Boolean).join(' ') || '—'}
                      <div className="small text-muted">
                        {item.busCoachNumber ?? item.busRegistrationNumber ?? ''}
                        {item.busHasWifi && <FontAwesomeIcon icon={faWifi} className="ms-2" title="WiFi" />}
                        {item.busHasToilet && <FontAwesomeIcon icon={faRestroom} className="ms-2" title="Toilet" />}
                        {item.isWheelchairAccessible && (
                          <FontAwesomeIcon icon={faWheelchair} className="ms-2" title="Wheelchair accessible" />
                        )}
                      </div>
                    </>
                  }
                />
                <Field
                  label="Departure"
                  value={
                    <>
                      {new Date(item.departureTimeUtc).toLocaleString()}
                      <div className="small text-muted">
                        {item.departureTerminalName ?? '?'}
                        {item.departureCity ? `, ${item.departureCity}` : ''}
                      </div>
                    </>
                  }
                />
                <Field
                  label="Arrival"
                  value={
                    <>
                      {new Date(item.arrivalTimeUtc).toLocaleString()}
                      <div className="small text-muted">
                        {item.arrivalTerminalName ?? '?'}
                        {item.arrivalCity ? `, ${item.arrivalCity}` : ''}
                      </div>
                    </>
                  }
                />
                <Field label="Base Fare" value={`${item.baseFare.toLocaleString()} ${item.currency}`} />
                <Field
                  label="Seats"
                  value={
                    <>
                      {available.length} available / {item.tripSeats.length} total
                      {lowestFare !== null && (
                        <div className="small text-muted">
                          Lowest available fare: {lowestFare.toLocaleString()} {item.currency}
                        </div>
                      )}
                    </>
                  }
                />
                <Field label="Delay Reason" value={item.delayReason ?? '—'} />
                <Field label="Created (UTC)" value={item.createdAtUtc} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body text-center">
              {item.coverImageUrl ? (
                <img
                  src={`${API_BASE_URL}${item.coverImageUrl}`}
                  alt="Trip cover"
                  className="img-fluid rounded mb-2"
                  style={{ maxHeight: 200, objectFit: 'cover' }}
                />
              ) : (
                <div className="text-muted py-5 border rounded mb-2">No cover image</div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.bmp"
                className="d-none"
                onChange={handleUpload}
              />
              <button
                className="btn btn-outline-primary btn-sm w-100"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <FontAwesomeIcon icon={uploading ? faSyncAlt : faUpload} spin={uploading} className="me-1" />
                {uploading ? 'Uploading...' : 'Upload cover image'}
              </button>
              <small className="text-muted d-block mt-1">JPG/PNG/GIF/WEBP/BMP, max 5 MB</small>
            </div>
          </div>
        </div>
      </div>

      <h5 className="mb-2">Seats ({item.tripSeats.length})</h5>
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Seat</th>
              <th>Type</th>
              <th>Position</th>
              <th className="text-end">Fare</th>
              <th className="text-end">Extra Fare</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {item.tripSeats.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-3">
                  No seats on this trip.
                </td>
              </tr>
            ) : (
              [...item.tripSeats]
                .sort((a, b) => a.rowNumber - b.rowNumber || a.columnNumber - b.columnNumber)
                .map((s) => (
                  <tr key={s.id}>
                    <td className="fw-medium">{s.seatNumber}</td>
                    <td>{SeatTypeLabel[s.seatType] ?? s.seatType}</td>
                    <td className="small text-muted">
                      R{s.rowNumber}·C{s.columnNumber} · Deck {s.deckLevel}
                      {s.isWindow ? ' · Window' : ''}
                    </td>
                    <td className="text-end">{s.fare.toLocaleString()}</td>
                    <td className="text-end">{s.extraFare != null ? s.extraFare.toLocaleString() : '—'}</td>
                    <td>
                      <span className={`badge ${seatBadgeClass[s.status]}`}>
                        {TripSeatStatusLabel[s.status] ?? s.status}
                      </span>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

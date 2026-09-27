import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createExternalBookingMapping } from "@/services/externalBookingMappingService";
import type { BookingStatus } from "@/services/externalBookingMappingService";

export default function ExternalBookingMappingCreate() {
  const navigate = useNavigate();
  const [operatorIntegrationId, setOperatorIntegrationId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [externalBookingKey, setExternalBookingKey] = useState("");
  const [externalPnr, setExternalPnr] = useState("");
  const [lastKnownExternalStatus, setLastKnownExternalStatus] = useState<BookingStatus | "">("");
  const [lastSyncedAtUtc, setLastSyncedAtUtc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!operatorIntegrationId.trim()) return setError("Operator Integration ID is required.");
    if (!bookingId.trim()) return setError("Booking ID is required.");
    if (!externalBookingKey.trim()) return setError("External Booking Key is required.");

    setSaving(true);
    try {
      const created = await createExternalBookingMapping({
        operatorIntegrationId: operatorIntegrationId.trim(),
        bookingId: bookingId.trim(),
        externalBookingKey: externalBookingKey.trim(),
        externalPnr: externalPnr.trim() || null,
        lastKnownExternalStatus: lastKnownExternalStatus || null,
        lastSyncedAtUtc: lastSyncedAtUtc ? new Date(lastSyncedAtUtc).toISOString() : null,
      });
      navigate(`/admin/resource/ExternalBookingMappings/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create booking mapping.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/admin/resource/ExternalBookingMappings">External Booking Mappings</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-link me-2 text-primary" />
        New Booking Mapping
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-shield-halved me-2" />
        Admin-only — hand-editing mid-sync could double-import a booking.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Operator Integration ID *</label>
              <input
                className="form-control"
                value={operatorIntegrationId}
                onChange={(e) => setOperatorIntegrationId(e.target.value)}
                placeholder="GUID"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Booking ID *</label>
              <input
                className="form-control"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="GUID"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">External Booking Key *</label>
              <input
                className="form-control"
                value={externalBookingKey}
                onChange={(e) => setExternalBookingKey(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">External PNR</label>
              <input
                className="form-control"
                value={externalPnr}
                onChange={(e) => setExternalPnr(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Last Known Status</label>
              <select
                className="form-select"
                value={lastKnownExternalStatus}
                onChange={(e) => setLastKnownExternalStatus(e.target.value as BookingStatus | "")}
              >
                <option value="">— None —</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Last Synced At</label>
              <input
                type="datetime-local"
                className="form-control"
                value={lastSyncedAtUtc}
                onChange={(e) => setLastSyncedAtUtc(e.target.value)}
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/ExternalBookingMappings">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Create Mapping
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
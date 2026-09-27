import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getExternalBookingMappingById,
  deleteExternalBookingMapping,
  type ExternalBookingMappingResponseDto,
} from "@/services/externalBookingMappingService";

function statusBadge(status?: string | null) {
  if (!status) return <span className="text-muted">—</span>;
  const map: Record<string, string> = {
    Pending: "bg-secondary",
    Confirmed: "bg-info",
    Completed: "bg-success",
    Cancelled: "bg-danger",
  };
  return <span className={`badge ${map[status] ?? "bg-secondary"}`}>{status}</span>;
}

export default function ExternalBookingMappingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ExternalBookingMappingResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getExternalBookingMappingById(id)
      .then((m) => {
        if (!alive) return;
        if (!m) setNotFound(true);
        else setItem(m);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load booking mapping."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!id || !item) return;
    if (!window.confirm(`Delete booking mapping "${item.externalBookingKey}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteExternalBookingMapping(id);
      navigate("/admin/resource/ExternalBookingMappings");
    } catch (e: any) {
      setError(e?.message ?? "Could not delete booking mapping.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="container-fluid py-3">
        <div className="alert alert-warning">Booking mapping not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/ExternalBookingMappings">
          Back to list
        </Link>
      </div>
    );
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
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-link me-2 text-primary" />
          {item.externalBookingKey}
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/ExternalBookingMappings/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-2" /> Edit
          </Link>
          <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
            <i className={`fa-solid ${deleting ? "fa-spinner fa-spin" : "fa-trash"} me-2`} />
            Delete
          </button>
          <Link className="btn btn-outline-secondary" to="/admin/resource/ExternalBookingMappings">
            Back
          </Link>
        </div>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Internal sync bookkeeping — Admin-only writes; hand-editing mid-sync could double-import
        a booking.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Mapping</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">External Booking Key</dt>
                <dd className="col-7 text-end">{item.externalBookingKey}</dd>

                <dt className="col-5 text-muted">External PNR</dt>
                <dd className="col-7 text-end">{item.externalPnr ?? "—"}</dd>

                <dt className="col-5 text-muted">Last Known Status</dt>
                <dd className="col-7 text-end">{statusBadge(item.lastKnownExternalStatus)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">References &amp; Sync</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Booking ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.bookingId}>
                  {item.bookingId}
                </dd>

                <dt className="col-5 text-muted">Integration ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.operatorIntegrationId}>
                  {item.operatorIntegrationId}
                </dd>

                <dt className="col-5 text-muted">Last Synced</dt>
                <dd className="col-7 text-end">
                  {item.lastSyncedAtUtc ? new Date(item.lastSyncedAtUtc).toLocaleString() : "—"}
                </dd>

                <dt className="col-5 text-muted">Last Updated</dt>
                <dd className="col-7 text-end">
                  {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
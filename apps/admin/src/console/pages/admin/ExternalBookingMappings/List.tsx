import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllExternalBookingMappings,
  getStoredExternalBookingMappings,
  deleteExternalBookingMapping,
  EXTERNAL_BOOKING_MAPPING_UPDATED_EVENT,
  type ExternalBookingMappingResponseDto,
} from "@/services/externalBookingMappingService";

type SortField = "externalBookingKey" | "lastSyncedAtUtc" | "updatedAtUtc";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50];

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

export default function ExternalBookingMappingList() {
  const [items, setItems] = useState<ExternalBookingMappingResponseDto[]>(() => getStoredExternalBookingMappings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await getAllExternalBookingMappings();
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Could not load external booking mappings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const list = (e as CustomEvent<ExternalBookingMappingResponseDto[]>).detail;
      setItems(list ?? getStoredExternalBookingMappings());
    };
    window.addEventListener(EXTERNAL_BOOKING_MAPPING_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(EXTERNAL_BOOKING_MAPPING_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.externalBookingKey.toLowerCase().includes(q) ||
          (x.externalPnr ?? "").toLowerCase().includes(q) ||
          x.bookingId.toLowerCase().includes(q) ||
          x.operatorIntegrationId.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "externalBookingKey") cmp = a.externalBookingKey.localeCompare(b.externalBookingKey);
      else if (sortField === "lastSyncedAtUtc")
        cmp = (a.lastSyncedAtUtc ?? "").localeCompare(b.lastSyncedAtUtc ?? "");
      else cmp = (a.updatedAtUtc ?? a.createdAtUtc).localeCompare(b.updatedAtUtc ?? b.createdAtUtc);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  function toggleSort(field: SortField) {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIcon(field: SortField) {
    if (field !== sortField) return <i className="fa-solid fa-sort text-muted ms-1" />;
    return <i className={`fa-solid fa-sort-${sortDir === "asc" ? "up" : "down"} ms-1`} />;
  }

  async function handleDelete(id: string, key: string) {
    if (!window.confirm(`Delete booking mapping "${key}"?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteExternalBookingMapping(id);
    } catch (e: any) {
      setError(e?.message ?? "Could not delete booking mapping.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active">External Booking Mappings</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-link me-2 text-primary" />
            External Booking Mappings
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/ExternalBookingMappings — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
            <span className="ms-2">
              <i className="fa-solid fa-lock me-1" /> platform Staff/Admin visibility, Admin-only writes
            </span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/ExternalBookingMappings/create">
            <i className="fa-solid fa-plus me-2" /> New Mapping
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-2 align-items-center mb-3">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fa-solid fa-magnifying-glass" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search by External Key / PNR / Booking ID / Integration ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} / page
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3 text-md-end text-muted small">
              {filtered.length} / {items.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("externalBookingKey")}>
                    External Booking Key {sortIcon("externalBookingKey")}
                  </th>
                  <th>External PNR</th>
                  <th>Booking ID</th>
                  <th>Last Known Status</th>
                  <th role="button" onClick={() => toggleSort("lastSyncedAtUtc")}>
                    Last Synced {sortIcon("lastSyncedAtUtc")}
                  </th>
                  <th role="button" onClick={() => toggleSort("updatedAtUtc")}>
                    Last Updated {sortIcon("updatedAtUtc")}
                  </th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No booking mappings found.
                    </td>
                  </tr>
                )}
                {pageItems.map((m) => (
                  <tr key={m.id}>
                    <td className="fw-semibold">{m.externalBookingKey}</td>
                    <td>{m.externalPnr ?? "—"}</td>
                    <td className="text-truncate" style={{ maxWidth: 160 }} title={m.bookingId}>
                      {m.bookingId}
                    </td>
                    <td>{statusBadge(m.lastKnownExternalStatus)}</td>
                    <td className="text-muted small">
                      {m.lastSyncedAtUtc ? new Date(m.lastSyncedAtUtc).toLocaleString() : "—"}
                    </td>
                    <td className="text-muted small">
                      {new Date(m.updatedAtUtc ?? m.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/ExternalBookingMappings/${m.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        <Link
                          className="btn btn-outline-primary"
                          to={`/admin/resource/ExternalBookingMappings/${m.id}/edit`}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </Link>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete"
                          disabled={deletingId === m.id}
                          onClick={() => handleDelete(m.id, m.externalBookingKey)}
                        >
                          <i className={`fa-solid ${deletingId === m.id ? "fa-spinner fa-spin" : "fa-trash"}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="d-flex justify-content-end">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pageSafe === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === pageSafe ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setPage(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pageSafe === totalPages ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
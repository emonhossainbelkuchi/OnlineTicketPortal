import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllAuditLogs,
  getStoredAuditLogs,
  AUDIT_LOG_UPDATED_EVENT,
  actorDisplayName,
  type AuditLogResponseDto,
} from "@/services/auditLogService";

type SortField = "entityName" | "action" | "createdAtUtc";
type SortDir = "asc" | "desc";
type ActionFilter = "all" | "Create" | "Update" | "Delete";

const PAGE_SIZES = [10, 25, 50];

function actionBadge(action: string) {
  const map: Record<string, string> = {
    Create: "bg-success",
    Update: "bg-info",
    Delete: "bg-danger",
  };
  return <span className={`badge ${map[action] ?? "bg-secondary"}`}>{action}</span>;
}

export default function AuditLogList() {
  const [items, setItems] = useState<AuditLogResponseDto[]>(() => getStoredAuditLogs());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await getAllAuditLogs();
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const list = (e as CustomEvent<AuditLogResponseDto[]>).detail;
      setItems(list ?? getStoredAuditLogs());
    };
    window.addEventListener(AUDIT_LOG_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(AUDIT_LOG_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (actionFilter !== "all") list = list.filter((x) => x.action === actionFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.entityName.toLowerCase().includes(q) ||
          x.entityId.toLowerCase().includes(q) ||
          (x.userId ?? "").toLowerCase().includes(q) ||
          actorDisplayName(x).toLowerCase().includes(q) ||
          (x.ipAddress ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "entityName") cmp = a.entityName.localeCompare(b.entityName);
      else if (sortField === "action") cmp = a.action.localeCompare(b.action);
      else cmp = a.createdAtUtc.localeCompare(b.createdAtUtc);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, actionFilter, search, sortField, sortDir]);

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

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active">Audit Logs</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-clipboard-list me-2 text-primary" />
            Audit Logs
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/AuditLogs — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
            <span className="ms-2">
              <i className="fa-solid fa-lock me-1" /> read-only — Admin/Staff only
            </span>
          </div>
        </div>
        <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
          <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-2 align-items-center mb-3">
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fa-solid fa-magnifying-glass" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search by Entity / Entity ID / Actor / IP..."
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
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value as ActionFilter);
                  setPage(1);
                }}
              >
                <option value="all">All Actions</option>
                <option value="Create">Create</option>
                <option value="Update">Update</option>
                <option value="Delete">Delete</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
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
            <div className="col-12 col-md-2 text-md-end text-muted small">
              {filtered.length} / {items.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("entityName")}>
                    Entity {sortIcon("entityName")}
                  </th>
                  <th>Entity ID</th>
                  <th role="button" onClick={() => toggleSort("action")}>
                    Action {sortIcon("action")}
                  </th>
                  <th>Actor</th>
                  <th>IP Address</th>
                  <th role="button" onClick={() => toggleSort("createdAtUtc")}>
                    When {sortIcon("createdAtUtc")}
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
                      No audit logs found.
                    </td>
                  </tr>
                )}
                {pageItems.map((a) => (
                  <tr key={a.id}>
                    <td className="fw-semibold">{a.entityName}</td>
                    <td className="text-truncate" style={{ maxWidth: 160 }} title={a.entityId}>
                      {a.entityId}
                    </td>
                    <td>{actionBadge(a.action)}</td>
                    <td className="text-truncate" style={{ maxWidth: 160 }} title={a.userId ?? ""}>
                      {actorDisplayName(a)}
                    </td>
                    <td>{a.ipAddress ?? "—"}</td>
                    <td className="text-muted small">{new Date(a.createdAtUtc).toLocaleString()}</td>
                    <td className="text-end">
                      <Link
                        className="btn btn-outline-secondary btn-sm"
                        to={`/admin/resource/AuditLogs/${a.id}`}
                        title="Details"
                      >
                        <i className="fa-solid fa-eye" />
                      </Link>
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
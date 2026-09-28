import { Link } from "react-router-dom";
import { useOperatorSettings, useBusOperatorOptions, type SortField } from "@/hooks/useOperatorSettings";
import operatorSettingService from "@/services/operatorSettingService";
import { useState } from "react";

const PAGE_SIZES = [10, 25, 50];

export default function OperatorSettingList() {
  const [pageSize, setPageSize] = useState(10);
  const {
    paged, loading, error, forbidden, refresh, lastSyncedAt,
    search, setSearch, sortField, sortDir, toggleSort,
    page, setPage, totalPages, totalCount,
  } = useOperatorSettings({ pageSize });
  const { operators } = useBusOperatorOptions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function operatorName(id: string) {
    return operators.find((o) => o.id === id)?.name ?? id.slice(0, 8) + "…";
  }

  function sortIcon(field: SortField) {
    if (field !== sortField) return <i className="fa-solid fa-sort text-muted ms-1" />;
    return <i className={`fa-solid fa-sort-${sortDir === "asc" ? "up" : "down"} ms-1`} />;
  }

  async function handleDelete(id: string, key: string) {
    if (!window.confirm(`Delete setting "${key}"?`)) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      await operatorSettingService.delete(id);
      refresh();
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message ?? e?.message ?? "Could not delete setting.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item"><Link to="/admin">Admin</Link></li>
          <li className="breadcrumb-item active">Operator Settings</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-sliders me-2 text-primary" />
            Operator Settings
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/OperatorSettings — last synced {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
            <span className="ms-2"><i className="fa-solid fa-lock me-1" /> Admin-only</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={refresh} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/OperatorSettings/create">
            <i className="fa-solid fa-plus me-2" /> New Setting
          </Link>
        </div>
      </div>

      {forbidden && (
        <div className="alert alert-warning">
          <i className="fa-solid fa-lock me-2" /> Admin role required to view operator settings.
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}
      {deleteError && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {deleteError}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-2 align-items-center mb-3">
            <div className="col-12 col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="fa-solid fa-magnifying-glass" /></span>
                <input
                  className="form-control"
                  placeholder="Search by Key / Value / Description / Operator..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
            <div className="col-12 col-md-2 text-md-end text-muted small">
              {totalCount} record(s)
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("busOperatorId")}>Operator {sortIcon("busOperatorId")}</th>
                  <th role="button" onClick={() => toggleSort("key")}>Key {sortIcon("key")}</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th role="button" onClick={() => toggleSort("updatedAtUtc")}>Last Updated {sortIcon("updatedAtUtc")}</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && paged.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">
                    <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                  </td></tr>
                )}
                {!loading && paged.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">No operator settings found.</td></tr>
                )}
                {paged.map((s) => (
                  <tr key={s.id}>
                    <td>{operatorName(s.busOperatorId)}</td>
                    <td className="fw-semibold"><code>{s.key}</code></td>
                    <td className="text-truncate" style={{ maxWidth: 220 }} title={s.value}>{s.value}</td>
                    <td className="text-truncate" style={{ maxWidth: 200 }} title={s.description ?? ""}>{s.description ?? "—"}</td>
                    <td className="text-muted small">{new Date(s.updatedAtUtc ?? s.createdAtUtc).toLocaleString()}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link className="btn btn-outline-secondary" to={`/admin/resource/OperatorSettings/${s.id}`} title="Details">
                          <i className="fa-solid fa-eye" />
                        </Link>
                        <Link className="btn btn-outline-primary" to={`/admin/resource/OperatorSettings/${s.id}/edit`} title="Edit">
                          <i className="fa-solid fa-pen" />
                        </Link>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id, s.key)}
                        >
                          <i className={`fa-solid ${deletingId === s.id ? "fa-spinner fa-spin" : "fa-trash"}`} />
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
                <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage(Math.max(1, page - 1))}>
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage(Math.min(totalPages, page + 1))}>
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

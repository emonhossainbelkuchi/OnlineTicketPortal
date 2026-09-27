import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { taxRuleService } from "@/services/taxRuleService";
import type { TaxRule } from "@/types/taxRule";

type SortField = "name" | "percentage" | "updatedAtUtc";
type SortDir = "asc" | "desc";
type ActiveFilter = "all" | "active" | "inactive";

const PAGE_SIZES = [10, 25, 50];

export default function TaxRuleList() {
  const navigate = useNavigate();
  const { data, loading, error, lastSyncedAt, reload } = useAutoRefresh<TaxRule[]>(
    taxRuleService.getAll,
    5000
  );

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<TaxRule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rules = data ?? [];

  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.isActive).length;
    const avg = total ? rules.reduce((s, r) => s + r.percentage, 0) / total : 0;
    return { total, active, inactive: total - active, avg };
  }, [rules]);

  const filtered = useMemo(() => {
    let list = rules;
    if (activeFilter !== "all") {
      const wantActive = activeFilter === "active";
      list = list.filter((r) => r.isActive === wantActive);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "percentage") cmp = a.percentage - b.percentage;
      else cmp = (a.updatedAtUtc ?? a.createdAtUtc).localeCompare(b.updatedAtUtc ?? b.createdAtUtc);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rules, activeFilter, search, sortField, sortDir]);

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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await taxRuleService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (e: any) {
      setDeleteError(e?.message ?? "Could not delete this tax rule.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active">Tax Rules</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-percent me-2 text-primary" />
            Tax Rules
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/TaxRules — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => reload()} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/admin/resource/TaxRules/create")}>
            <i className="fa-solid fa-plus me-2" />
            New Tax Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="row g-3 mb-3">
        <StatCard label="Total Rules" value={stats.total} color="bg-primary" />
        <StatCard label="Active" value={stats.active} color="bg-success" />
        <StatCard label="Inactive" value={stats.inactive} color="bg-danger" />
        <StatCard label="Avg. Rate" value={`${stats.avg.toFixed(2)}%`} color="bg-info" />
      </div>

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
                  placeholder="Search by name..."
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
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value as ActiveFilter);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              {filtered.length} / {rules.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("name")}>
                    Name {sortIcon("name")}
                  </th>
                  <th role="button" onClick={() => toggleSort("percentage")}>
                    Percentage {sortIcon("percentage")}
                  </th>
                  <th>Status</th>
                  <th role="button" onClick={() => toggleSort("updatedAtUtc")}>
                    Last Updated {sortIcon("updatedAtUtc")}
                  </th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No tax rules found.
                    </td>
                  </tr>
                )}
                {pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">{r.name}</td>
                    <td>{r.percentage}%</td>
                    <td>
                      {r.isActive ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-secondary">Inactive</span>
                      )}
                    </td>
                    <td className="text-muted small">
                      {new Date(r.updatedAtUtc ?? r.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/TaxRules/${r.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        <Link
                          className="btn btn-outline-primary"
                          to={`/admin/resource/TaxRules/${r.id}/edit`}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </Link>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(r);
                          }}
                        >
                          <i className="fa-solid fa-trash" />
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

      {deleteTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Tax Rule</h5>
                <button
                  className="btn-close"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                />
              </div>
              <div className="modal-body">
                {deleteError && <div className="alert alert-danger">{deleteError}</div>}
                Delete <strong>{deleteTarget.name}</strong> ({deleteTarget.percentage}%)? This
                cannot be undone if nothing references it.
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
                  {deleting ? (
                    <i className="fa-solid fa-spinner fa-spin me-1" />
                  ) : (
                    <i className="fa-solid fa-trash me-1" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="col-6 col-md-3">
      <div className={`card text-white ${color} shadow-sm`}>
        <div className="card-body py-3">
          <div className="text-uppercase small opacity-75">{label}</div>
          <div className="fs-3 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

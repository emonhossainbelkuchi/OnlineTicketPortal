import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllSystemSettings,
  getStoredSystemSettings,
  deleteSystemSetting,
  SYSTEM_SETTING_UPDATED_EVENT,
  type SystemSettingResponseDto,
} from "@/services/systemSettingService";

type SortField = "key" | "updatedAtUtc";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50];

export default function SystemSettingList() {
  const [items, setItems] = useState<SystemSettingResponseDto[]>(() => getStoredSystemSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("key");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await getAllSystemSettings();
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Could not load system settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const list = (e as CustomEvent<SystemSettingResponseDto[]>).detail;
      setItems(list ?? getStoredSystemSettings());
    };
    window.addEventListener(SYSTEM_SETTING_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SYSTEM_SETTING_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.key.toLowerCase().includes(q) ||
          x.value.toLowerCase().includes(q) ||
          (x.description ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "key") cmp = a.key.localeCompare(b.key);
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
    if (!window.confirm(`Delete setting "${key}"?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteSystemSetting(id);
    } catch (e: any) {
      setError(e?.message ?? "Could not delete setting.");
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
          <li className="breadcrumb-item active">System Settings</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-gears me-2 text-primary" />
            System Settings
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/SystemSettings — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
            <span className="ms-2">
              <i className="fa-solid fa-lock me-1" /> Admin-only
            </span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/SystemSettings/create">
            <i className="fa-solid fa-plus me-2" /> New Setting
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
            <div className="col-12 col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fa-solid fa-magnifying-glass" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search by Key / Value / Description..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
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
                  <th role="button" onClick={() => toggleSort("key")}>
                    Key {sortIcon("key")}
                  </th>
                  <th>Value</th>
                  <th>Description</th>
                  <th role="button" onClick={() => toggleSort("updatedAtUtc")}>
                    Last Updated {sortIcon("updatedAtUtc")}
                  </th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No system settings found.
                    </td>
                  </tr>
                )}
                {pageItems.map((s) => (
                  <tr key={s.id}>
                    <td className="fw-semibold">
                      <code>{s.key}</code>
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 260 }} title={s.value}>
                      {s.value}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 220 }} title={s.description ?? ""}>
                      {s.description ?? "—"}
                    </td>
                    <td className="text-muted small">
                      {new Date(s.updatedAtUtc ?? s.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/SystemSettings/${s.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        <Link
                          className="btn btn-outline-primary"
                          to={`/admin/resource/SystemSettings/${s.id}/edit`}
                          title="Edit"
                        >
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
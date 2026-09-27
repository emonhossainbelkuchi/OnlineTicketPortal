import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllEmergencyContacts,
  getStoredEmergencyContacts,
  deleteEmergencyContact,
  EMERGENCY_CONTACT_UPDATED_EVENT,
  type EmergencyContactResponseDto,
} from "@/services/emergencyContactService";

type SortField = "name" | "phone" | "updatedAtUtc";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50];

export default function EmergencyContactList() {
  const [items, setItems] = useState<EmergencyContactResponseDto[]>(() => getStoredEmergencyContacts());
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
      await getAllEmergencyContacts();
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Could not load emergency contacts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const list = (e as CustomEvent<EmergencyContactResponseDto[]>).detail;
      setItems(list ?? getStoredEmergencyContacts());
    };
    window.addEventListener(EMERGENCY_CONTACT_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(EMERGENCY_CONTACT_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.phone.toLowerCase().includes(q) ||
          (x.relation ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "phone") cmp = a.phone.localeCompare(b.phone);
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

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete emergency contact "${name}"?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteEmergencyContact(id);
    } catch (e: any) {
      setError(e?.message ?? "Could not delete emergency contact.");
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
          <li className="breadcrumb-item active">Emergency Contacts</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-address-book me-2 text-primary" />
            Emergency Contacts
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/EmergencyContacts — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/EmergencyContacts/create">
            <i className="fa-solid fa-plus me-2" /> New Contact
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
                  placeholder="Search by Name / Phone / Relation..."
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
                  <th role="button" onClick={() => toggleSort("name")}>
                    Name {sortIcon("name")}
                  </th>
                  <th role="button" onClick={() => toggleSort("phone")}>
                    Phone {sortIcon("phone")}
                  </th>
                  <th>Relation</th>
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
                      No emergency contacts found.
                    </td>
                  </tr>
                )}
                {pageItems.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.relation ?? "—"}</td>
                    <td className="text-muted small">
                      {new Date(c.updatedAtUtc ?? c.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/EmergencyContacts/${c.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        <Link
                          className="btn btn-outline-primary"
                          to={`/admin/resource/EmergencyContacts/${c.id}/edit`}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </Link>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete"
                          disabled={deletingId === c.id}
                          onClick={() => handleDelete(c.id, c.name)}
                        >
                          <i className={`fa-solid ${deletingId === c.id ? "fa-spinner fa-spin" : "fa-trash"}`} />
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
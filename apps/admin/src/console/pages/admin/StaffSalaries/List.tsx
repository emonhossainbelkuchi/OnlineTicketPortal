import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllStaffSalaries,
  getStoredStaffSalaries,
  deleteStaffSalary,
  STAFF_SALARY_UPDATED_EVENT,
  type StaffSalaryResponseDto,
} from "@/services/staffSalaryService";

type SortField = "amount" | "payPeriodStart" | "updatedAtUtc";
type SortDir = "asc" | "desc";
type PaidFilter = "all" | "paid" | "unpaid";

const PAGE_SIZES = [10, 25, 50];

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StaffSalaryList() {
  const [items, setItems] = useState<StaffSalaryResponseDto[]>(() => getStoredStaffSalaries());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [sortField, setSortField] = useState<SortField>("updatedAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await getAllStaffSalaries();
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Could not load staff salaries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const list = (e as CustomEvent<StaffSalaryResponseDto[]>).detail;
      setItems(list ?? getStoredStaffSalaries());
    };
    window.addEventListener(STAFF_SALARY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(STAFF_SALARY_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const totalAmount = items.reduce((s, x) => s + x.amount, 0);
    const paid = items.filter((x) => x.isPaid).length;
    const unpaid = total - paid;
    return { total, totalAmount, paid, unpaid };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (paidFilter !== "all") list = list.filter((x) => (paidFilter === "paid" ? x.isPaid : !x.isPaid));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.staffProfileId.toLowerCase().includes(q) ||
          (x.paymentReference ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "amount") cmp = a.amount - b.amount;
      else if (sortField === "payPeriodStart") cmp = a.payPeriodStart.localeCompare(b.payPeriodStart);
      else cmp = (a.updatedAtUtc ?? a.createdAtUtc).localeCompare(b.updatedAtUtc ?? b.createdAtUtc);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, paidFilter, search, sortField, sortDir]);

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

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this salary record?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteStaffSalary(id);
    } catch (e: any) {
      setError(e?.message ?? "Could not delete salary record.");
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
          <li className="breadcrumb-item active">Staff Salaries</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-money-bill-wave me-2 text-primary" />
            Staff Salaries
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/StaffSalaries — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/StaffSalaries/create">
            <i className="fa-solid fa-plus me-2" /> New Record
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card text-white bg-primary shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Total Records</div>
              <div className="fs-5 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-warning shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Total Amount</div>
              <div className="fs-5 fw-bold">BDT {money(stats.totalAmount)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-success shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Paid</div>
              <div className="fs-5 fw-bold">{stats.paid}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-danger shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Unpaid</div>
              <div className="fs-5 fw-bold">{stats.unpaid}</div>
            </div>
          </div>
        </div>
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
                  placeholder="Search by Staff Profile ID / Payment Reference..."
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
                value={paidFilter}
                onChange={(e) => {
                  setPaidFilter(e.target.value as PaidFilter);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
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
                  <th>Staff Profile ID</th>
                  <th role="button" onClick={() => toggleSort("payPeriodStart")}>
                    Pay Period {sortIcon("payPeriodStart")}
                  </th>
                  <th className="text-end" role="button" onClick={() => toggleSort("amount")}>
                    Amount {sortIcon("amount")}
                  </th>
                  <th>Paid</th>
                  <th>Reference</th>
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
                      No salary records found.
                    </td>
                  </tr>
                )}
                {pageItems.map((s) => (
                  <tr key={s.id}>
                    <td className="text-truncate" style={{ maxWidth: 180 }} title={s.staffProfileId}>
                      {s.staffProfileId}
                    </td>
                    <td className="text-muted small">
                      {s.payPeriodStart} → {s.payPeriodEnd}
                    </td>
                    <td className="text-end">{money(s.amount)}</td>
                    <td>
                      {s.isPaid ? (
                        <span className="badge bg-success">Paid</span>
                      ) : (
                        <span className="badge bg-secondary">Unpaid</span>
                      )}
                    </td>
                    <td>{s.paymentReference ?? "—"}</td>
                    <td className="text-muted small">
                      {new Date(s.updatedAtUtc ?? s.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/StaffSalaries/${s.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        <Link
                          className="btn btn-outline-primary"
                          to={`/admin/resource/StaffSalaries/${s.id}/edit`}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </Link>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id)}
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
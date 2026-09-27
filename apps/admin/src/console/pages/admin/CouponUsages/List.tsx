import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllCouponUsages,
  getStoredCouponUsages,
  COUPON_USAGE_UPDATED_EVENT,
  type CouponUsageResponseDto,
} from "@/services/couponUsageService";

type SortField = "discountApplied" | "createdAtUtc";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50];

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CouponUsageList() {
  const [usages, setUsages] = useState<CouponUsageResponseDto[]>(() => getStoredCouponUsages());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await getAllCouponUsages();
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Could not load coupon usages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const list = (e as CustomEvent<CouponUsageResponseDto[]>).detail;
      setUsages(list ?? getStoredCouponUsages());
    };
    window.addEventListener(COUPON_USAGE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(COUPON_USAGE_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = usages.length;
    const totalDiscount = usages.reduce((s, x) => s + x.discountApplied, 0);
    return { total, totalDiscount };
  }, [usages]);

  const filtered = useMemo(() => {
    let list = usages;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.couponId.toLowerCase().includes(q) ||
          x.bookingId.toLowerCase().includes(q) ||
          (x.customerProfileId ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "createdAtUtc") cmp = a.createdAtUtc.localeCompare(b.createdAtUtc);
      else cmp = a.discountApplied - b.discountApplied;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [usages, search, sortField, sortDir]);

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
          <li className="breadcrumb-item active">Coupon Usages</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-ticket me-2 text-primary" />
            Coupon Usages
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/CouponUsages — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
            <span className="ms-2">
              <i className="fa-solid fa-lock me-1" /> immutable — created only via Redeem
            </span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/CouponUsages/redeem">
            <i className="fa-solid fa-plus me-2" /> Redeem Coupon
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
              <div className="text-uppercase small opacity-75">Total Redemptions</div>
              <div className="fs-5 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-success shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Total Discount Given</div>
              <div className="fs-5 fw-bold">BDT {money(stats.totalDiscount)}</div>
            </div>
          </div>
        </div>
      </div>

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
                  placeholder="Search by Coupon / Booking / Customer ID..."
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
              {filtered.length} / {usages.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Coupon ID</th>
                  <th>Booking ID</th>
                  <th>Customer ID</th>
                  <th className="text-end" role="button" onClick={() => toggleSort("discountApplied")}>
                    Discount Applied {sortIcon("discountApplied")}
                  </th>
                  <th role="button" onClick={() => toggleSort("createdAtUtc")}>
                    Redeemed At {sortIcon("createdAtUtc")}
                  </th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && usages.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No coupon usages found.
                    </td>
                  </tr>
                )}
                {pageItems.map((u) => (
                  <tr key={u.id}>
                    <td className="text-truncate" style={{ maxWidth: 180 }} title={u.couponId}>
                      {u.couponId}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 180 }} title={u.bookingId}>
                      {u.bookingId}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 180 }} title={u.customerProfileId ?? ""}>
                      {u.customerProfileId ?? "—"}
                    </td>
                    <td className="text-end">{money(u.discountApplied)}</td>
                    <td className="text-muted small">{new Date(u.createdAtUtc).toLocaleString()}</td>
                    <td className="text-end">
                      <Link
                        className="btn btn-outline-secondary btn-sm"
                        to={`/admin/resource/CouponUsages/${u.id}`}
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
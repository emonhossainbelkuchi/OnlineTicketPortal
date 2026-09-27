import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllReviews,
  getStoredReviews,
  deleteReview,
  REVIEW_UPDATED_EVENT,
  type ReviewResponseDto,
} from "@/services/reviewService";

type SortField = "rating" | "updatedAtUtc";
type SortDir = "asc" | "desc";
type RatingFilter = "all" | "1" | "2" | "3" | "4" | "5";

const PAGE_SIZES = [10, 25, 50];

function stars(n: number) {
  return (
    <span className="text-warning">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={`fa-${i < n ? "solid" : "regular"} fa-star`} />
      ))}
    </span>
  );
}

export default function ReviewList() {
  const [items, setItems] = useState<ReviewResponseDto[]>(() => getStoredReviews());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortField, setSortField] = useState<SortField>("updatedAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await getAllReviews();
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const list = (e as CustomEvent<ReviewResponseDto[]>).detail;
      setItems(list ?? getStoredReviews());
    };
    window.addEventListener(REVIEW_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(REVIEW_UPDATED_EVENT, onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const avg = total ? items.reduce((s, x) => s + x.rating, 0) / total : 0;
    const fiveStar = items.filter((x) => x.rating === 5).length;
    return { total, avg, fiveStar };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (ratingFilter !== "all") list = list.filter((x) => x.rating === Number(ratingFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.tripId.toLowerCase().includes(q) ||
          x.customerProfileId.toLowerCase().includes(q) ||
          (x.comment ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "rating") cmp = a.rating - b.rating;
      else cmp = (a.updatedAtUtc ?? a.createdAtUtc).localeCompare(b.updatedAtUtc ?? b.createdAtUtc);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, ratingFilter, search, sortField, sortDir]);

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
    if (!window.confirm("Delete this review?")) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteReview(id);
    } catch (e: any) {
      setError(e?.message ?? "Could not delete review.");
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
          <li className="breadcrumb-item active">Reviews</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-star me-2 text-primary" />
            Reviews
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/Reviews — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/Reviews/create">
            <i className="fa-solid fa-plus me-2" /> New Review
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
              <div className="text-uppercase small opacity-75">Total Reviews</div>
              <div className="fs-5 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-warning shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Average Rating</div>
              <div className="fs-5 fw-bold">{stats.avg.toFixed(1)} / 5</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-success shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">5-Star Reviews</div>
              <div className="fs-5 fw-bold">{stats.fiveStar}</div>
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
                  placeholder="Search by Trip / Customer ID / Comment..."
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
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value as RatingFilter);
                  setPage(1);
                }}
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
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
                  <th>Trip ID</th>
                  <th>Customer ID</th>
                  <th role="button" onClick={() => toggleSort("rating")}>
                    Rating {sortIcon("rating")}
                  </th>
                  <th>Comment</th>
                  <th role="button" onClick={() => toggleSort("updatedAtUtc")}>
                    Last Updated {sortIcon("updatedAtUtc")}
                  </th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No reviews found.
                    </td>
                  </tr>
                )}
                {pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="text-truncate" style={{ maxWidth: 160 }} title={r.tripId}>
                      {r.tripId}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 160 }} title={r.customerProfileId}>
                      {r.customerProfileId}
                    </td>
                    <td>{stars(r.rating)}</td>
                    <td className="text-truncate" style={{ maxWidth: 220 }} title={r.comment ?? ""}>
                      {r.comment ?? "—"}
                    </td>
                    <td className="text-muted small">
                      {new Date(r.updatedAtUtc ?? r.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/Reviews/${r.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        <Link
                          className="btn btn-outline-primary"
                          to={`/admin/resource/Reviews/${r.id}/edit`}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </Link>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id)}
                        >
                          <i className={`fa-solid ${deletingId === r.id ? "fa-spinner fa-spin" : "fa-trash"}`} />
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
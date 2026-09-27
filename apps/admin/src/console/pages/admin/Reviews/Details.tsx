import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getReviewById, deleteReview, type ReviewResponseDto } from "@/services/reviewService";

function stars(n: number) {
  return (
    <span className="text-warning">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={`fa-${i < n ? "solid" : "regular"} fa-star`} />
      ))}
    </span>
  );
}

export default function ReviewDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ReviewResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getReviewById(id)
      .then((r) => {
        if (!alive) return;
        if (!r) setNotFound(true);
        else setItem(r);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load review."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm("Delete this review?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteReview(id);
      navigate("/admin/resource/Reviews");
    } catch (e: any) {
      setError(e?.message ?? "Could not delete review.");
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
        <div className="alert alert-warning">Review not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/Reviews">
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
            <Link to="/admin/resource/Reviews">Reviews</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-star me-2 text-primary" />
          Review {stars(item.rating)}
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/Reviews/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-2" /> Edit
          </Link>
          <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
            <i className={`fa-solid ${deleting ? "fa-spinner fa-spin" : "fa-trash"} me-2`} />
            Delete
          </button>
          <Link className="btn btn-outline-secondary" to="/admin/resource/Reviews">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">References</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Trip ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.tripId}>
                  {item.tripId}
                </dd>

                <dt className="col-5 text-muted">Booking ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.bookingId ?? ""}>
                  {item.bookingId ?? "—"}
                </dd>

                <dt className="col-5 text-muted">Customer ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.customerProfileId}>
                  {item.customerProfileId}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Review</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Rating</dt>
                <dd className="col-7 text-end">{stars(item.rating)}</dd>

                <dt className="col-12 text-muted">Comment</dt>
                <dd className="col-12">{item.comment ?? "—"}</dd>

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
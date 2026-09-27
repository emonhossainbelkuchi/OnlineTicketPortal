import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getReviewById, updateReview, type ReviewResponseDto } from "@/services/reviewService";

export default function ReviewEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<ReviewResponseDto | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getReviewById(id)
      .then((r) => {
        if (!alive) return;
        if (!r) {
          setNotFound(true);
          return;
        }
        setOriginal(r);
        setRating(r.rating);
        setComment(r.comment ?? "");
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load review."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !original) return;
    setError(null);

    if (rating < 1 || rating > 5) return setError("Rating must be between 1 and 5.");

    setSaving(true);
    try {
      const updated = await updateReview(id, {
        rating,
        comment: comment.trim() || null,
        rowVersion: original.rowVersion,
      });
      navigate(`/admin/resource/Reviews/${updated.id}`);
    } catch (e: any) {
      if (e?.status === 409 || e?.response?.status === 409) {
        setError("This review was changed by another request. Please reload and try again.");
      } else {
        setError(e?.message ?? "Could not update review.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
      </div>
    );
  }

  if (notFound || !original) {
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
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit Review
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Trip and Booking can't be changed here — only Rating and Comment.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Rating *</label>
              <select
                className="form-select"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} Star{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12">
              <label className="form-label">Comment</label>
              <textarea
                className="form-control"
                rows={3}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to={`/admin/resource/Reviews/${original.id}`}>
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createReview } from "@/services/reviewService";

export default function ReviewCreate() {
  const navigate = useNavigate();
  const [tripId, setTripId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tripId.trim()) return setError("Trip ID is required.");
    if (!bookingId.trim()) return setError("Booking ID is required.");
    if (rating < 1 || rating > 5) return setError("Rating must be between 1 and 5.");

    setSaving(true);
    try {
      const created = await createReview({
        tripId: tripId.trim(),
        bookingId: bookingId.trim(),
        rating,
        comment: comment.trim() || null,
      });
      navigate(`/admin/resource/Reviews/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create review.");
    } finally {
      setSaving(false);
    }
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
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-star me-2 text-primary" />
        New Review
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Booking must be your own, for this trip, and already Completed — verified server-side.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Trip ID *</label>
              <input
                className="form-control"
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                placeholder="GUID"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Booking ID *</label>
              <input
                className="form-control"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="GUID"
                required
              />
            </div>

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
              <Link className="btn btn-outline-secondary" to="/admin/resource/Reviews">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Submit Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
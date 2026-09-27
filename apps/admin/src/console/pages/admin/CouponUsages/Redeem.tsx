import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { redeemCoupon } from "@/services/couponUsageService";

export default function CouponUsageRedeem() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code.trim()) return setError("Coupon code is required.");
    if (!bookingId.trim()) return setError("Booking ID is required.");

    setSaving(true);
    try {
      const created = await redeemCoupon({ code: code.trim(), bookingId: bookingId.trim() });
      navigate(`/admin/resource/CouponUsages/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not redeem coupon.");
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
            <Link to="/admin/resource/CouponUsages">Coupon Usages</Link>
          </li>
          <li className="breadcrumb-item active">Redeem</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-ticket me-2 text-primary" />
        Redeem Coupon
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Discount amount, eligibility, and whose usage it is are all resolved server-side — nothing
        here is trusted from input except the code and booking.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Coupon Code *</label>
              <input
                className="form-control text-uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SUMMER25"
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

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/CouponUsages">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Redeem
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
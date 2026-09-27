import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCouponUsageById, type CouponUsageResponseDto } from "@/services/couponUsageService";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CouponUsageDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<CouponUsageResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getCouponUsageById(id)
      .then((u) => {
        if (!alive) return;
        if (!u) setNotFound(true);
        else setItem(u);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load coupon usage."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

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
        <div className="alert alert-warning">Coupon usage not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/CouponUsages">
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
            <Link to="/admin/resource/CouponUsages">Coupon Usages</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-ticket me-2 text-primary" />
          Redemption — {item.id}
        </h4>
        <Link className="btn btn-outline-secondary" to="/admin/resource/CouponUsages">
          Back
        </Link>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-lock me-2" />
        Immutable — a fact about what already happened, never edited or taken back.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">References</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Coupon ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.couponId}>
                  {item.couponId}
                </dd>

                <dt className="col-5 text-muted">Booking ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.bookingId}>
                  {item.bookingId}
                </dd>

                <dt className="col-5 text-muted">Customer ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.customerProfileId ?? ""}>
                  {item.customerProfileId ?? "—"}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Discount</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-6 text-muted fw-semibold">Discount Applied</dt>
                <dd className="col-6 text-end fw-semibold">{money(item.discountApplied)}</dd>

                <dt className="col-6 text-muted">Redeemed At</dt>
                <dd className="col-6 text-end">{new Date(item.createdAtUtc).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
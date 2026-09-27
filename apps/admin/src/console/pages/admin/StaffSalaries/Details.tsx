import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getStaffSalaryById,
  deleteStaffSalary,
  type StaffSalaryResponseDto,
} from "@/services/staffSalaryService";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StaffSalaryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<StaffSalaryResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getStaffSalaryById(id)
      .then((s) => {
        if (!alive) return;
        if (!s) setNotFound(true);
        else setItem(s);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load salary record."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm("Delete this salary record?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteStaffSalary(id);
      navigate("/admin/resource/StaffSalaries");
    } catch (e: any) {
      setError(e?.message ?? "Could not delete salary record.");
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
        <div className="alert alert-warning">Salary record not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/StaffSalaries">
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
            <Link to="/admin/resource/StaffSalaries">Staff Salaries</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-money-bill-wave me-2 text-primary" />
          Salary — {item.payPeriodStart} → {item.payPeriodEnd}
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/StaffSalaries/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-2" /> Edit
          </Link>
          <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
            <i className={`fa-solid ${deleting ? "fa-spinner fa-spin" : "fa-trash"} me-2`} />
            Delete
          </button>
          <Link className="btn btn-outline-secondary" to="/admin/resource/StaffSalaries">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Overview</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Staff Profile ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.staffProfileId}>
                  {item.staffProfileId}
                </dd>

                <dt className="col-5 text-muted">Pay Period Start</dt>
                <dd className="col-7 text-end">{item.payPeriodStart}</dd>

                <dt className="col-5 text-muted">Pay Period End</dt>
                <dd className="col-7 text-end">{item.payPeriodEnd}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Payment</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-6 text-muted fw-semibold">Amount</dt>
                <dd className="col-6 text-end fw-semibold">{money(item.amount)}</dd>

                <dt className="col-6 text-muted">Status</dt>
                <dd className="col-6 text-end">
                  {item.isPaid ? (
                    <span className="badge bg-success">Paid</span>
                  ) : (
                    <span className="badge bg-secondary">Unpaid</span>
                  )}
                </dd>

                <dt className="col-6 text-muted">Paid At</dt>
                <dd className="col-6 text-end">
                  {item.paidAtUtc ? new Date(item.paidAtUtc).toLocaleString() : "—"}
                </dd>

                <dt className="col-6 text-muted">Payment Reference</dt>
                <dd className="col-6 text-end">{item.paymentReference ?? "—"}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
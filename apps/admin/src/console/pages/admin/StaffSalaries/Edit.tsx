import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getStaffSalaryById,
  updateStaffSalary,
  type StaffSalaryResponseDto,
} from "@/services/staffSalaryService";

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StaffSalaryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<StaffSalaryResponseDto | null>(null);
  const [payPeriodStart, setPayPeriodStart] = useState("");
  const [payPeriodEnd, setPayPeriodEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [paidAtUtc, setPaidAtUtc] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getStaffSalaryById(id)
      .then((s) => {
        if (!alive) return;
        if (!s) {
          setNotFound(true);
          return;
        }
        setOriginal(s);
        setPayPeriodStart(s.payPeriodStart);
        setPayPeriodEnd(s.payPeriodEnd);
        setAmount(String(s.amount));
        setIsPaid(s.isPaid);
        setPaidAtUtc(toLocalInputValue(s.paidAtUtc));
        setPaymentReference(s.paymentReference ?? "");
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load salary record."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !original) return;
    setError(null);

    const amountNum = Number(amount);
    if (amountNum < 0) return setError("Amount cannot be negative.");

    setSaving(true);
    try {
      const updated = await updateStaffSalary(id, {
        payPeriodStart,
        payPeriodEnd,
        amount: amountNum,
        isPaid,
        paidAtUtc: isPaid && paidAtUtc ? new Date(paidAtUtc).toISOString() : null,
        paymentReference: paymentReference.trim() || null,
        rowVersion: original.rowVersion,
      });
      navigate(`/admin/resource/StaffSalaries/${updated.id}`);
    } catch (e: any) {
      if (e?.status === 409 || e?.response?.status === 409) {
        setError("This record was changed by another request. Please reload and try again.");
      } else {
        setError(e?.message ?? "Could not update salary record.");
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
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit Salary Record
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Staff Profile can't be reassigned here — a different employee's record is a new record.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-12">
              <label className="form-label">Staff Profile ID</label>
              <input className="form-control" value={original.staffProfileId} disabled />
            </div>

            <div className="col-md-4">
              <label className="form-label">Pay Period Start *</label>
              <input
                type="date"
                className="form-control"
                value={payPeriodStart}
                onChange={(e) => setPayPeriodStart(e.target.value)}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Pay Period End *</label>
              <input
                type="date"
                className="form-control"
                value={payPeriodEnd}
                onChange={(e) => setPayPeriodEnd(e.target.value)}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isPaidEdit"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="isPaidEdit">
                  Mark as Paid
                </label>
              </div>
            </div>

            {isPaid && (
              <>
                <div className="col-md-4">
                  <label className="form-label">Paid At</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={paidAtUtc}
                    onChange={(e) => setPaidAtUtc(e.target.value)}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Payment Reference</label>
                  <input
                    className="form-control"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    maxLength={120}
                  />
                </div>
              </>
            )}

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to={`/admin/resource/StaffSalaries/${original.id}`}>
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
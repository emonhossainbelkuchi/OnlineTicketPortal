import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createStaffSalary } from "@/services/staffSalaryService";

export default function StaffSalaryCreate() {
  const navigate = useNavigate();
  const [staffProfileId, setStaffProfileId] = useState("");
  const [payPeriodStart, setPayPeriodStart] = useState("");
  const [payPeriodEnd, setPayPeriodEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [paidAtUtc, setPaidAtUtc] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!staffProfileId.trim()) return setError("Staff Profile ID is required.");
    if (!payPeriodStart || !payPeriodEnd) return setError("Pay period start and end are required.");
    if (amountNum < 0) return setError("Amount cannot be negative.");

    setSaving(true);
    try {
      const created = await createStaffSalary({
        staffProfileId: staffProfileId.trim(),
        payPeriodStart,
        payPeriodEnd,
        amount: amountNum,
        isPaid,
        paidAtUtc: isPaid && paidAtUtc ? new Date(paidAtUtc).toISOString() : null,
        paymentReference: paymentReference.trim() || null,
      });
      navigate(`/admin/resource/StaffSalaries/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create salary record.");
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
            <Link to="/admin/resource/StaffSalaries">Staff Salaries</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-money-bill-wave me-2 text-primary" />
        New Salary Record
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Staff Profile must belong to your own operator scope — verified server-side.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-12">
              <label className="form-label">Staff Profile ID *</label>
              <input
                className="form-control"
                value={staffProfileId}
                onChange={(e) => setStaffProfileId(e.target.value)}
                placeholder="GUID"
                required
              />
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
                  id="isPaid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="isPaid">
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
                    placeholder="Bank ref / TXN ID"
                  />
                </div>
              </>
            )}

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/StaffSalaries">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Create Record
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
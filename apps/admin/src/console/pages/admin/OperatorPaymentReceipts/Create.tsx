import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { operatorPaymentReceiptService } from "@/services/operatorPaymentReceiptService";

export default function OperatorPaymentReceiptCreate() {
  const navigate = useNavigate();
  const [operatorInvoiceId, setOperatorInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!operatorInvoiceId.trim()) return setError("Operator Invoice ID is required.");
    if (!amountNum || amountNum <= 0) return setError("Amount must be greater than zero.");
    if (currency.trim().length !== 3) return setError("Currency must be a 3-letter code.");

    setSaving(true);
    try {
      const created = await operatorPaymentReceiptService.create({
        operatorInvoiceId: operatorInvoiceId.trim(),
        amount: amountNum,
        currency: currency.trim().toUpperCase(),
        referenceNo: referenceNo.trim() || null,
        notes: notes.trim() || null,
      });
      navigate(`/admin/resource/OperatorPaymentReceipts/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not record payment receipt.");
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
            <Link to="/admin/resource/OperatorPaymentReceipts">Operator Payment Receipts</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-receipt me-2 text-primary" />
        Record Payment Receipt
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-12">
              <label className="form-label">Operator Invoice ID *</label>
              <input
                className="form-control"
                value={operatorInvoiceId}
                onChange={(e) => setOperatorInvoiceId(e.target.value)}
                placeholder="GUID"
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Currency *</label>
              <input
                className="form-control"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Reference No</label>
              <input
                className="form-control"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Bank ref / TXN ID"
              />
            </div>

            <div className="col-12">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorPaymentReceipts">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Record Receipt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
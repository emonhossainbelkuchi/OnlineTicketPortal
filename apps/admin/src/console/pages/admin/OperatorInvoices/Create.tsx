import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { operatorInvoiceService } from "@/services/operatorInvoiceService";
import type { SettlementDirection } from "@/types/operatorInvoice";

export default function OperatorInvoiceCreate() {
  const navigate = useNavigate();
  const [busOperatorId, setBusOperatorId] = useState("");
  const [operatorStatementId, setOperatorStatementId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [direction, setDirection] = useState<SettlementDirection>("OperatorPaysPlatform");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!busOperatorId.trim()) return setError("Bus Operator ID is required.");
    if (!amountNum || amountNum <= 0) return setError("Amount must be greater than zero.");
    if (currency.trim().length !== 3) return setError("Currency must be a 3-letter code.");

    setSaving(true);
    try {
      const created = await operatorInvoiceService.create({
        busOperatorId: busOperatorId.trim(),
        operatorStatementId: operatorStatementId.trim() || null,
        invoiceDate,
        dueDate: dueDate || null,
        direction,
        amount: amountNum,
        currency: currency.trim().toUpperCase(),
      });
      navigate(`/admin/resource/OperatorInvoices/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create invoice.");
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
            <Link to="/admin/resource/OperatorInvoices">Operator Invoices</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-file-invoice-dollar me-2 text-primary" />
        New Operator Invoice
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Bus Operator ID *</label>
              <input
                className="form-control"
                value={busOperatorId}
                onChange={(e) => setBusOperatorId(e.target.value)}
                placeholder="GUID"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Operator Statement ID</label>
              <input
                className="form-control"
                value={operatorStatementId}
                onChange={(e) => setOperatorStatementId(e.target.value)}
                placeholder="Optional GUID"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Invoice Date *</label>
              <input
                type="date"
                className="form-control"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-control"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Direction *</label>
              <select
                className="form-select"
                value={direction}
                onChange={(e) => setDirection(e.target.value as SettlementDirection)}
              >
                <option value="OperatorPaysPlatform">Operator Pays Platform</option>
                <option value="PlatformPaysOperator">Platform Pays Operator</option>
              </select>
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

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorInvoices">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Create Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { operatorPayoutService } from "@/services/operatorPayoutService";
import { payoutLookupService } from "@/services/payoutLookupService";
import type { BusOperator } from "@/lib/api";
import type { OperatorSettlementOption } from "@/types/operatorSettlementOption";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OperatorPayoutCreate() {
  const navigate = useNavigate();

  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(true);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);

  const [settlements, setSettlements] = useState<OperatorSettlementOption[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);

  const [busOperatorId, setBusOperatorId] = useState("");
  const [operatorSettlementId, setOperatorSettlementId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState("BDT");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Load Bus Operators once for the first dropdown.
  useEffect(() => {
    let alive = true;
    payoutLookupService
      .getBusOperators()
      .then((list) => alive && setOperators(list))
      .catch((e: any) => alive && setOperatorsError(e?.message ?? "Could not load bus operators."))
      .finally(() => alive && setOperatorsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Re-load Operator Settlements whenever the chosen operator changes; reset the selection.
  useEffect(() => {
    setOperatorSettlementId("");
    setSettlements([]);
    if (!busOperatorId) return;
    let alive = true;
    setSettlementsLoading(true);
    payoutLookupService
      .getSettlementsForOperator(busOperatorId)
      .then((list) => alive && setSettlements(list))
      .catch(() => alive && setSettlements([]))
      .finally(() => alive && setSettlementsLoading(false));
    return () => {
      alive = false;
    };
  }, [busOperatorId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await operatorPayoutService.create({
        busOperatorId,
        operatorSettlementId: operatorSettlementId || null,
        amount,
        currency: currency.trim().toUpperCase(),
        notes: notes.trim() || null,
      });
      navigate("/admin/resource/OperatorPayouts");
    } catch (e: any) {
      if (e?.status === 400 && e?.raw?.errors) {
        setFieldErrors(e.raw.errors);
      } else {
        // Create also wraps InvalidOperationException (e.g. insufficient balance) as
        // BadRequest({ message }) — that message lands on e.message too.
        setError(e?.message ?? "Could not create payout.");
      }
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
            <Link to="/admin/resource/OperatorPayouts">Operator Payouts</Link>
          </li>
          <li className="breadcrumb-item active">Create</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-plus me-2 text-primary" />
        New Payout
      </h4>

      <div className="alert alert-secondary py-2" style={{ maxWidth: 560 }}>
        <i className="fa-solid fa-circle-info me-2" />
        This reserves the amount from the operator's Available Payout Balance immediately.
      </div>

      <div className="card shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {operatorsError && <div className="alert alert-warning">{operatorsError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">Bus Operator</label>
              <select
                className={`form-select ${fieldErrors.BusOperatorId ? "is-invalid" : ""}`}
                value={busOperatorId}
                required
                disabled={operatorsLoading}
                onChange={(e) => setBusOperatorId(e.target.value)}
              >
                <option value="">
                  {operatorsLoading ? "Loading operators..." : "Select a bus operator..."}
                </option>
                {operators.map((op: any) => (
                  <option key={op.id} value={op.id}>
                    {op.name ?? op.code ?? op.id}
                    {op.code && op.name ? ` (${op.code})` : ""}
                  </option>
                ))}
              </select>
              {fieldErrors.BusOperatorId && (
                <div className="invalid-feedback">{fieldErrors.BusOperatorId[0]}</div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Operator Settlement (optional)</label>
              <select
                className="form-select"
                value={operatorSettlementId}
                disabled={!busOperatorId || settlementsLoading}
                onChange={(e) => setOperatorSettlementId(e.target.value)}
              >
                <option value="">
                  {!busOperatorId
                    ? "Select a bus operator first"
                    : settlementsLoading
                    ? "Loading settlements..."
                    : settlements.length === 0
                    ? "No settlements found for this operator"
                    : "None"}
                </option>
                {settlements.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.settlementNo} — {s.fromDate} → {s.toDate} — {money(s.netAmount)} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-8">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  className={`form-control ${fieldErrors.Amount ? "is-invalid" : ""}`}
                  value={amount}
                  min={0.01}
                  step={0.01}
                  required
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                {fieldErrors.Amount && <div className="invalid-feedback">{fieldErrors.Amount[0]}</div>}
              </div>
              <div className="col-4">
                <label className="form-label">Currency</label>
                <input
                  className={`form-control text-uppercase ${fieldErrors.Currency ? "is-invalid" : ""}`}
                  value={currency}
                  maxLength={3}
                  required
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
                {fieldErrors.Currency && <div className="invalid-feedback">{fieldErrors.Currency[0]}</div>}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                maxLength={250}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={saving || !busOperatorId}>
                {saving ? (
                  <i className="fa-solid fa-spinner fa-spin me-1" />
                ) : (
                  <i className="fa-solid fa-check me-1" />
                )}
                Create Payout
              </button>
              <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorPayouts">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

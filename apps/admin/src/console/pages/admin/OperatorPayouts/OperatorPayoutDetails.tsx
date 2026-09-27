import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { operatorPayoutService } from "@/services/operatorPayoutService";
import type { OperatorPayout, PayoutStatus } from "@/types/operatorPayout";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status: PayoutStatus) {
  const map: Record<PayoutStatus, string> = {
    Pending: "bg-secondary",
    Processing: "bg-warning text-dark",
    Paid: "bg-success",
    Failed: "bg-danger",
    Cancelled: "bg-dark",
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}

export default function OperatorPayoutDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OperatorPayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionType, setActionType] = useState<"process" | "complete" | "fail" | "cancel" | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    if (!id) return;
    operatorPayoutService
      .getById(id)
      .then((p) => setItem(p))
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load payout.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openAction(type: "process" | "complete" | "fail" | "cancel") {
    setActionType(type);
    setActionInput("");
    setActionError(null);
  }

  function closeAction() {
    if (actionBusy) return;
    setActionType(null);
  }

  async function submitAction() {
    if (!id || !actionType) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (actionType === "process") {
        await operatorPayoutService.process(id);
      } else if (actionType === "complete") {
        if (!actionInput.trim()) throw new Error("Bank transaction reference is required.");
        await operatorPayoutService.complete(id, { bankTransactionReference: actionInput.trim() });
      } else if (actionType === "fail") {
        if (!actionInput.trim()) throw new Error("Reason is required.");
        await operatorPayoutService.fail(id, { reason: actionInput.trim() });
      } else if (actionType === "cancel") {
        if (!actionInput.trim()) throw new Error("Reason is required.");
        await operatorPayoutService.cancel(id, { reason: actionInput.trim() });
      }
      setActionType(null);
      setLoading(true);
      load();
    } catch (e: any) {
      setActionError(e?.message ?? "Action failed.");
    } finally {
      setActionBusy(false);
    }
  }

  const actionTitles: Record<string, string> = {
    process: "Mark as Processing",
    complete: "Mark as Paid",
    fail: "Mark as Failed",
    cancel: "Cancel Payout",
  };

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
        <div className="alert alert-warning">Payout not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorPayouts">
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
            <Link to="/admin/resource/OperatorPayouts">Operator Payouts</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-money-bill-transfer me-2 text-primary" />
          {item.payoutNo} {statusBadge(item.status)}
        </h4>
        <div className="d-flex gap-2">
          {item.status === "Pending" && (
            <>
              <button className="btn btn-warning" onClick={() => openAction("process")}>
                <i className="fa-solid fa-play me-1" /> Mark Processing
              </button>
              <button className="btn btn-outline-dark" onClick={() => openAction("cancel")}>
                <i className="fa-solid fa-ban me-1" /> Cancel
              </button>
            </>
          )}
          {item.status === "Processing" && (
            <>
              <button className="btn btn-success" onClick={() => openAction("complete")}>
                <i className="fa-solid fa-check me-1" /> Mark Paid
              </button>
              <button className="btn btn-outline-danger" onClick={() => openAction("fail")}>
                <i className="fa-solid fa-xmark me-1" /> Mark Failed
              </button>
            </>
          )}
          <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorPayouts">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-4 text-muted">Payout No</dt>
            <dd className="col-8">{item.payoutNo}</dd>

            <dt className="col-4 text-muted">Bus Operator ID</dt>
            <dd className="col-8">{item.busOperatorId}</dd>

            <dt className="col-4 text-muted">Operator Settlement ID</dt>
            <dd className="col-8">{item.operatorSettlementId ?? "—"}</dd>

            <dt className="col-4 text-muted">Amount</dt>
            <dd className="col-8">
              {item.currency} {money(item.amount)}
            </dd>

            <dt className="col-4 text-muted">Status</dt>
            <dd className="col-8">{statusBadge(item.status)}</dd>

            <dt className="col-4 text-muted">Bank Transaction Reference</dt>
            <dd className="col-8">{item.bankTransactionReference ?? "—"}</dd>

            <dt className="col-4 text-muted">Paid At</dt>
            <dd className="col-8">{item.paidAtUtc ? new Date(item.paidAtUtc).toLocaleString() : "—"}</dd>

            <dt className="col-4 text-muted">Notes</dt>
            <dd className="col-8">{item.notes ?? "—"}</dd>

            <dt className="col-4 text-muted">Created</dt>
            <dd className="col-8">{new Date(item.createdAtUtc).toLocaleString()}</dd>

            <dt className="col-4 text-muted">Last Updated</dt>
            <dd className="col-8">
              {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}
            </dd>
          </dl>
        </div>
      </div>

      {actionType && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={closeAction}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{actionTitles[actionType]}</h5>
                <button className="btn-close" disabled={actionBusy} onClick={closeAction} />
              </div>
              <div className="modal-body">
                {actionError && <div className="alert alert-danger">{actionError}</div>}
                {actionType === "process" && (
                  <p className="text-muted mb-0">Confirm the bank transfer has been started.</p>
                )}
                {actionType === "complete" && (
                  <div>
                    <label className="form-label">Bank Transaction Reference</label>
                    <input
                      className="form-control"
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="e.g. TXN-2026-000123"
                    />
                  </div>
                )}
                {(actionType === "fail" || actionType === "cancel") && (
                  <div>
                    <label className="form-label">Reason</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" disabled={actionBusy} onClick={closeAction}>
                  Close
                </button>
                <button className="btn btn-primary" disabled={actionBusy} onClick={submitAction}>
                  {actionBusy ? (
                    <i className="fa-solid fa-spinner fa-spin me-1" />
                  ) : (
                    <i className="fa-solid fa-check me-1" />
                  )}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

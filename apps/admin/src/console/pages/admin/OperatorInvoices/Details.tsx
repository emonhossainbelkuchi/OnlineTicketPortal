import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { operatorInvoiceService } from "@/services/operatorInvoiceService";
import type { OperatorInvoice } from "@/types/operatorInvoice";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Draft: "bg-secondary",
    Issued: "bg-info",
    Paid: "bg-success",
    Cancelled: "bg-danger",
  };
  return <span className={`badge ${map[status] ?? "bg-secondary"}`}>{status}</span>;
}

export default function OperatorInvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OperatorInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    operatorInvoiceService
      .getById(id)
      .then((inv) => setItem(inv))
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load operator invoice.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleIssue() {
    if (!id) return;
    setError(null);
    setBusy(true);
    try {
      await operatorInvoiceService.issue(id);
      load();
    } catch (e: any) {
      setError(e?.message ?? "Could not issue invoice.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    const reason = window.prompt("Reason for cancelling this invoice?");
    if (!reason) return;
    setError(null);
    setBusy(true);
    try {
      await operatorInvoiceService.cancel(id, reason);
      load();
    } catch (e: any) {
      setError(e?.message ?? "Could not cancel invoice.");
    } finally {
      setBusy(false);
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
        <div className="alert alert-warning">Operator invoice not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorInvoices">
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
            <Link to="/admin/resource/OperatorInvoices">Operator Invoices</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-file-invoice-dollar me-2 text-primary" />
          Invoice — {item.invoiceNo}
        </h4>
        <div className="d-flex gap-2">
          {item.status === "Draft" && (
            <button className="btn btn-info text-white" disabled={busy} onClick={handleIssue}>
              <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-paper-plane"} me-2`} />
              Issue
            </button>
          )}
          {(item.status === "Draft" || item.status === "Issued") && (
            <button className="btn btn-outline-danger" disabled={busy} onClick={handleCancel}>
              <i className="fa-solid fa-ban me-2" />
              Cancel
            </button>
          )}
          <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorInvoices">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        No generic edit — status only moves via Issue/Cancel here or by recording a payment receipt.
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Overview</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Bus Operator ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.busOperatorId}>
                  {item.busOperatorId}
                </dd>

                <dt className="col-5 text-muted">Statement</dt>
                <dd className="col-7 text-end text-truncate" title={item.operatorStatementId ?? ""}>
                  {item.operatorStatementId ?? "—"}
                </dd>

                <dt className="col-5 text-muted">Invoice Date</dt>
                <dd className="col-7 text-end">{item.invoiceDate}</dd>

                <dt className="col-5 text-muted">Due Date</dt>
                <dd className="col-7 text-end">{item.dueDate ?? "—"}</dd>

                <dt className="col-5 text-muted">Status</dt>
                <dd className="col-7 text-end">{statusBadge(item.status)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Amount</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-6 text-muted">Direction</dt>
                <dd className="col-6 text-end">{item.direction}</dd>

                <dt className="col-6 text-muted fw-semibold">Amount</dt>
                <dd className="col-6 text-end fw-semibold">
                  {item.currency} {money(item.amount)}
                </dd>

                <dt className="col-6 text-muted">Last Updated</dt>
                <dd className="col-6 text-end">
                  {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { operatorPaymentReceiptService } from "@/services/operatorPaymentReceiptService";
import type { OperatorPaymentReceipt } from "@/types/operatorPaymentReceipt";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OperatorPaymentReceiptDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OperatorPaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    operatorPaymentReceiptService
      .getById(id)
      .then((r) => alive && setItem(r))
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load payment receipt.");
      })
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
        <div className="alert alert-warning">Payment receipt not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorPaymentReceipts">
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
            <Link to="/admin/resource/OperatorPaymentReceipts">Operator Payment Receipts</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-receipt me-2 text-primary" />
          Receipt — {item.referenceNo ?? item.id}
        </h4>
        <div className="d-flex gap-2">
          <Link
            className="btn btn-outline-primary"
            to={`/admin/resource/OperatorInvoices/${item.operatorInvoiceId}`}
          >
            <i className="fa-solid fa-file-invoice-dollar me-2" /> View Invoice
          </Link>
          <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorPaymentReceipts">
            Back
          </Link>
        </div>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-lock me-2" />
        Read-only — a receipt is a financial record, never edited after it's recorded.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Overview</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Invoice ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.operatorInvoiceId}>
                  {item.operatorInvoiceId}
                </dd>

                <dt className="col-5 text-muted">Received At</dt>
                <dd className="col-7 text-end">{new Date(item.receivedAtUtc).toLocaleString()}</dd>

                <dt className="col-5 text-muted">Reference No</dt>
                <dd className="col-7 text-end">{item.referenceNo ?? "—"}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Amount &amp; Notes</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted fw-semibold">Amount</dt>
                <dd className="col-7 text-end fw-semibold">
                  {item.currency} {money(item.amount)}
                </dd>

                <dt className="col-12 text-muted">Notes</dt>
                <dd className="col-12">{item.notes ?? "—"}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
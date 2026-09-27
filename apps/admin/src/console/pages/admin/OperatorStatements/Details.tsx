import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { operatorStatementService } from "@/services/operatorStatementService";
import type { OperatorStatementDetail } from "@/types/operatorStatement";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Draft: "bg-secondary",
    Approved: "bg-info",
    Paid: "bg-success",
    Cancelled: "bg-danger",
  };
  return <span className={`badge ${map[status] ?? "bg-secondary"}`}>{status}</span>;
}

export default function OperatorStatementDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OperatorStatementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    operatorStatementService
      .getById(id)
      .then((s) => alive && setItem(s))
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load operator statement.");
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
        <div className="alert alert-warning">Operator statement not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorStatements">
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
            <Link to="/admin/resource/OperatorStatements">Operator Statements</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-file-invoice me-2 text-primary" />
          Statement — {item.statementNo}
        </h4>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorStatements">
          Back
        </Link>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-lock me-2" />
        Read-only — generated alongside its settlement, never created or edited by hand.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Overview</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Bus Operator ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.busOperatorId}>
                  {item.busOperatorId}
                </dd>

                <dt className="col-5 text-muted">Period</dt>
                <dd className="col-7 text-end">
                  {item.fromDate} → {item.toDate}
                </dd>

                <dt className="col-5 text-muted">Status</dt>
                <dd className="col-7 text-end">{statusBadge(item.status)}</dd>

                <dt className="col-5 text-muted">Direction</dt>
                <dd className="col-7 text-end">{item.netDirection}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Amounts</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-7 text-muted">Platform Payable to Operator</dt>
                <dd className="col-5 text-end">{money(item.platformPayableToOperator)}</dd>

                <dt className="col-7 text-muted">Operator Payable to Platform</dt>
                <dd className="col-5 text-end">{money(item.operatorPayableToPlatform)}</dd>

                <dt className="col-7 text-muted fw-semibold">Net Amount</dt>
                <dd className="col-5 text-end fw-semibold">{money(item.netAmount)}</dd>

                <dt className="col-7 text-muted">Last Updated</dt>
                <dd className="col-5 text-end">
                  {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">
          Items <span className="text-muted small">({item.items.length})</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Type</th>
                <th>Channel</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Credit</th>
                <th>Currency</th>
                <th>Description</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {item.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No items.
                  </td>
                </tr>
              )}
              {item.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.itemType}</td>
                  <td>{i.saleChannel}</td>
                  <td className="text-end">{money(i.debitAmount)}</td>
                  <td className="text-end">{money(i.creditAmount)}</td>
                  <td>{i.currency}</td>
                  <td className="text-truncate" style={{ maxWidth: 220 }} title={i.description ?? ""}>
                    {i.description ?? "—"}
                  </td>
                  <td className="text-muted small">{new Date(i.createdAtUtc).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
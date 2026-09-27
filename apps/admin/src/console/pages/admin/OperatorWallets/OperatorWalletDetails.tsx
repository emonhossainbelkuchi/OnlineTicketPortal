import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { operatorWalletService } from "@/services/operatorWalletService";
import type { OperatorWallet } from "@/types/operatorWallet";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OperatorWalletDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OperatorWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    operatorWalletService
      .getById(id)
      .then((w) => alive && setItem(w))
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load operator wallet.");
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
        <div className="alert alert-warning">Operator wallet not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorWallets">
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
            <Link to="/admin/resource/OperatorWallets">Operator Wallets</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-wallet me-2 text-primary" />
          Wallet — {item.busOperatorId}
        </h4>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorWallets">
          Back
        </Link>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-lock me-2" />
        Read-only — these numbers only change via settlements, never editable here.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Sales</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-7 text-muted">Total Online Sales</dt>
                <dd className="col-5 text-end">{money(item.totalOnlineSalesAmount)}</dd>

                <dt className="col-7 text-muted">Total Counter Sales</dt>
                <dd className="col-5 text-end">{money(item.totalCounterSalesAmount)}</dd>

                <dt className="col-7 text-muted">Total Platform Commission</dt>
                <dd className="col-5 text-end">{money(item.totalPlatformCommission)}</dd>

                <dt className="col-7 text-muted">Total Gateway Charge</dt>
                <dd className="col-5 text-end">{money(item.totalGatewayCharge)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Balances</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-7 text-muted">Pending Settlement</dt>
                <dd className="col-5 text-end">{money(item.pendingSettlementBalance)}</dd>

                <dt className="col-7 text-muted">Available Payout</dt>
                <dd className="col-5 text-end">{money(item.availablePayoutBalance)}</dd>

                <dt className="col-7 text-muted">Withdrawn</dt>
                <dd className="col-5 text-end">{money(item.withdrawnAmount)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Receivables</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-7 text-muted">Operator Receivable from Platform</dt>
                <dd className="col-5 text-end">{money(item.operatorReceivableFromPlatform)}</dd>

                <dt className="col-7 text-muted">Platform Receivable from Operator</dt>
                <dd className="col-5 text-end">{money(item.platformReceivableFromOperator)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Meta</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-7 text-muted">Status</dt>
                <dd className="col-5 text-end">
                  {item.isActive ? (
                    <span className="badge bg-success">Active</span>
                  ) : (
                    <span className="badge bg-secondary">Inactive</span>
                  )}
                </dd>

                <dt className="col-7 text-muted">Last Statement</dt>
                <dd className="col-5 text-end">
                  {item.lastStatementDateUtc ? new Date(item.lastStatementDateUtc).toLocaleString() : "—"}
                </dd>

                <dt className="col-7 text-muted">Last Settlement</dt>
                <dd className="col-5 text-end">
                  {item.lastSettlementDateUtc ? new Date(item.lastSettlementDateUtc).toLocaleString() : "—"}
                </dd>

                <dt className="col-7 text-muted">Last Updated</dt>
                <dd className="col-5 text-end">
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

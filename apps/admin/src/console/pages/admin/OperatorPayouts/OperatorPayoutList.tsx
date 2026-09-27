import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { operatorPayoutService } from "@/services/operatorPayoutService";
import type { OperatorPayout, PayoutStatus } from "@/types/operatorPayout";

type SortField = "payoutNo" | "amount" | "status" | "createdAtUtc";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | PayoutStatus;

const PAGE_SIZES = [10, 25, 50];

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

export default function OperatorPayoutList() {
  const navigate = useNavigate();
  const { data, loading, error, lastSyncedAt, reload } = useAutoRefresh<OperatorPayout[]>(
    () => operatorPayoutService.getAll(),
    5000
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [actionTarget, setActionTarget] = useState<OperatorPayout | null>(null);
  const [actionType, setActionType] = useState<"process" | "complete" | "fail" | "cancel" | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const payouts = data ?? [];

  const stats = useMemo(() => {
    const total = payouts.length;
    const pending = payouts.filter((p) => p.status === "Pending").length;
    const processing = payouts.filter((p) => p.status === "Processing").length;
    const paidAmount = payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
    return { total, pending, processing, paidAmount };
  }, [payouts]);

  const filtered = useMemo(() => {
    let list = payouts;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.payoutNo.toLowerCase().includes(q) || p.busOperatorId.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "payoutNo") cmp = a.payoutNo.localeCompare(b.payoutNo);
      else if (sortField === "amount") cmp = a.amount - b.amount;
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else cmp = a.createdAtUtc.localeCompare(b.createdAtUtc);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [payouts, statusFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  function toggleSort(field: SortField) {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIcon(field: SortField) {
    if (field !== sortField) return <i className="fa-solid fa-sort text-muted ms-1" />;
    return <i className={`fa-solid fa-sort-${sortDir === "asc" ? "up" : "down"} ms-1`} />;
  }

  function openAction(p: OperatorPayout, type: "process" | "complete" | "fail" | "cancel") {
    setActionTarget(p);
    setActionType(type);
    setActionInput("");
    setActionError(null);
  }

  function closeAction() {
    if (actionBusy) return;
    setActionTarget(null);
    setActionType(null);
  }

  async function submitAction() {
    if (!actionTarget || !actionType) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (actionType === "process") {
        await operatorPayoutService.process(actionTarget.id);
      } else if (actionType === "complete") {
        if (!actionInput.trim()) throw new Error("Bank transaction reference is required.");
        await operatorPayoutService.complete(actionTarget.id, { bankTransactionReference: actionInput.trim() });
      } else if (actionType === "fail") {
        if (!actionInput.trim()) throw new Error("Reason is required.");
        await operatorPayoutService.fail(actionTarget.id, { reason: actionInput.trim() });
      } else if (actionType === "cancel") {
        if (!actionInput.trim()) throw new Error("Reason is required.");
        await operatorPayoutService.cancel(actionTarget.id, { reason: actionInput.trim() });
      }
      setActionTarget(null);
      setActionType(null);
      await reload();
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

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active">Operator Payouts</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-money-bill-transfer me-2 text-primary" />
            Operator Payouts
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/OperatorPayouts — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => reload()} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/admin/resource/OperatorPayouts/create")}
          >
            <i className="fa-solid fa-plus me-2" />
            New Payout
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="row g-3 mb-3">
        <StatCard label="Total Payouts" value={stats.total} color="bg-primary" />
        <StatCard label="Pending" value={stats.pending} color="bg-secondary" />
        <StatCard label="Processing" value={stats.processing} color="bg-warning" />
        <StatCard label="Paid Amount" value={`BDT ${money(stats.paidAmount)}`} color="bg-success" />
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-2 align-items-center mb-3">
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fa-solid fa-magnifying-glass" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search by Payout No or Bus Operator ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} / page
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2 text-md-end text-muted small">
              {filtered.length} / {payouts.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("payoutNo")}>
                    Payout No {sortIcon("payoutNo")}
                  </th>
                  <th>Bus Operator ID</th>
                  <th className="text-end" role="button" onClick={() => toggleSort("amount")}>
                    Amount {sortIcon("amount")}
                  </th>
                  <th role="button" onClick={() => toggleSort("status")}>
                    Status {sortIcon("status")}
                  </th>
                  <th role="button" onClick={() => toggleSort("createdAtUtc")}>
                    Created {sortIcon("createdAtUtc")}
                  </th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No payouts found.
                    </td>
                  </tr>
                )}
                {pageItems.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.payoutNo}</td>
                    <td className="text-truncate" style={{ maxWidth: 200 }} title={p.busOperatorId}>
                      {p.busOperatorId}
                    </td>
                    <td className="text-end">
                      {p.currency} {money(p.amount)}
                    </td>
                    <td>{statusBadge(p.status)}</td>
                    <td className="text-muted small">{new Date(p.createdAtUtc).toLocaleString()}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/OperatorPayouts/${p.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        {p.status === "Pending" && (
                          <>
                            <button
                              className="btn btn-outline-warning"
                              title="Mark Processing"
                              onClick={() => openAction(p, "process")}
                            >
                              <i className="fa-solid fa-play" />
                            </button>
                            <button
                              className="btn btn-outline-dark"
                              title="Cancel"
                              onClick={() => openAction(p, "cancel")}
                            >
                              <i className="fa-solid fa-ban" />
                            </button>
                          </>
                        )}
                        {p.status === "Processing" && (
                          <>
                            <button
                              className="btn btn-outline-success"
                              title="Mark Paid"
                              onClick={() => openAction(p, "complete")}
                            >
                              <i className="fa-solid fa-check" />
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              title="Mark Failed"
                              onClick={() => openAction(p, "fail")}
                            >
                              <i className="fa-solid fa-xmark" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="d-flex justify-content-end">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pageSafe === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === pageSafe ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setPage(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pageSafe === totalPages ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {actionTarget && actionType && (
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
                <p className="mb-2">
                  Payout <strong>{actionTarget.payoutNo}</strong> — {actionTarget.currency}{" "}
                  {money(actionTarget.amount)}
                </p>
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

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="col-6 col-md-3">
      <div className={`card text-white ${color} shadow-sm`}>
        <div className="card-body py-3">
          <div className="text-uppercase small opacity-75">{label}</div>
          <div className="fs-5 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

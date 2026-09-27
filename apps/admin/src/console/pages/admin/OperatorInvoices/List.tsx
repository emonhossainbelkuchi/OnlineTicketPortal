import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { operatorInvoiceService } from "@/services/operatorInvoiceService";
import type { OperatorInvoice } from "@/types/operatorInvoice";

type SortField = "invoiceNo" | "busOperatorId" | "amount" | "invoiceDate" | "updatedAtUtc";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "Draft" | "Issued" | "Paid" | "Cancelled";

const PAGE_SIZES = [10, 25, 50];

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

export default function OperatorInvoiceList() {
  const { data, loading, error, lastSyncedAt, reload } = useAutoRefresh<OperatorInvoice[]>(
    () => operatorInvoiceService.getAll(),
    5000
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("updatedAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const invoices = data ?? [];

  const stats = useMemo(() => {
    const total = invoices.length;
    const issued = invoices.filter((x) => x.status === "Issued").length;
    const paid = invoices.filter((x) => x.status === "Paid").length;
    const totalAmount = invoices.reduce((s, x) => s + x.amount, 0);
    return { total, issued, paid, totalAmount };
  }, [invoices]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "all") list = list.filter((x) => x.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) => x.busOperatorId.toLowerCase().includes(q) || x.invoiceNo.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "invoiceNo") cmp = a.invoiceNo.localeCompare(b.invoiceNo);
      else if (sortField === "busOperatorId") cmp = a.busOperatorId.localeCompare(b.busOperatorId);
      else if (sortField === "invoiceDate") cmp = a.invoiceDate.localeCompare(b.invoiceDate);
      else if (sortField === "updatedAtUtc")
        cmp = (a.updatedAtUtc ?? a.createdAtUtc).localeCompare(b.updatedAtUtc ?? b.createdAtUtc);
      else cmp = a[sortField] - b[sortField];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [invoices, statusFilter, search, sortField, sortDir]);

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

  async function handleIssue(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await operatorInvoiceService.issue(id);
      await reload();
    } catch (e: any) {
      setActionError(e?.message ?? "Could not issue invoice.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    const reason = window.prompt("Reason for cancelling this invoice?");
    if (!reason) return;
    setActionError(null);
    setBusyId(id);
    try {
      await operatorInvoiceService.cancel(id, reason);
      await reload();
    } catch (e: any) {
      setActionError(e?.message ?? "Could not cancel invoice.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active">Operator Invoices</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-file-invoice-dollar me-2 text-primary" />
            Operator Invoices
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/OperatorInvoices — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => reload()} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/OperatorInvoices/create">
            <i className="fa-solid fa-plus me-2" /> New Invoice
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}
      {actionError && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {actionError}
        </div>
      )}

      <div className="row g-3 mb-3">
        <StatCard label="Total Invoices" value={stats.total} color="bg-primary" />
        <StatCard label="Issued" value={stats.issued} color="bg-info" />
        <StatCard label="Paid" value={stats.paid} color="bg-success" />
        <StatCard label="Total Amount" value={`BDT ${money(stats.totalAmount)}`} color="bg-warning" />
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
                  placeholder="Search by Invoice No / Bus Operator ID..."
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
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Paid">Paid</option>
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
              {filtered.length} / {invoices.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("invoiceNo")}>
                    Invoice No {sortIcon("invoiceNo")}
                  </th>
                  <th role="button" onClick={() => toggleSort("busOperatorId")}>
                    Bus Operator ID {sortIcon("busOperatorId")}
                  </th>
                  <th role="button" onClick={() => toggleSort("invoiceDate")}>
                    Invoice Date {sortIcon("invoiceDate")}
                  </th>
                  <th className="text-end" role="button" onClick={() => toggleSort("amount")}>
                    Amount {sortIcon("amount")}
                  </th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
                    </td>
                  </tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No operator invoices found.
                    </td>
                  </tr>
                )}
                {pageItems.map((inv) => (
                  <tr key={inv.id}>
                    <td className="fw-semibold">{inv.invoiceNo}</td>
                    <td className="text-truncate" style={{ maxWidth: 200 }} title={inv.busOperatorId}>
                      {inv.busOperatorId}
                    </td>
                    <td className="text-muted small">{inv.invoiceDate}</td>
                    <td className="text-end">
                      {inv.currency} {money(inv.amount)}
                    </td>
                    <td className="text-muted small">{inv.direction}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          className="btn btn-outline-secondary"
                          to={`/admin/resource/OperatorInvoices/${inv.id}`}
                          title="Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                        {inv.status === "Draft" && (
                          <button
                            className="btn btn-outline-info"
                            title="Issue"
                            disabled={busyId === inv.id}
                            onClick={() => handleIssue(inv.id)}
                          >
                            <i className={`fa-solid ${busyId === inv.id ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
                          </button>
                        )}
                        {(inv.status === "Draft" || inv.status === "Issued") && (
                          <button
                            className="btn btn-outline-danger"
                            title="Cancel"
                            disabled={busyId === inv.id}
                            onClick={() => handleCancel(inv.id)}
                          >
                            <i className="fa-solid fa-ban" />
                          </button>
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
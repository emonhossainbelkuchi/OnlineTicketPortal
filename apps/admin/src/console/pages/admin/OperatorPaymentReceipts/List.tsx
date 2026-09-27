import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { operatorPaymentReceiptService } from "@/services/operatorPaymentReceiptService";
import type { OperatorPaymentReceipt } from "@/types/operatorPaymentReceipt";

type SortField = "receivedAtUtc" | "amount" | "referenceNo";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50];

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OperatorPaymentReceiptList() {
  const { data, loading, error, lastSyncedAt, reload } = useAutoRefresh<OperatorPaymentReceipt[]>(
    () => operatorPaymentReceiptService.getAll(),
    5000
  );

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("receivedAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const receipts = data ?? [];

  const stats = useMemo(() => {
    const total = receipts.length;
    const totalAmount = receipts.reduce((s, x) => s + x.amount, 0);
    return { total, totalAmount };
  }, [receipts]);

  const filtered = useMemo(() => {
    let list = receipts;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.operatorInvoiceId.toLowerCase().includes(q) ||
          (x.referenceNo ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "receivedAtUtc") cmp = a.receivedAtUtc.localeCompare(b.receivedAtUtc);
      else if (sortField === "referenceNo") cmp = (a.referenceNo ?? "").localeCompare(b.referenceNo ?? "");
      else cmp = a.amount - b.amount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [receipts, search, sortField, sortDir]);

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

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active">Operator Payment Receipts</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-receipt me-2 text-primary" />
            Operator Payment Receipts
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/OperatorPaymentReceipts — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => reload()} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
          </button>
          <Link className="btn btn-primary" to="/admin/resource/OperatorPaymentReceipts/create">
            <i className="fa-solid fa-plus me-2" /> Record Receipt
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card text-white bg-primary shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Total Receipts</div>
              <div className="fs-5 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-success shadow-sm">
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Total Received</div>
              <div className="fs-5 fw-bold">BDT {money(stats.totalAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-2 align-items-center mb-3">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="fa-solid fa-magnifying-glass" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search by Invoice ID / Reference No..."
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
            <div className="col-12 col-md-3 text-md-end text-muted small">
              {filtered.length} / {receipts.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th role="button" onClick={() => toggleSort("receivedAtUtc")}>
                    Received At {sortIcon("receivedAtUtc")}
                  </th>
                  <th className="text-end" role="button" onClick={() => toggleSort("amount")}>
                    Amount {sortIcon("amount")}
                  </th>
                  <th role="button" onClick={() => toggleSort("referenceNo")}>
                    Reference No {sortIcon("referenceNo")}
                  </th>
                  <th>Notes</th>
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
                      No payment receipts found.
                    </td>
                  </tr>
                )}
                {pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="text-truncate" style={{ maxWidth: 200 }} title={r.operatorInvoiceId}>
                      {r.operatorInvoiceId}
                    </td>
                    <td className="text-muted small">{new Date(r.receivedAtUtc).toLocaleString()}</td>
                    <td className="text-end">
                      {r.currency} {money(r.amount)}
                    </td>
                    <td>{r.referenceNo ?? "—"}</td>
                    <td className="text-truncate" style={{ maxWidth: 200 }} title={r.notes ?? ""}>
                      {r.notes ?? "—"}
                    </td>
                    <td className="text-end">
                      <Link
                        className="btn btn-outline-secondary btn-sm"
                        to={`/admin/resource/OperatorPaymentReceipts/${r.id}`}
                        title="Details"
                      >
                        <i className="fa-solid fa-eye" />
                      </Link>
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
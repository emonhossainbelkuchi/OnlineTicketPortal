import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { operatorWalletService } from "@/services/operatorWalletService";
import type { OperatorWallet } from "@/types/operatorWallet";

type SortField =
  | "busOperatorId"
  | "pendingSettlementBalance"
  | "availablePayoutBalance"
  | "operatorReceivableFromPlatform"
  | "updatedAtUtc";
type SortDir = "asc" | "desc";
type ActiveFilter = "all" | "active" | "inactive";

const PAGE_SIZES = [10, 25, 50];

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OperatorWalletList() {
  const { data, loading, error, lastSyncedAt, reload } = useAutoRefresh<OperatorWallet[]>(
    operatorWalletService.getAll,
    5000
  );

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortField, setSortField] = useState<SortField>("updatedAtUtc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const wallets = data ?? [];

  const stats = useMemo(() => {
    const total = wallets.length;
    const pendingSettlement = wallets.reduce((s, w) => s + w.pendingSettlementBalance, 0);
    const availablePayout = wallets.reduce((s, w) => s + w.availablePayoutBalance, 0);
    const platformCommission = wallets.reduce((s, w) => s + w.totalPlatformCommission, 0);
    return { total, pendingSettlement, availablePayout, platformCommission };
  }, [wallets]);

  const filtered = useMemo(() => {
    let list = wallets;
    if (activeFilter !== "all") {
      const wantActive = activeFilter === "active";
      list = list.filter((w) => w.isActive === wantActive);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((w) => w.busOperatorId.toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "busOperatorId") cmp = a.busOperatorId.localeCompare(b.busOperatorId);
      else if (sortField === "updatedAtUtc")
        cmp = (a.updatedAtUtc ?? a.createdAtUtc).localeCompare(b.updatedAtUtc ?? b.createdAtUtc);
      else cmp = a[sortField] - b[sortField];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [wallets, activeFilter, search, sortField, sortDir]);

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
          <li className="breadcrumb-item active">Operator Wallets</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fa-solid fa-wallet me-2 text-primary" />
            Operator Wallets
          </h4>
          <div className="text-muted small">
            <span className="badge bg-success-subtle text-success border border-success-subtle me-2">
              <i className="fa-solid fa-circle fa-2xs me-1" /> Live
            </span>
            api/OperatorWallets — last synced{" "}
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "—"}
            <span className="ms-2">
              <i className="fa-solid fa-lock me-1" /> read-only — updated by settlements only
            </span>
          </div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => reload()} disabled={loading}>
          <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="row g-3 mb-3">
        <StatCard label="Total Wallets" value={stats.total} color="bg-primary" />
        <StatCard label="Pending Settlement" value={`BDT ${money(stats.pendingSettlement)}`} color="bg-warning" />
        <StatCard label="Available Payout" value={`BDT ${money(stats.availablePayout)}`} color="bg-success" />
        <StatCard label="Platform Commission" value={`BDT ${money(stats.platformCommission)}`} color="bg-info" />
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
                  placeholder="Search by Bus Operator ID..."
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
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value as ActiveFilter);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              {filtered.length} / {wallets.length}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("busOperatorId")}>
                    Bus Operator ID {sortIcon("busOperatorId")}
                  </th>
                  <th
                    className="text-end"
                    role="button"
                    onClick={() => toggleSort("pendingSettlementBalance")}
                  >
                    Pending Settlement {sortIcon("pendingSettlementBalance")}
                  </th>
                  <th
                    className="text-end"
                    role="button"
                    onClick={() => toggleSort("availablePayoutBalance")}
                  >
                    Available Payout {sortIcon("availablePayoutBalance")}
                  </th>
                  <th
                    className="text-end"
                    role="button"
                    onClick={() => toggleSort("operatorReceivableFromPlatform")}
                  >
                    Operator Receivable {sortIcon("operatorReceivableFromPlatform")}
                  </th>
                  <th>Status</th>
                  <th role="button" onClick={() => toggleSort("updatedAtUtc")}>
                    Last Updated {sortIcon("updatedAtUtc")}
                  </th>
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
                      No operator wallets found.
                    </td>
                  </tr>
                )}
                {pageItems.map((w) => (
                  <tr key={w.id}>
                    <td className="fw-semibold text-truncate" style={{ maxWidth: 220 }} title={w.busOperatorId}>
                      {w.busOperatorId}
                    </td>
                    <td className="text-end">{money(w.pendingSettlementBalance)}</td>
                    <td className="text-end">{money(w.availablePayoutBalance)}</td>
                    <td className="text-end">{money(w.operatorReceivableFromPlatform)}</td>
                    <td>
                      {w.isActive ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-secondary">Inactive</span>
                      )}
                    </td>
                    <td className="text-muted small">
                      {new Date(w.updatedAtUtc ?? w.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="text-end">
                      <Link
                        className="btn btn-outline-secondary btn-sm"
                        to={`/admin/resource/OperatorWallets/${w.id}`}
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

// src/pages/admin/RefundHistoriesList.tsx
//
// Same visual pattern as the Payment Histories screenshot: stats cards,
// "Live" badge + last-synced time, search/filter bar, feed-style list with
// a "View Refund" link per row. Read-only — this is an audit trail, so
// there's no action row here (unlike RefundsList, which has Approve/Reject/
// Process/etc. — those live on the Refund itself, not its history).

import { Link } from 'react-router-dom';
import { useRefundHistories } from '../../hooks/useRefundHistories';
import {
  RefundStatus,
  RefundStatusBadgeClass,
  RefundStatusIcon,
  RefundStatusLabel,
  type RefundHistoryResponseDto,
} from '../../types/refundHistory.types';

const STATUS_OPTIONS: Array<{ value: RefundStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: RefundStatus.Requested, label: RefundStatusLabel[RefundStatus.Requested] },
  { value: RefundStatus.Approved, label: RefundStatusLabel[RefundStatus.Approved] },
  { value: RefundStatus.Processing, label: RefundStatusLabel[RefundStatus.Processing] },
  { value: RefundStatus.Succeeded, label: RefundStatusLabel[RefundStatus.Succeeded] },
  { value: RefundStatus.Rejected, label: RefundStatusLabel[RefundStatus.Rejected] },
  { value: RefundStatus.Failed, label: RefundStatusLabel[RefundStatus.Failed] },
  {
    value: RefundStatus.PendingManualPayout,
    label: RefundStatusLabel[RefundStatus.PendingManualPayout],
  },
  {
    value: RefundStatus.ReconciliationNeeded,
    label: RefundStatusLabel[RefundStatus.ReconciliationNeeded],
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function HistoryRow({ h }: { h: RefundHistoryResponseDto }) {
  return (
    <div className="d-flex align-items-start gap-3 py-3 border-bottom">
      <div
        className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
        style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.05)' }}
      >
        <i className={RefundStatusIcon[h.status]} />
      </div>
      <div className="flex-grow-1">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="fw-semibold">Status → {RefundStatusLabel[h.status]}</span>
          <span className={`badge ${RefundStatusBadgeClass[h.status]}`}>
            {RefundStatusLabel[h.status]}
          </span>
        </div>
        <div className="text-muted small">Refund {h.refundId}</div>
        {h.remarks && <div className="small mt-1">{h.remarks}</div>}
      </div>
      <div className="text-end flex-shrink-0" style={{ minWidth: 180 }}>
        <div className="text-muted small">{formatDate(h.changedAtUtc)}</div>
        <Link to={`/admin/resource/Refunds/${h.refundId}`} className="small">
          View Refund <i className="fa-solid fa-arrow-up-right-from-square ms-1" />
        </Link>
      </div>
    </div>
  );
}

export default function RefundHistoriesList() {
  const {
    histories,
    grouped,
    filteredCount,
    allCount,
    stats,
    loading,
    error,
    lastSyncedAt,
    refresh,
    search,
    setSearch,
    status,
    setStatus,
    groupByStatus,
    setGroupByStatus,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    page,
    setPage,
    totalPages,
  } = useRefundHistories({ live: true, pageSize: 10 });

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">Admin</li>
          <li className="breadcrumb-item active">Refund Histories</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-1">
        <div>
          <h3 className="mb-1">
            <i className="fa-solid fa-clock-rotate-left me-2" />
            Refund Histories
          </h3>
          <div className="text-muted small d-flex align-items-center gap-2 flex-wrap">
            <span className="badge bg-success bg-opacity-25 text-success">
              <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} />
              Live
            </span>
            <span>
              Read-only audit trail from api/RefundHistories — written only when a Refund's
              status changes
              {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}.` : '.'}
            </span>
          </div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => refresh()} disabled={loading}>
          <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />
        </button>
      </div>

      {/* Stats cards */}
      <div className="row g-3 my-2">
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#9b59f6' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Total Events</div>
              <div className="fs-2 fw-bold">{stats.totalEvents}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#12b886' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Succeeded Events</div>
              <div className="fs-2 fw-bold">{stats.succeeded}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#e0393e' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Needs Attention</div>
              <div className="fs-2 fw-bold">{stats.needsAttention}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#4c6ef5' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Distinct Refunds</div>
              <div className="fs-2 fw-bold">{stats.distinctRefunds}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-2 my-3">
        <div className="col-12 col-md-5">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by History ID, Refund ID, or remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value === 'all' ? 'all' : (Number(e.target.value) as RefundStatus))
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="changedAtUtc">Sort: Changed At</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
        <div className="col-4 col-md-1">
          <button
            className="btn btn-outline-secondary w-100"
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          >
            <i className={`fa-solid ${sortDir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
          </button>
        </div>
        <div className="col-4 col-md-1 d-flex align-items-center">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="groupByStatusHistory"
              checked={groupByStatus}
              onChange={(e) => setGroupByStatus(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="groupByStatusHistory">
              Group
            </label>
          </div>
        </div>
        <div className="col-4 col-md-1 text-muted small d-flex align-items-center">
          {filteredCount}/{allCount}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          {loading && (
            <div className="text-center py-4">
              <i className="fa-solid fa-spinner fa-spin me-2" />
              Loading refund histories...
            </div>
          )}

          {!loading && !groupByStatus && histories.length === 0 && (
            <div className="text-center text-muted py-4">
              <i className="fa-regular fa-face-frown me-2" />
              No refund history entries found.
            </div>
          )}

          {!loading && !groupByStatus && histories.map((h) => <HistoryRow key={h.id} h={h} />)}

          {!loading &&
            groupByStatus &&
            grouped?.map((group) => (
              <div key={group.status} className="mb-3">
                <div className="bg-light rounded px-3 py-2 fw-semibold d-flex align-items-center gap-2">
                  <i className={RefundStatusIcon[group.status]} />
                  {RefundStatusLabel[group.status]}
                  <span className="text-muted fw-normal">({group.rows.length})</span>
                </div>
                {group.rows.map((h) => (
                  <HistoryRow key={h.id} h={h} />
                ))}
              </div>
            ))}
        </div>
      </div>

      {!groupByStatus && totalPages > 1 && (
        <nav aria-label="Refund histories pagination" className="mt-3">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page - 1)}>
                <i className="fa-solid fa-chevron-left" />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page + 1)}>
                <i className="fa-solid fa-chevron-right" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

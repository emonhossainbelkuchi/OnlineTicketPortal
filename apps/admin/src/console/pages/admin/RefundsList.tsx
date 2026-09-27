// src/pages/admin/RefundsList.tsx
//
// Same visual language as the Payment Histories list in the screenshot:
// stats cards up top, a "Live" badge + last-synced timestamp, then a
// search/filter bar and a feed-style (or table-style) list below.
//
// Refunds only ever move via Approve/Reject/Process/CompleteManualPayout —
// no raw edit — so each row's actions are exactly those four, gated by
// status (e.g. Process only shows once Approved).

import { Link } from 'react-router-dom';
import { useRefunds } from '../../hooks/useRefunds';
import {
  RefundStatus,
  RefundStatusBadgeClass,
  RefundStatusIcon,
  RefundStatusLabel,
  type RefundResponseDto,
} from '../../types/refund.types';

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

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function RefundRow({ r }: { r: RefundResponseDto }) {
  return (
    <div className="d-flex align-items-start gap-3 py-3 border-bottom">
      <div
        className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0`}
        style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.05)' }}
      >
        <i className={`${RefundStatusIcon[r.status]}`} />
      </div>
      <div className="flex-grow-1">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="fw-semibold">Status → {RefundStatusLabel[r.status]}</span>
          <span className={`badge ${RefundStatusBadgeClass[r.status]}`}>
            {RefundStatusLabel[r.status]}
          </span>
        </div>
        <div className="text-muted small">
          Payment {r.paymentId} · {r.currency} {r.amount.toFixed(2)}
        </div>
        <div className="small mt-1">{r.reason}</div>
      </div>
      <div className="text-end flex-shrink-0" style={{ minWidth: 180 }}>
        <div className="text-muted small">{formatDate(r.requestedAtUtc)}</div>
        <Link to={`/admin/resource/Refunds/${r.id}`} className="small">
          View Refund <i className="fa-solid fa-arrow-up-right-from-square ms-1" />
        </Link>
      </div>
    </div>
  );
}

export default function RefundsList() {
  const {
    refunds,
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
    pageSize,
  } = useRefunds({ live: true, pageSize: 10 });

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">Admin</li>
          <li className="breadcrumb-item active">Refunds</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-1">
        <div>
          <h3 className="mb-1">
            <i className="fa-solid fa-hand-holding-dollar me-2" />
            Refunds
          </h3>
          <div className="text-muted small d-flex align-items-center gap-2 flex-wrap">
            <span className="badge bg-success bg-opacity-25 text-success">
              <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} />
              Live
            </span>
            <span>
              Approve → Process (or Reject) · api/Refunds
              {lastSyncedAt ? ` — last synced ${lastSyncedAt.toLocaleTimeString()}.` : '.'}
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
              <div className="text-uppercase small opacity-75">Total Refunds</div>
              <div className="fs-2 fw-bold">{stats.totalEvents}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#12b886' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Succeeded</div>
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
              <div className="text-uppercase small opacity-75">Distinct Bookings</div>
              <div className="fs-2 fw-bold">{stats.distinctBookings}</div>
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
              placeholder="Search by Refund ID, Payment ID, Booking ID, or reason..."
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
            <option value="requestedAtUtc">Sort: Requested</option>
            <option value="refundedAtUtc">Sort: Refunded</option>
            <option value="amount">Sort: Amount</option>
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
              id="groupByStatus"
              checked={groupByStatus}
              onChange={(e) => setGroupByStatus(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="groupByStatus">
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
              Loading refunds...
            </div>
          )}

          {!loading && !groupByStatus && refunds.length === 0 && (
            <div className="text-center text-muted py-4">
              <i className="fa-regular fa-face-frown me-2" />
              No refunds found.
            </div>
          )}

          {!loading && !groupByStatus && refunds.map((r) => <RefundRow key={r.id} r={r} />)}

          {!loading &&
            groupByStatus &&
            grouped?.map((group) => (
              <div key={group.status} className="mb-3">
                <div className="bg-light rounded px-3 py-2 fw-semibold d-flex align-items-center gap-2">
                  <i className={RefundStatusIcon[group.status]} />
                  {RefundStatusLabel[group.status]}
                  <span className="text-muted fw-normal">({group.rows.length})</span>
                </div>
                {group.rows.map((r) => (
                  <RefundRow key={r.id} r={r} />
                ))}
              </div>
            ))}
        </div>
      </div>

      {!groupByStatus && totalPages > 1 && (
        <nav aria-label="Refunds pagination" className="mt-3">
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

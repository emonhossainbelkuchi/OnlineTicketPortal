// src/pages/admin/Offers/OffersList.tsx
//
// Same dashboard pattern as PlatformLedgersList/RefundsList: stats cards,
// "Live" badge + last-synced time, search/filter bar, table with actions.
// Reading is open to everyone per OffersController — Create/Edit/Delete
// buttons still render for anyone, but the backend Forbids (403) a non-Admin
// who actually tries one; the service surfaces that as an action error.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOffers } from '../../../hooks/useOffers';
import offerService from '../../../services/offerService';
import {
  OfferStatus,
  OfferStatusBadgeClass,
  OfferStatusIcon,
  OfferStatusLabel,
  type OfferResponseDto,
} from '../../../types/offer.types';

const STATUS_OPTIONS: Array<{ value: OfferStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: OfferStatus.Active, label: OfferStatusLabel[OfferStatus.Active] },
  { value: OfferStatus.Expired, label: OfferStatusLabel[OfferStatus.Expired] },
  { value: OfferStatus.Disabled, label: OfferStatusLabel[OfferStatus.Disabled] },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function OfferRow({
  o,
  onDelete,
}: {
  o: OfferResponseDto;
  onDelete: (o: OfferResponseDto) => void;
}) {
  const isLive =
    o.status === OfferStatus.Active && new Date(o.endDateUtc).getTime() >= Date.now();

  return (
    <tr>
      <td>
        <div className="d-flex align-items-center gap-2">
          <i className={`${OfferStatusIcon[o.status]} text-primary`} />
          <div>
            <div className="fw-semibold">{o.title}</div>
            {o.description && (
              <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>
                {o.description}
              </div>
            )}
          </div>
        </div>
      </td>
      <td>
        {formatDate(o.startDateUtc)} → {formatDate(o.endDateUtc)}
        {isLive && <span className="badge bg-success bg-opacity-25 text-success ms-2">Live now</span>}
      </td>
      <td>
        <span className={`badge ${OfferStatusBadgeClass[o.status]}`}>{OfferStatusLabel[o.status]}</span>
      </td>
      <td>{o.busOperatorId ? <code className="small">{o.busOperatorId}</code> : <span className="text-muted">Platform-wide</span>}</td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link to={`/admin/resource/Offers/${o.id}`} className="btn btn-outline-primary">
            <i className="fa-solid fa-eye" />
          </Link>
          <Link to={`/admin/offers/edit/${o.id}`} className="btn btn-outline-secondary">
            <i className="fa-solid fa-pen" />
          </Link>
          <button className="btn btn-outline-danger" onClick={() => onDelete(o)}>
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function OffersList() {
  const {
    offers,
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
  } = useOffers({ live: true, pageSize: 10 });

  const [pendingDelete, setPendingDelete] = useState<OfferResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await offerService.remove(pendingDelete.id);
      setPendingDelete(null);
      refresh();
    } catch (err: any) {
      setDeleteError(
        err?.response?.status === 403
          ? 'Admin access required to delete offers.'
          : err?.response?.data?.message ?? err?.message ?? 'Failed to delete this offer.'
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">Admin</li>
          <li className="breadcrumb-item">Marketing</li>
          <li className="breadcrumb-item active">Offers</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-1">
        <div>
          <h3 className="mb-1">
            <i className="fa-solid fa-tags me-2" />
            Offers
          </h3>
          <div className="text-muted small d-flex align-items-center gap-2 flex-wrap">
            <span className="badge bg-success bg-opacity-25 text-success">
              <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} />
              Live
            </span>
            <span>
              api/Offers — reading is open to everyone, writes are Admin-only
              {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}.` : '.'}
            </span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => refresh()} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          <Link to="/admin/offers/create" className="btn btn-primary btn-sm">
            <i className="fa-solid fa-plus me-1" />
            New Offer
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="row g-3 my-2">
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#4c6ef5' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Total Offers</div>
              <div className="fs-2 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#12b886' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Active</div>
              <div className="fs-2 fw-bold">{stats.active}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#868e96' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Expired</div>
              <div className="fs-2 fw-bold">{stats.expired}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#e0393e' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Disabled</div>
              <div className="fs-2 fw-bold">{stats.disabled}</div>
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
              placeholder="Search by title or description..."
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
              setStatus(e.target.value === 'all' ? 'all' : (Number(e.target.value) as OfferStatus))
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
            <option value="startDateUtc">Sort: Start Date</option>
            <option value="endDateUtc">Sort: End Date</option>
            <option value="title">Sort: Title</option>
            <option value="status">Sort: Status</option>
            <option value="createdAtUtc">Sort: Created</option>
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
              id="groupByStatusOffers"
              checked={groupByStatus}
              onChange={(e) => setGroupByStatus(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="groupByStatusOffers">
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

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Offer</th>
              <th>Valid Period</th>
              <th>Status</th>
              <th>Operator</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading offers...
                </td>
              </tr>
            )}

            {!loading && !groupByStatus && offers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  <i className="fa-regular fa-face-frown me-2" />
                  No offers found.
                </td>
              </tr>
            )}

            {!loading &&
              !groupByStatus &&
              offers.map((o) => <OfferRow key={o.id} o={o} onDelete={setPendingDelete} />)}

            {!loading &&
              groupByStatus &&
              grouped?.map((group) => (
                <>
                  <tr key={`group-${group.status}`} className="table-secondary">
                    <td colSpan={5} className="fw-semibold">
                      <i className={`${OfferStatusIcon[group.status]} me-2`} />
                      {OfferStatusLabel[group.status]}{' '}
                      <span className="text-muted fw-normal">({group.rows.length})</span>
                    </td>
                  </tr>
                  {group.rows.map((o) => (
                    <OfferRow key={o.id} o={o} onDelete={setPendingDelete} />
                  ))}
                </>
              ))}
          </tbody>
        </table>
      </div>

      {!groupByStatus && totalPages > 1 && (
        <nav aria-label="Offers pagination">
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

      {pendingDelete && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
                  Delete Offer?
                </h5>
                <button className="btn-close" onClick={() => setPendingDelete(null)} />
              </div>
              <div className="modal-body">
                <p>
                  Delete <strong>{pendingDelete.title}</strong>? This can't be undone from here.
                </p>
                {deleteError && <div className="alert alert-danger">{deleteError}</div>}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPendingDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                  {deleting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin me-1" /> Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/admin/PaymentMethodConfigurationsList.tsx
//
// Admin-only list for PaymentMethodConfiguration. Search + method filter +
// active/inactive filter + group-by-method + sort + pagination + auto-refresh.
// Matches PaymentMethodConfigurationsController exactly: GetAll returns an
// empty array (not an error) for a non-Admin caller, so this page treats an
// empty, non-error result as "you don't have access" via the `forbidden`
// flag the hook derives from a 403 — GetAll itself never 403s, only
// GetById/Create/Update/Delete do, per the controller.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePaymentMethodConfigurations } from '../../hooks/usePaymentMethodConfigurations';
import paymentMethodConfigurationService from '../../services/paymentMethodConfigurationService';
import {
  PaymentMethod,
  PaymentMethodIcon,
  PaymentMethodLabel,
  type PaymentMethodConfigurationResponseDto,
} from '../../types/paymentMethodConfiguration.types';

const METHOD_OPTIONS: Array<{ value: PaymentMethod | 'all'; label: string }> = [
  { value: 'all', label: 'All methods' },
  { value: PaymentMethod.Cash, label: PaymentMethodLabel[PaymentMethod.Cash] },
  { value: PaymentMethod.Card, label: PaymentMethodLabel[PaymentMethod.Card] },
  { value: PaymentMethod.MobileBanking, label: PaymentMethodLabel[PaymentMethod.MobileBanking] },
  { value: PaymentMethod.BankTransfer, label: PaymentMethodLabel[PaymentMethod.BankTransfer] },
  { value: PaymentMethod.OnlineGateway, label: PaymentMethodLabel[PaymentMethod.OnlineGateway] },
  { value: PaymentMethod.Wallet, label: PaymentMethodLabel[PaymentMethod.Wallet] },
];

function formatFee(c: PaymentMethodConfigurationResponseDto): string {
  const parts: string[] = [];
  if (c.fixedFee != null && c.fixedFee > 0) parts.push(c.fixedFee.toFixed(2));
  if (c.percentageFee != null && c.percentageFee > 0) parts.push(`${c.percentageFee}%`);
  return parts.length ? parts.join(' + ') : 'Free';
}

function ConfigRow({
  c,
  onDelete,
}: {
  c: PaymentMethodConfigurationResponseDto;
  onDelete: (c: PaymentMethodConfigurationResponseDto) => void;
}) {
  return (
    <tr>
      <td>
        <i className={`${PaymentMethodIcon[c.method]} me-2 text-primary`} />
        {c.displayName}
      </td>
      <td>{PaymentMethodLabel[c.method]}</td>
      <td className="text-end">{formatFee(c)}</td>
      <td>
        <span className={`badge ${c.isActive ? 'bg-success' : 'bg-secondary'}`}>
          {c.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link
            to={`/admin/resource/PaymentMethodConfigurations/${c.id}`}
            className="btn btn-outline-primary"
          >
            <i className="fa-solid fa-eye" />
          </Link>
          <Link
            to={`/admin/payment-method-configurations/edit/${c.id}`}
            className="btn btn-outline-secondary"
          >
            <i className="fa-solid fa-pen" />
          </Link>
          <button className="btn btn-outline-danger" onClick={() => onDelete(c)}>
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PaymentMethodConfigurationsList() {
  const {
    items,
    grouped,
    filteredCount,
    allCount,
    loading,
    error,
    forbidden,
    refresh,
    search,
    setSearch,
    method,
    setMethod,
    status,
    setStatus,
    groupByMethod,
    setGroupByMethod,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    page,
    setPage,
    totalPages,
  } = usePaymentMethodConfigurations({ live: true, pageSize: 10 });

  const [pendingDelete, setPendingDelete] = useState<PaymentMethodConfigurationResponseDto | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await paymentMethodConfigurationService.remove(pendingDelete.id);
      setPendingDelete(null);
      refresh();
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message ?? err?.message ?? 'Failed to delete this configuration.'
      );
    } finally {
      setDeleting(false);
    }
  }

  if (forbidden) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-lock me-2" />
          Payment Method Configurations are Admin-only.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">
          <i className="fa-solid fa-sliders me-2" />
          Payment Method Configurations
        </h3>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => refresh()} disabled={loading}>
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''} me-1`} />
            Refresh
          </button>
          <Link to="/admin/payment-method-configurations/create" className="btn btn-primary btn-sm">
            <i className="fa-solid fa-plus me-1" />
            New Configuration
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-4">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by display name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={method}
            onChange={(e) =>
              setMethod(e.target.value === 'all' ? 'all' : (Number(e.target.value) as PaymentMethod))
            }
          >
            {METHOD_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="displayName">Sort: Name</option>
            <option value="method">Sort: Method</option>
            <option value="fixedFee">Sort: Fixed Fee</option>
            <option value="percentageFee">Sort: % Fee</option>
            <option value="createdAtUtc">Sort: Created</option>
          </select>
        </div>
        <div className="col-6 col-md-1">
          <button
            className="btn btn-outline-secondary w-100"
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            title="Toggle sort direction"
          >
            <i className={`fa-solid ${sortDir === 'asc' ? 'fa-arrow-up-a-z' : 'fa-arrow-down-z-a'}`} />
          </button>
        </div>
        <div className="col-12 col-md-1 d-flex align-items-center">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="groupByMethod"
              checked={groupByMethod}
              onChange={(e) => setGroupByMethod(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="groupByMethod">
              Group
            </label>
          </div>
        </div>
      </div>

      <div className="text-muted small mb-2">
        {filteredCount} of {allCount} configurations
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {error}
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Display Name</th>
              <th>Method</th>
              <th className="text-end">Fee</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading...
                </td>
              </tr>
            )}

            {!loading && !groupByMethod && items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  <i className="fa-regular fa-face-frown me-2" />
                  No payment method configurations found.
                </td>
              </tr>
            )}

            {!loading &&
              !groupByMethod &&
              items.map((c) => (
                <ConfigRow key={c.id} c={c} onDelete={setPendingDelete} />
              ))}

            {!loading &&
              groupByMethod &&
              grouped?.map((group) => (
                <>
                  <tr key={`group-${group.method}`} className="table-secondary">
                    <td colSpan={5} className="fw-semibold">
                      <i className={`${PaymentMethodIcon[group.method]} me-2`} />
                      {PaymentMethodLabel[group.method]}{' '}
                      <span className="text-muted fw-normal">({group.rows.length})</span>
                    </td>
                  </tr>
                  {group.rows.map((c) => (
                    <ConfigRow key={c.id} c={c} onDelete={setPendingDelete} />
                  ))}
                </>
              ))}
          </tbody>
        </table>
      </div>

      {!groupByMethod && totalPages > 1 && (
        <nav aria-label="Payment method configurations pagination">
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

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
                  Delete Configuration?
                </h5>
                <button className="btn-close" onClick={() => setPendingDelete(null)} />
              </div>
              <div className="modal-body">
                <p>
                  Delete <strong>{pendingDelete.displayName}</strong>? This can't be undone from
                  here.
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

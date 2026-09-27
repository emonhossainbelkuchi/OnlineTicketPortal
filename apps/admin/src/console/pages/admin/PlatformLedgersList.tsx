// src/pages/admin/PlatformLedgersList.tsx
//
// Same dashboard pattern as Payment/Refund Histories, but rendered as a
// table (not a feed) since a double-entry ledger reads better in columns —
// Debit/Credit side by side per row, matching how PlatformLedger itself is
// modeled (DebitAmount + CreditAmount, never a single signed amount).

import { Link } from 'react-router-dom';
import { usePlatformLedgers } from '../../hooks/usePlatformLedgers';
import {
  DEBIT_FLAVORED_TYPES,
  SaleChannel,
  SaleChannelLabel,
  StatementItemType,
  StatementItemTypeIcon,
  StatementItemTypeLabel,
  type PlatformLedgerResponseDto,
} from '../../types/platformLedger.types';

const ITEM_TYPE_OPTIONS: Array<{ value: StatementItemType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  ...(Object.values(StatementItemType).filter((v) => typeof v === 'number') as StatementItemType[]).map(
    (t) => ({ value: t, label: StatementItemTypeLabel[t] })
  ),
];

const CHANNEL_OPTIONS: Array<{ value: SaleChannel | 'all'; label: string }> = [
  { value: 'all', label: 'All Channels' },
  ...(Object.values(SaleChannel).filter((v) => typeof v === 'number') as SaleChannel[]).map((c) => ({
    value: c,
    label: SaleChannelLabel[c],
  })),
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function money(n: number) {
  return n.toFixed(2);
}

function LedgerRow({ l }: { l: PlatformLedgerResponseDto }) {
  const debitFlavored = DEBIT_FLAVORED_TYPES.has(l.itemType);
  return (
    <tr>
      <td>
        <div className="d-flex align-items-center gap-2">
          <i className={`${StatementItemTypeIcon[l.itemType]} text-primary`} />
          <div>
            <div className="fw-semibold">{StatementItemTypeLabel[l.itemType]}</div>
            <div className="text-muted small">{l.ledgerNo}</div>
          </div>
        </div>
      </td>
      <td>{l.saleChannel != null ? SaleChannelLabel[l.saleChannel] : '—'}</td>
      <td className="text-end text-danger">{l.debitAmount > 0 ? money(l.debitAmount) : '—'}</td>
      <td className="text-end text-success">{l.creditAmount > 0 ? money(l.creditAmount) : '—'}</td>
      <td>
        <span className={`badge ${debitFlavored ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
          {l.currency}
        </span>
      </td>
      <td className="text-muted small">{l.description ?? '—'}</td>
      <td className="text-muted small">{formatDate(l.createdAtUtc)}</td>
      <td className="text-end">
        <Link to={`/admin/resource/PlatformLedgers/${l.id}`} className="btn btn-sm btn-outline-primary">
          <i className="fa-solid fa-eye" />
        </Link>
      </td>
    </tr>
  );
}

export default function PlatformLedgersList() {
  const {
    entries,
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
    itemType,
    setItemType,
    saleChannel,
    setSaleChannel,
    groupByItemType,
    setGroupByItemType,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    page,
    setPage,
    totalPages,
  } = usePlatformLedgers({ live: true, pageSize: 10 });

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">Admin</li>
          <li className="breadcrumb-item active">Platform Ledgers</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-1">
        <div>
          <h3 className="mb-1">
            <i className="fa-solid fa-book me-2" />
            Platform Ledgers
          </h3>
          <div className="text-muted small d-flex align-items-center gap-2 flex-wrap">
            <span className="badge bg-success bg-opacity-25 text-success">
              <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} />
              Live
            </span>
            <span>
              Read-only, append-only money diary from api/PlatformLedgers — written only by
              FinanceLedgerService
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
          <div className="card text-white shadow-sm" style={{ background: '#4c6ef5' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Total Entries</div>
              <div className="fs-2 fw-bold">{stats.totalEntries}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#e0393e' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Total Debit</div>
              <div className="fs-2 fw-bold">{money(stats.totalDebit)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#12b886' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Total Credit</div>
              <div className="fs-2 fw-bold">{money(stats.totalCredit)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: stats.net >= 0 ? '#12b886' : '#e0393e' }}>
            <div className="card-body">
              <div className="text-uppercase small opacity-75">Net</div>
              <div className="fs-2 fw-bold">{money(stats.net)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-2 my-3">
        <div className="col-12 col-md-4">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Ledger No, reference, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={itemType}
            onChange={(e) =>
              setItemType(e.target.value === 'all' ? 'all' : (Number(e.target.value) as StatementItemType))
            }
          >
            {ITEM_TYPE_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={saleChannel}
            onChange={(e) =>
              setSaleChannel(e.target.value === 'all' ? 'all' : (Number(e.target.value) as SaleChannel))
            }
          >
            {CHANNEL_OPTIONS.map((opt) => (
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
            <option value="createdAtUtc">Sort: Date</option>
            <option value="debitAmount">Sort: Debit</option>
            <option value="creditAmount">Sort: Credit</option>
            <option value="itemType">Sort: Type</option>
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
        <div className="col-8 col-md-1 d-flex align-items-center">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="groupByItemType"
              checked={groupByItemType}
              onChange={(e) => setGroupByItemType(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="groupByItemType">
              Group
            </label>
          </div>
        </div>
      </div>

      <div className="text-muted small mb-2">
        {filteredCount} of {allCount} ledger entries
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
              <th>Item</th>
              <th>Channel</th>
              <th className="text-end">Debit</th>
              <th className="text-end">Credit</th>
              <th>Currency</th>
              <th>Description</th>
              <th>Date</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading...
                </td>
              </tr>
            )}

            {!loading && !groupByItemType && entries.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  <i className="fa-regular fa-face-frown me-2" />
                  No ledger entries found.
                </td>
              </tr>
            )}

            {!loading && !groupByItemType && entries.map((l) => <LedgerRow key={l.id} l={l} />)}

            {!loading &&
              groupByItemType &&
              grouped?.map((group) => (
                <>
                  <tr key={`group-${group.itemType}`} className="table-secondary">
                    <td colSpan={8} className="fw-semibold">
                      <i className={`${StatementItemTypeIcon[group.itemType]} me-2`} />
                      {StatementItemTypeLabel[group.itemType]}{' '}
                      <span className="text-muted fw-normal">
                        ({group.rows.length}) — Debit {money(group.subtotalDebit)} / Credit{' '}
                        {money(group.subtotalCredit)}
                      </span>
                    </td>
                  </tr>
                  {group.rows.map((l) => (
                    <LedgerRow key={l.id} l={l} />
                  ))}
                </>
              ))}
          </tbody>
        </table>
      </div>

      {!groupByItemType && totalPages > 1 && (
        <nav aria-label="Platform ledgers pagination">
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

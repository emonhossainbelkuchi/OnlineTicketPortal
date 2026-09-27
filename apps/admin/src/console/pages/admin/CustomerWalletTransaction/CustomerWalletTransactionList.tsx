import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CustomerWalletTransactionResponseDto,
  getCustomerWalletTransactions,
  CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT,
} from '@/services/customerWalletTransactionService';

const PAGE_SIZE = 10;

const TYPE_STYLE: Record<string, { cls: string; icon: string }> = {
  TopUp: { cls: 'text-bg-success-subtle text-success-emphasis border-success-subtle', icon: 'fa-arrow-up' },
  BookingPayment: { cls: 'text-bg-danger-subtle text-danger-emphasis border-danger-subtle', icon: 'fa-arrow-down' },
  RefundCredit: { cls: 'text-bg-info-subtle text-info-emphasis border-info-subtle', icon: 'fa-rotate-left' },
  AdminAdjustment: { cls: 'text-bg-warning-subtle text-warning-emphasis border-warning-subtle', icon: 'fa-sliders' },
};

type CustomerWalletTransactionType_ = CustomerWalletTransactionResponseDto['transactionType'];
const isCredit = (t: CustomerWalletTransactionType_) => t === 'TopUp' || t === 'RefundCredit';

export const CustomerWalletTransactionList: React.FC = () => {
  const [items, setItems] = useState<CustomerWalletTransactionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getCustomerWalletTransactions();
      setItems(data);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load wallet transactions from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as CustomerWalletTransactionResponseDto[] | undefined;
      if (detail) setItems(detail);
      else load();
    };
    window.addEventListener(CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT, handleUpdate);
  }, []);

  const types = useMemo(() => Array.from(new Set(items.map((t) => t.transactionType))).sort(), [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((t) => {
      const matchesSearch =
        !q ||
        t.transactionType.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.bookingId || '').toLowerCase().includes(q) ||
        (t.refundId || '').toLowerCase().includes(q) ||
        String(t.amount).includes(q);
      const matchesType = typeFilter === 'all' || t.transactionType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, typeFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-success bg-opacity-10 text-success rounded-3 p-2">
            <i className="fa-solid fa-wallet fa-lg" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0 text-dark">Customer Wallet Transactions</h1>
              <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                <i className="fa-solid fa-server me-1" /> Live API
              </span>
              <span className="badge rounded-pill text-bg-secondary-subtle text-secondary-emphasis border">
                <i className="fa-solid fa-lock me-1" /> Read-only
              </span>
            </div>
            <p className="text-muted small mb-0">
              The paper trail behind each customer's wallet balance — written only by
              CustomerWalletService, never hand-entered.
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
          <i className="fa-solid fa-rotate" />
        </button>
      </div>

      {loadError && (
        <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center">
          <span>
            <i className="fa-solid fa-circle-exclamation me-1" /> {loadError}
          </span>
          <button className="btn btn-sm btn-outline-danger" onClick={load}>
            <i className="fa-solid fa-rotate me-1" /> Retry
          </button>
        </div>
      )}

      {/* Search / Filters */}
      <div className="bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search type, description, booking/refund id, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select className="form-select form-select-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3 text-md-end">
            <span className="text-muted small">
              <i className="fa-solid fa-filter me-1" />
              {filteredItems.length} of {items.length} transactions
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3 border shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th className="text-end">Amount</th>
                <th className="text-end">Balance After</th>
                <th>Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading wallet transactions from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <i className="fa-solid fa-wallet fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-1">No wallet transactions found</p>
                    <p className="text-muted small mb-0">
                      Rows appear here once CustomerWalletService credits or debits a wallet.
                    </p>
                  </td>
                </tr>
              ) : (
                pagedItems.map((t) => {
                  const style = TYPE_STYLE[t.transactionType] || { cls: 'text-bg-light', icon: 'fa-circle' };
                  const credit = isCredit(t.transactionType);
                  return (
                    <tr key={t.id}>
                      <td>
                        <span className={`badge border ${style.cls}`}>
                          <i className={`fa-solid ${style.icon} me-1`} /> {t.transactionType}
                        </span>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: 260 }} title={t.description || ''}>
                        {t.description || <span className="text-muted fst-italic">—</span>}
                      </td>
                      <td className={`text-end fw-semibold ${credit ? 'text-success' : 'text-danger'}`}>
                        {credit ? '+' : '-'}
                        {t.amount.toFixed(2)} {t.currency}
                      </td>
                      <td className="text-end">{t.balanceAfter.toFixed(2)}</td>
                      <td className="text-muted">{new Date(t.createdAtUtc).toLocaleString()}</td>
                      <td className="text-end">
                        <Link
                          to={`/admin/customer-wallet-transactions/${t.id}`}
                          className="btn btn-sm btn-outline-secondary"
                          title="View Details"
                        >
                          <i className="fa-solid fa-eye" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredItems.length > 0 && (
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
            <span className="text-muted small">
              Page {page} of {totalPages}
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<number[]>((acc, p) => {
                    if (acc.length && p - acc[acc.length - 1] > 1) acc.push(-1);
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === -1 ? (
                      <li key={`ellipsis-${idx}`} className="page-item disabled">
                        <span className="page-link">…</span>
                      </li>
                    ) : (
                      <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>
                          {p}
                        </button>
                      </li>
                    )
                  )}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerWalletTransactionList;

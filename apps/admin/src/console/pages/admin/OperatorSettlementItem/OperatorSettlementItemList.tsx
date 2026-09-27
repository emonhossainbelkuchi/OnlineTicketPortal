import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  OperatorSettlementItemResponseDto,
  getOperatorSettlementItems,
  OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT,
} from '@/services/operatorSettlementItemService';

const PAGE_SIZE = 10;

const ITEM_TYPE_STYLE: Record<string, string> = {
  OnlineTicketSale: 'text-bg-success-subtle text-success-emphasis border-success-subtle',
  PlatformCommission: 'text-bg-primary-subtle text-primary-emphasis border-primary-subtle',
  GatewayCharge: 'text-bg-warning-subtle text-warning-emphasis border-warning-subtle',
  Refund: 'text-bg-danger-subtle text-danger-emphasis border-danger-subtle',
  CancellationFee: 'text-bg-danger-subtle text-danger-emphasis border-danger-subtle',
  CounterSaleCommission: 'text-bg-info-subtle text-info-emphasis border-info-subtle',
  ManualAdjustment: 'text-bg-secondary-subtle text-secondary-emphasis border-secondary-subtle',
  Tax: 'text-bg-dark-subtle text-dark-emphasis border-dark-subtle',
  Payout: 'text-bg-primary-subtle text-primary-emphasis border-primary-subtle',
};

export const OperatorSettlementItemList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const operatorSettlementId = searchParams.get('operatorSettlementId') || '';

  const [items, setItems] = useState<OperatorSettlementItemResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getOperatorSettlementItems(operatorSettlementId || undefined);
      setItems(data);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) {
        setLoadError('You do not have permission to view these settlement items.');
      } else {
        setLoadError(err?.message || 'Failed to load settlement items from the API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as OperatorSettlementItemResponseDto[] | undefined;
      if (detail) setItems(detail);
      else load();
    };
    window.addEventListener(OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT, handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorSettlementId]);

  const itemTypes = useMemo(() => Array.from(new Set(items.map((i) => i.itemType))).sort(), [items]);
  const channels = useMemo(() => Array.from(new Set(items.map((i) => i.saleChannel))).sort(), [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((i) => {
      const matchesSearch =
        !q ||
        i.itemType.toLowerCase().includes(q) ||
        i.saleChannel.toLowerCase().includes(q) ||
        (i.bookingId || '').toLowerCase().includes(q) ||
        (i.ticketId || '').toLowerCase().includes(q) ||
        String(i.netAmount).includes(q);
      const matchesType = itemTypeFilter === 'all' || i.itemType === itemTypeFilter;
      const matchesChannel = channelFilter === 'all' || i.saleChannel === channelFilter;
      return matchesSearch && matchesType && matchesChannel;
    });
  }, [items, searchQuery, itemTypeFilter, channelFilter]);

  const totals = useMemo(
    () =>
      filteredItems.reduce(
        (acc, i) => ({
          ticketFare: acc.ticketFare + i.ticketFare,
          platformCharge: acc.platformCharge + i.platformCharge,
          gatewayCharge: acc.gatewayCharge + i.gatewayCharge,
          refundAmount: acc.refundAmount + i.refundAmount,
          netAmount: acc.netAmount + i.netAmount,
        }),
        { ticketFare: 0, platformCharge: 0, gatewayCharge: 0, refundAmount: 0, netAmount: 0 }
      ),
    [filteredItems]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, itemTypeFilter, channelFilter, operatorSettlementId]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const clearSettlementFilter = () => {
    searchParams.delete('operatorSettlementId');
    setSearchParams(searchParams);
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-dark bg-opacity-10 text-dark rounded-3 p-2">
            <i className="fa-solid fa-receipt fa-lg" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0 text-dark">Operator Settlement Items</h1>
              <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                <i className="fa-solid fa-server me-1" /> Live API
              </span>
              <span className="badge rounded-pill text-bg-secondary-subtle text-secondary-emphasis border">
                <i className="fa-solid fa-lock me-1" /> Read-only
              </span>
            </div>
            <p className="text-muted small mb-0">
              Line-by-line ledger behind each settlement's totals — generated only by
              SettlementGenerationService, never hand-entered.
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
          <i className="fa-solid fa-rotate" />
        </button>
      </div>

      {operatorSettlementId && (
        <div className="alert alert-info py-2 small d-flex justify-content-between align-items-center">
          <span>
            <i className="fa-solid fa-filter me-1" />
            Filtered to settlement <span className="font-monospace">{operatorSettlementId}</span>
          </span>
          <button className="btn btn-sm btn-outline-secondary" onClick={clearSettlementFilter}>
            <i className="fa-solid fa-xmark me-1" /> Clear
          </button>
        </div>
      )}

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
          <div className="col-12 col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search item type, channel, booking/ticket id, amount..."
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
            <select className="form-select form-select-sm" value={itemTypeFilter} onChange={(e) => setItemTypeFilter(e.target.value)}>
              <option value="all">All Item Types</option>
              {itemTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select form-select-sm" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="all">All Channels</option>
              {channels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2 text-md-end">
            <span className="text-muted small">
              <i className="fa-solid fa-filter me-1" />
              {filteredItems.length} of {items.length} items
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
                <th>Item Type</th>
                <th>Channel</th>
                <th className="text-end">Ticket Fare</th>
                <th className="text-end">Platform Charge</th>
                <th className="text-end">Gateway Charge</th>
                <th className="text-end">Refund</th>
                <th className="text-end">Net Amount</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading settlement items from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <i className="fa-solid fa-receipt fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-1">No settlement items found</p>
                    <p className="text-muted small mb-0">
                      Items appear here once SettlementGenerationService generates a settlement.
                    </p>
                  </td>
                </tr>
              ) : (
                pagedItems.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span className={`badge border ${ITEM_TYPE_STYLE[i.itemType] || 'text-bg-light'}`}>{i.itemType}</span>
                    </td>
                    <td>
                      <span className="badge text-bg-light border">{i.saleChannel}</span>
                    </td>
                    <td className="text-end">{i.ticketFare.toFixed(2)}</td>
                    <td className="text-end text-danger">{i.platformCharge ? `-${i.platformCharge.toFixed(2)}` : '0.00'}</td>
                    <td className="text-end text-danger">{i.gatewayCharge ? `-${i.gatewayCharge.toFixed(2)}` : '0.00'}</td>
                    <td className="text-end text-danger">{i.refundAmount ? `-${i.refundAmount.toFixed(2)}` : '0.00'}</td>
                    <td className="text-end fw-semibold">{i.netAmount.toFixed(2)}</td>
                    <td className="text-end">
                      <Link to={`/admin/operator-settlement-items/${i.id}`} className="btn btn-sm btn-outline-secondary" title="View Details">
                        <i className="fa-solid fa-eye" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filteredItems.length > 0 && (
              <tfoot>
                <tr className="table-light fw-semibold">
                  <td colSpan={2}>Totals ({filteredItems.length} items)</td>
                  <td className="text-end">{totals.ticketFare.toFixed(2)}</td>
                  <td className="text-end text-danger">-{totals.platformCharge.toFixed(2)}</td>
                  <td className="text-end text-danger">-{totals.gatewayCharge.toFixed(2)}</td>
                  <td className="text-end text-danger">-{totals.refundAmount.toFixed(2)}</td>
                  <td className="text-end">{totals.netAmount.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
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

export default OperatorSettlementItemList;

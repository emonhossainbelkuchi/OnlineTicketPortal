import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IntegrationWebhookLogResponseDto,
  getAllWebhookLogs,
  subscribeToWebhookLogPolling,
} from '@/services/integrationWebhookLogService';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 10;

type ProcessedFilter = 'all' | 'processed' | 'unprocessed';
type ErrorFilter = 'all' | 'with_error' | 'no_error';

export const IntegrationWebhookLogList: React.FC = () => {
  const { hasRole } = useAuth();
  // GetAll itself returns [] (not 403) for non-platform-staff — this mirrors that by treating
  // an empty, no-error result the same way, but we can short-circuit the explanation for
  // anyone who clearly isn't platform staff/admin.
  const isPlatformStaff = hasRole('Admin', 'Staff');

  const [items, setItems] = useState<IntegrationWebhookLogResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [processedFilter, setProcessedFilter] = useState<ProcessedFilter>('all');
  const [errorFilter, setErrorFilter] = useState<ErrorFilter>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'); // by ReceivedAtUtc
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllWebhookLogs();
      setItems(data);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load webhook logs from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = subscribeToWebhookLogPolling((data) => {
      setItems(data);
      setLastSyncedAt(new Date());
    });
    return unsubscribe;
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = items.filter((log) => {
      const matchesSearch =
        !q ||
        log.eventType.toLowerCase().includes(q) ||
        (log.externalEventId || '').toLowerCase().includes(q) ||
        log.operatorIntegrationId.toLowerCase().includes(q);
      const matchesProcessed =
        processedFilter === 'all' ||
        (processedFilter === 'processed' ? log.isProcessed : !log.isProcessed);
      const matchesError =
        errorFilter === 'all' ||
        (errorFilter === 'with_error' ? !!log.errorMessage : !log.errorMessage);
      return matchesSearch && matchesProcessed && matchesError;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (new Date(a.receivedAtUtc).getTime() - new Date(b.receivedAtUtc).getTime()) * dir;
    });

    return rows;
  }, [items, searchQuery, processedFilter, errorFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, processedFilter, errorFilter, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const stats = useMemo(() => {
    const total = items.length;
    const processed = items.filter((l) => l.isProcessed).length;
    const withError = items.filter((l) => !!l.errorMessage).length;
    const pending = items.filter((l) => !l.isProcessed && !l.errorMessage).length;
    return { total, processed, withError, pending };
  }, [items]);

  if (!isPlatformStaff) {
    return (
      <div className="alert alert-secondary">
        <i className="fa-solid fa-lock me-1" /> Integration webhook logs are visible to platform
        Admin/Staff only.
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-success bg-opacity-10 text-success rounded-3 p-2">
              <i className="fa-solid fa-satellite-dish fa-lg" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h1 className="h5 fw-bold mb-0 text-dark">Integration Webhook Logs</h1>
                <span className="badge rounded-pill text-bg-success-subtle text-success-emphasis border border-success-subtle">
                  <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} /> Live
                </span>
              </div>
              <p className="text-muted small mb-0">
                Read-only, platform-only. Raw inbound webhook events from operator ERPs —
                api/IntegrationWebhookLogs
                {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}.` : '.'}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
            <i className="fa-solid fa-rotate" />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#4c6ef5' }}>
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Total Events</div>
              <div className="fs-3 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#12b886' }}>
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Processed</div>
              <div className="fs-3 fw-bold">{stats.processed}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#f59f00' }}>
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Pending</div>
              <div className="fs-3 fw-bold">{stats.pending}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#e0393e' }}>
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">With Error</div>
              <div className="fs-3 fw-bold">{stats.withError}</div>
            </div>
          </div>
        </div>
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
          <div className="col-12 col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search event type, external event ID, integration ID..."
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
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={processedFilter}
              onChange={(e) => setProcessedFilter(e.target.value as ProcessedFilter)}
            >
              <option value="all">All (Processed)</option>
              <option value="processed">Processed</option>
              <option value="unprocessed">Unprocessed</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={errorFilter}
              onChange={(e) => setErrorFilter(e.target.value as ErrorFilter)}
            >
              <option value="all">All (Errors)</option>
              <option value="with_error">With Error</option>
              <option value="no_error">No Error</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <button
              className="btn btn-outline-secondary btn-sm w-100"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              <i className={`fa-solid ${sortDir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'} me-1`} />
              Received
            </button>
          </div>
          <div className="col-6 col-md-2 text-md-end">
            <span className="text-muted small">
              {filteredItems.length}/{items.length}
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
                <th>Event Type</th>
                <th>External Event ID</th>
                <th>Integration</th>
                <th>Received</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading webhook logs from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <i className="fa-solid fa-satellite-dish fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-0">No webhook logs found</p>
                    <p className="text-muted small mb-0">Try adjusting filters.</p>
                  </td>
                </tr>
              ) : (
                pagedItems.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="badge text-bg-light border font-monospace">{log.eventType}</span>
                    </td>
                    <td className="text-muted font-monospace">{log.externalEventId || '—'}</td>
                    <td className="text-muted font-monospace" style={{ maxWidth: 160 }}>
                      <span className="text-truncate d-inline-block" style={{ maxWidth: 160 }}>
                        {log.operatorIntegrationId}
                      </span>
                    </td>
                    <td className="text-muted">{new Date(log.receivedAtUtc).toLocaleString()}</td>
                    <td>
                      {log.errorMessage ? (
                        <span className="badge text-bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                          <i className="fa-solid fa-circle-exclamation me-1" /> Error
                        </span>
                      ) : log.isProcessed ? (
                        <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle">
                          <i className="fa-solid fa-circle-check me-1" /> Processed
                        </span>
                      ) : (
                        <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                          <i className="fa-solid fa-clock me-1" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      <Link to={`/admin/integration-webhook-logs/${log.id}`} className="btn btn-outline-secondary btn-sm" title="View Details">
                        <i className="fa-solid fa-eye" />
                      </Link>
                    </td>
                  </tr>
                ))
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

export default IntegrationWebhookLogList;

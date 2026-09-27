import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LoginHistoryResponseDto,
  getAllLoginHistories,
  subscribeToLoginHistoryPolling,
  summarizeUserAgent,
  actorDisplayName,
} from '@/services/loginHistoryService';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 10;

type SuccessFilter = 'all' | 'success' | 'failed';

export const LoginHistoryList: React.FC = () => {
  const { hasRole, user } = useAuth();
  const isPrivileged = hasRole('Admin', 'Staff');

  const [items, setItems] = useState<LoginHistoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [successFilter, setSuccessFilter] = useState<SuccessFilter>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'); // by LoginAtUtc
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllLoginHistories();
      setItems(data);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load login history from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = subscribeToLoginHistoryPolling((data) => {
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
        (log.ipAddress || '').toLowerCase().includes(q) ||
        (log.userAgent || '').toLowerCase().includes(q) ||
        log.userId.toLowerCase().includes(q) ||
        actorDisplayName(log).toLowerCase().includes(q);
      const matchesSuccess =
        successFilter === 'all' || (successFilter === 'success' ? log.success : !log.success);
      return matchesSearch && matchesSuccess;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (new Date(a.loginAtUtc).getTime() - new Date(b.loginAtUtc).getTime()) * dir;
    });

    return rows;
  }, [items, searchQuery, successFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, successFilter, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const stats = useMemo(() => {
    const total = items.length;
    const success = items.filter((l) => l.success).length;
    const failed = items.filter((l) => !l.success).length;
    const distinctUsers = new Set(items.map((l) => l.userId)).size;
    return { total, success, failed, distinctUsers };
  }, [items]);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-success bg-opacity-10 text-success rounded-3 p-2">
              <i className="fa-solid fa-right-to-bracket fa-lg" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h1 className="h5 fw-bold mb-0 text-dark">Login History</h1>
                <span className="badge rounded-pill text-bg-success-subtle text-success-emphasis border border-success-subtle">
                  <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} /> Live
                </span>
              </div>
              <p className="text-muted small mb-0">
                {isPrivileged
                  ? 'Every login attempt across all users — api/LoginHistories.'
                  : 'Your own recent login activity.'}
                {lastSyncedAt ? ` Last synced ${lastSyncedAt.toLocaleTimeString()}.` : ''}
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
              <div className="text-uppercase small opacity-75">Total Attempts</div>
              <div className="fs-3 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#12b886' }}>
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Successful</div>
              <div className="fs-3 fw-bold">{stats.success}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#e0393e' }}>
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">Failed</div>
              <div className="fs-3 fw-bold">{stats.failed}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white shadow-sm" style={{ background: '#9b59f6' }}>
            <div className="card-body py-3">
              <div className="text-uppercase small opacity-75">{isPrivileged ? 'Distinct Users' : 'Your Account'}</div>
              <div className="fs-3 fw-bold">{isPrivileged ? stats.distinctUsers : 1}</div>
            </div>
          </div>
        </div>
      </div>

      {stats.failed > 0 && (
        <div className="alert alert-warning py-2 small mb-3">
          <i className="fa-solid fa-triangle-exclamation me-1" />
          {stats.failed} failed login attempt(s) {isPrivileged ? 'across all users' : 'on your account'}. Review
          below if any look unfamiliar.
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
                placeholder={isPrivileged ? 'Search IP, device, actor...' : 'Search IP or device...'}
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
            <select
              className="form-select form-select-sm"
              value={successFilter}
              onChange={(e) => setSuccessFilter(e.target.value as SuccessFilter)}
            >
              <option value="all">All Attempts</option>
              <option value="success">Successful Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <button
              className="btn btn-outline-secondary btn-sm w-100"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              <i className={`fa-solid ${sortDir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'} me-1`} />
              Time
            </button>
          </div>
          <div className="col-12 col-md-2 text-md-end">
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
                <th>Status</th>
                {isPrivileged && <th>Actor</th>}
                <th>Device</th>
                <th>IP Address</th>
                <th>When</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isPrivileged ? 6 : 5} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading login history from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={isPrivileged ? 6 : 5} className="text-center py-5">
                    <i className="fa-solid fa-right-to-bracket fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-0">No login attempts found</p>
                    <p className="text-muted small mb-0">Try adjusting filters.</p>
                  </td>
                </tr>
              ) : (
                pagedItems.map((log) => {
                  const isYou = user?.id === log.userId;
                  return (
                    <tr key={log.id}>
                      <td>
                        {log.success ? (
                          <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle">
                            <i className="fa-solid fa-circle-check me-1" /> Success
                          </span>
                        ) : (
                          <span className="badge text-bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                            <i className="fa-solid fa-circle-xmark me-1" /> Failed
                          </span>
                        )}
                      </td>
                      {isPrivileged && (
                        <td className="text-truncate" style={{ maxWidth: 160 }} title={log.userId}>
                          {actorDisplayName(log)}
                          {isYou && <span className="badge text-bg-light border ms-1">You</span>}
                        </td>
                      )}
                      <td className="text-muted" title={log.userAgent || ''}>
                        <i className="fa-solid fa-desktop me-1" /> {summarizeUserAgent(log.userAgent)}
                      </td>
                      <td className="text-muted font-monospace">{log.ipAddress || '—'}</td>
                      <td className="text-muted">{new Date(log.loginAtUtc).toLocaleString()}</td>
                      <td className="text-end">
                        <Link to={`/admin/login-histories/${log.id}`} className="btn btn-outline-secondary btn-sm" title="View Details">
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

export default LoginHistoryList;

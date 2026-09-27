import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ActivityLogResponseDto,
  getAllActivityLogs,
  subscribeToActivityLogPolling,
} from '@/services/activityLogService';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 10;

const ACTION_ICON: Record<string, string> = {
  Create: 'fa-plus text-success',
  Update: 'fa-pen text-primary',
  Delete: 'fa-trash text-danger',
  Login: 'fa-right-to-bracket text-info',
  Logout: 'fa-right-from-bracket text-secondary',
};

function actionIcon(action: string) {
  const key = Object.keys(ACTION_ICON).find((k) => action.toLowerCase().includes(k.toLowerCase()));
  return key ? ACTION_ICON[key] : 'fa-circle-dot text-muted';
}

export const ActivityLogList: React.FC = () => {
  const { hasRole } = useAuth();
  const canView = hasRole('Admin', 'Staff');

  const [items, setItems] = useState<ActivityLogResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'); // by CreatedAtUtc
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllActivityLogs();
      setItems(data);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load activity logs from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = subscribeToActivityLogPolling((data) => {
      setItems(data);
      setLastSyncedAt(new Date());
    });
    return unsubscribe;
  }, []);

  const entityOptions = useMemo(() => {
    const set = new Set(items.map((l) => l.entityName).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = items.filter((log) => {
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        (log.entityName || '').toLowerCase().includes(q) ||
        (log.entityId || '').toLowerCase().includes(q) ||
        (log.ipAddress || '').toLowerCase().includes(q) ||
        (log.userId || '').toLowerCase().includes(q);
      const matchesEntity = entityFilter === 'all' || log.entityName === entityFilter;
      return matchesSearch && matchesEntity;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime()) * dir;
    });

    return rows;
  }, [items, searchQuery, entityFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, entityFilter, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const stats = useMemo(() => {
    const total = items.length;
    const creates = items.filter((l) => l.action.toLowerCase().includes('create')).length;
    const updates = items.filter((l) => l.action.toLowerCase().includes('update')).length;
    const deletes = items.filter((l) => l.action.toLowerCase().includes('delete')).length;
    return { total, creates, updates, deletes };
  }, [items]);

  if (!canView) {
    return (
      <div className="alert alert-secondary">
        <i className="fa-solid fa-lock me-1" /> Activity logs are visible to Admin/Staff only.
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
              <i className="fa-solid fa-list-check fa-lg" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h1 className="h5 fw-bold mb-0 text-dark">Activity Logs</h1>
                <span className="badge rounded-pill text-bg-success-subtle text-success-emphasis border border-success-subtle">
                  <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} /> Live
                </span>
              </div>
              <p className="text-muted small mb-0">
                Read-only, Admin/Staff-only "who did what" trail — api/ActivityLogs
                {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}.` : '.'}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
            <i className="fa-solid fa-rotate" />
          </button>
        </div>
      </div>

      {items.length === 0 && !loading && !loadError && (
        <div className="alert alert-info py-2 small">
          <i className="fa-solid fa-circle-info me-1" /> No entries yet — nothing in the system
          currently writes to this feed (flagged as future work).
        </div>
      )}

      {/* Stats cards */}
      {items.length > 0 && (
        <div className="row g-3 mb-3">
          <div className="col-6 col-md-3">
            <div className="card text-white shadow-sm" style={{ background: '#4c6ef5' }}>
              <div className="card-body py-3">
                <div className="text-uppercase small opacity-75">Total Entries</div>
                <div className="fs-3 fw-bold">{stats.total}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card text-white shadow-sm" style={{ background: '#12b886' }}>
              <div className="card-body py-3">
                <div className="text-uppercase small opacity-75">Creates</div>
                <div className="fs-3 fw-bold">{stats.creates}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card text-white shadow-sm" style={{ background: '#f59f00' }}>
              <div className="card-body py-3">
                <div className="text-uppercase small opacity-75">Updates</div>
                <div className="fs-3 fw-bold">{stats.updates}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card text-white shadow-sm" style={{ background: '#e0393e' }}>
              <div className="card-body py-3">
                <div className="text-uppercase small opacity-75">Deletes</div>
                <div className="fs-3 fw-bold">{stats.deletes}</div>
              </div>
            </div>
          </div>
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
                placeholder="Search action, entity, entity ID, IP, user ID..."
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
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="all">All Entities</option>
              {entityOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
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
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
                <th>IP Address</th>
                <th>When</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading activity logs from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <i className="fa-solid fa-list-check fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-0">No activity found</p>
                    <p className="text-muted small mb-0">Try adjusting filters.</p>
                  </td>
                </tr>
              ) : (
                pagedItems.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <i className={`fa-solid ${actionIcon(log.action)} me-2`} />
                      {log.action}
                    </td>
                    <td>
                      {log.entityName ? (
                        <>
                          <span className="badge text-bg-light border">{log.entityName}</span>
                          {log.entityId && (
                            <div className="text-muted font-monospace text-truncate" style={{ maxWidth: 160 }}>
                              {log.entityId}
                            </div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="font-monospace text-muted text-truncate" style={{ maxWidth: 140 }}>
                      {log.userId || '—'}
                    </td>
                    <td className="text-muted font-monospace">{log.ipAddress || '—'}</td>
                    <td className="text-muted">{new Date(log.createdAtUtc).toLocaleString()}</td>
                    <td className="text-end">
                      <Link to={`/admin/activity-logs/${log.id}`} className="btn btn-outline-secondary btn-sm" title="View Details">
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

export default ActivityLogList;

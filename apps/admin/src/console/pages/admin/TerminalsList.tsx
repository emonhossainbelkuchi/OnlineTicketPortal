import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAllTerminals,
  deleteTerminal,
  subscribeToTerminals,
  getCurrentUserRole,
  getKnownDivisions,
  extractErrorMessage,
} from '@/services/terminalService';
import type { TerminalResponseDto } from '@/types/terminal.types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const POLL_INTERVAL_MS = 15000;

export const TerminalsList: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin';

  const [terminals, setTerminals] = useState<TerminalResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortKey, setSortKey] = useState<'name' | 'code' | 'city' | 'division' | 'createdAtUtc'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [deleteCandidate, setDeleteCandidate] = useState<TerminalResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pollRef = useRef<number | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getAllTerminals();
      setTerminals(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToTerminals(() => loadData(true));
    pollRef.current = window.setInterval(() => loadData(true), POLL_INTERVAL_MS);
    const onFocus = () => loadData(true);
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => { setPage(1); }, [searchQuery, divisionFilter, statusFilter, pageSize]);

  const divisions = useMemo(() => getKnownDivisions(), [terminals]);

  const filteredSorted = useMemo(() => {
    let list = terminals.filter((t) => {
      if (statusFilter === 'ACTIVE' && !t.isActive) return false;
      if (statusFilter === 'INACTIVE' && t.isActive) return false;
      if (divisionFilter !== 'ALL' && t.division !== divisionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.district.toLowerCase().includes(q) ||
          t.division.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'createdAtUtc') {
        cmp = new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime();
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [terminals, searchQuery, divisionFilter, statusFilter, sortKey, sortDir]);

  const totalItems = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: terminals.length,
    active: terminals.filter((t) => t.isActive).length,
    inactive: terminals.filter((t) => !t.isActive).length,
    divisions: new Set(terminals.map((t) => t.division)).size,
  }), [terminals]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (key: typeof sortKey) => {
    if (sortKey !== key) return <i className="fa-solid fa-sort text-slate-300 ms-1" />;
    return sortDir === 'asc'
      ? <i className="fa-solid fa-sort-up text-blue-600 ms-1" />
      : <i className="fa-solid fa-sort-down text-blue-600 ms-1" />;
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await deleteTerminal(deleteCandidate.id);
      setDeleteCandidate(null);
      await loadData(true);
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Terminals</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-bus-simple text-sm" />
            </div>
            Terminals
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 badge bg-success-subtle text-success border border-success">
              <span className="d-inline-block rounded-circle bg-success" style={{ width: 6, height: 6 }} />
              Live
            </span>
            <span>
              Same api/Terminals backend used by every dropdown across the portal
              {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}` : ''}.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Refresh now"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          {canWrite ? (
            <Link
              to="/admin/terminals/create"
              className="px-3.5 py-2 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <i className="fa-solid fa-plus" />
              <span>New Terminal</span>
            </Link>
          ) : (
            <button disabled title="Admin role required" className="px-3.5 py-2 bg-slate-200 text-slate-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed">
              <i className="fa-solid fa-plus" />
              <span>New Terminal</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0" role="alert">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Terminals', value: stats.total, icon: 'fa-bus-simple', grad: 'from-indigo-500 to-blue-600' },
          { label: 'Active', value: stats.active, icon: 'fa-circle-check', grad: 'from-emerald-500 to-teal-600' },
          { label: 'Inactive', value: stats.inactive, icon: 'fa-circle-pause', grad: 'from-rose-500 to-red-600' },
          { label: 'Divisions Covered', value: stats.divisions, icon: 'fa-map-location-dot', grad: 'from-amber-500 to-orange-600' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-white shadow-sm bg-gradient-to-br ${s.grad} relative overflow-hidden`}>
            <i className={`fa-solid ${s.icon} absolute -right-2 -bottom-2 text-5xl opacity-20`} />
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass text-slate-400 absolute left-3 top-2.5 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, city, district, division, or address..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <option value="ALL">All Divisions</option>
            {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <i className="fa-solid fa-circle-notch fa-spin me-2" /> Loading terminals...
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No terminals found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('code')}>Code {sortIcon('code')}</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('name')}>Name {sortIcon('name')}</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('city')}>City / District {sortIcon('city')}</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('division')}>Division {sortIcon('division')}</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('createdAtUtc')}>Created {sortIcon('createdAtUtc')}</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/admin/terminals/${t.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80">{t.code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-blue-600">
                      <i className="fa-solid fa-location-dot text-slate-400 me-1.5" />
                      {t.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{t.city}<span className="text-slate-400"> / {t.district}</span></td>
                    <td className="py-3.5 px-4"><span className="badge bg-light text-dark border">{t.division}</span></td>
                    <td className="py-3.5 px-4 text-[11px]">
                      {t.latitude != null && t.longitude != null ? (
                        <a
                          href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                          target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline"
                        >
                          <i className="fa-solid fa-map-pin me-1" />
                          {t.latitude.toFixed(3)}, {t.longitude.toFixed(3)}
                        </a>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`badge ${t.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        <i className={`fa-solid ${t.isActive ? 'fa-circle-check' : 'fa-circle-pause'} me-1`} />
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">{new Date(t.createdAtUtc).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/admin/terminals/${t.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded" title="View">
                          <i className="fa-solid fa-eye" />
                        </Link>
                        {canWrite && (
                          <Link to={`/admin/terminals/edit/${t.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded" title="Edit">
                            <i className="fa-solid fa-pen" />
                          </Link>
                        )}
                        {canWrite && (
                          <button type="button" onClick={() => setDeleteCandidate(t)} className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded" title="Delete">
                            <i className="fa-solid fa-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3 text-xs text-slate-500">
            <span>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong>–<strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setPage(1)} className="btn btn-sm btn-outline-secondary">
                <i className="fa-solid fa-angles-left" />
              </button>
              <button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-sm btn-outline-secondary">
                <i className="fa-solid fa-angle-left" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-700">Page {currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-sm btn-outline-secondary">
                <i className="fa-solid fa-angle-right" />
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} className="btn btn-sm btn-outline-secondary">
                <i className="fa-solid fa-angles-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Terminal</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{deleteCandidate.name}</strong> ({deleteCandidate.code})?
              This will fail if it's still referenced by Routes, Trips, or Bookings.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setDeleteCandidate(null)} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalsList;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAllCancellationPolicies,
  deleteCancellationPolicy,
  subscribeToCancellationPolicies,
  getCurrentUserRole,
  getStoredBusOperators,
  getBusOperatorNameById,
  extractErrorMessage,
} from '@/services/cancellationPolicyService';
import type { CancellationPolicyResponseDto } from '@/types/cancellationPolicy.types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const POLL_INTERVAL_MS = 15000;

export const CancellationPoliciesList: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';

  const [policies, setPolicies] = useState<CancellationPolicyResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [deleteCandidate, setDeleteCandidate] = useState<CancellationPolicyResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pollRef = useRef<number | null>(null);
  const operators = getStoredBusOperators();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getAllCancellationPolicies();
      setPolicies(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToCancellationPolicies(() => loadData(true));
    pollRef.current = window.setInterval(() => loadData(true), POLL_INTERVAL_MS);
    const onFocus = () => loadData(true);
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, operatorFilter, pageSize]);

  const filtered = useMemo(() => {
    return policies.filter((p) => {
      if (statusFilter === 'ACTIVE' && !p.isActive) return false;
      if (statusFilter === 'INACTIVE' && p.isActive) return false;
      if (operatorFilter === 'PLATFORM' && p.busOperatorId) return false;
      if (operatorFilter !== 'ALL' && operatorFilter !== 'PLATFORM' && p.busOperatorId !== operatorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());
  }, [policies, searchQuery, statusFilter, operatorFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: policies.length,
    active: policies.filter((p) => p.isActive).length,
    platformWide: policies.filter((p) => !p.busOperatorId).length,
    totalRules: policies.reduce((sum, p) => sum + p.rules.length, 0),
  }), [policies]);

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await deleteCancellationPolicy(deleteCandidate.id);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Cancellation Policies</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-orange-500 text-white flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-ban text-sm" />
            </div>
            Cancellation Policies
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 badge bg-success-subtle text-success border border-success">
              <span className="d-inline-block rounded-circle bg-success" style={{ width: 6, height: 6 }} />
              Live
            </span>
            <span>Synced with api/CancellationPolicies{lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}` : ''}.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => loadData()} className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs" title="Refresh now">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          {canWrite ? (
            <Link to="/admin/cancellation-policies/create" className="px-3.5 py-2 bg-gradient-to-br from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm">
              <i className="fa-solid fa-plus" /> <span>New Policy</span>
            </Link>
          ) : (
            <button disabled className="px-3.5 py-2 bg-slate-200 text-slate-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed">
              <i className="fa-solid fa-plus" /> <span>New Policy</span>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Policies', value: stats.total, icon: 'fa-file-shield', grad: 'from-rose-500 to-orange-600' },
          { label: 'Active', value: stats.active, icon: 'fa-circle-check', grad: 'from-emerald-500 to-teal-600' },
          { label: 'Platform-Wide', value: stats.platformWide, icon: 'fa-globe', grad: 'from-indigo-500 to-blue-600' },
          { label: 'Total Refund Tiers', value: stats.totalRules, icon: 'fa-layer-group', grad: 'from-amber-500 to-orange-600' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-white shadow-sm bg-gradient-to-br ${s.grad} relative overflow-hidden`}>
            <i className={`fa-solid ${s.icon} absolute -right-2 -bottom-2 text-5xl opacity-20`} />
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass text-slate-400 absolute left-3 top-2.5 text-xs" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <option value="ALL">All Operators</option>
            <option value="PLATFORM">Platform-Wide Only</option>
            {operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
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

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <i className="fa-solid fa-circle-notch fa-spin me-2" /> Loading policies...
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No cancellation policies found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Rules</th>
                  <th className="py-3 px-4">Effective Window</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/admin/cancellation-policies/${p.id}`)} className="hover:bg-rose-50/30 transition-colors cursor-pointer group">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-rose-600">
                        <i className="fa-solid fa-file-shield text-slate-400 me-1.5" />{p.name}
                      </div>
                      {p.description && <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.busOperatorId ? (
                        <span className="badge bg-light text-dark border">{getBusOperatorNameById(p.busOperatorId)}</span>
                      ) : (
                        <span className="badge bg-indigo-subtle text-indigo-700 border border-indigo-200"><i className="fa-solid fa-globe me-1" />Platform-Wide</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <i className="fa-solid fa-layer-group text-slate-400 me-1.5" />{p.rules.length}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-600">
                      {p.effectiveFromUtc ? new Date(p.effectiveFromUtc).toLocaleDateString() : '—'}
                      {' → '}
                      {p.effectiveToUtc ? new Date(p.effectiveToUtc).toLocaleDateString() : 'Open-ended'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`badge ${p.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        <i className={`fa-solid ${p.isActive ? 'fa-circle-check' : 'fa-circle-pause'} me-1`} />
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">{new Date(p.createdAtUtc).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/admin/cancellation-policies/${p.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded" title="View">
                          <i className="fa-solid fa-eye" />
                        </Link>
                        {canWrite && (
                          <Link to={`/admin/cancellation-policies/edit/${p.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded" title="Edit">
                            <i className="fa-solid fa-pen" />
                          </Link>
                        )}
                        {canWrite && (
                          <button type="button" onClick={() => setDeleteCandidate(p)} className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded" title="Delete">
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

        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3 text-xs text-slate-500">
            <span>Showing <strong>{(currentPage - 1) * pageSize + 1}</strong>–<strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong></span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setPage(1)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angles-left" /></button>
              <button disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angle-left" /></button>
              <span className="px-3 py-1 font-semibold text-slate-700">Page {currentPage} / {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angle-right" /></button>
              <button disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} className="btn btn-sm btn-outline-secondary"><i className="fa-solid fa-angles-right" /></button>
            </div>
          </div>
        )}
      </div>

      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Cancellation Policy</h3>
            <p className="text-xs text-slate-600">Are you sure you want to delete <strong>{deleteCandidate.name}</strong>?</p>
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

export default CancellationPoliciesList;

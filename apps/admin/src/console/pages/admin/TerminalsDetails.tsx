import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTerminalById, deleteTerminal, getCurrentUserRole, extractErrorMessage } from '@/services/terminalService';
import type { TerminalResponseDto } from '@/types/terminal.types';

export const TerminalsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin';

  const [terminal, setTerminal] = useState<TerminalResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const t = await getTerminalById(id);
      if (!t) { setError('Terminal not found.'); return; }
      setTerminal(t);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!terminal) return;
    try {
      await deleteTerminal(terminal.id);
      window.location.href = '/admin/terminals';
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-blue-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading terminal details...
      </div>
    );
  }

  if (error || !terminal) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="alert alert-danger text-xs">{error || 'Terminal not found.'}</div>
        <Link to="/admin/terminals" className="text-xs text-blue-600">&larr; Back to Terminals</Link>
      </div>
    );
  }

  const mapUrl = terminal.latitude != null && terminal.longitude != null
    ? `https://www.google.com/maps?q=${terminal.latitude},${terminal.longitude}&output=embed`
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/terminals" className="hover:text-blue-600">Terminals</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium font-mono">{terminal.code}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{terminal.code}</span>
            {terminal.name}
            <span className={`badge ${terminal.isActive ? 'bg-success' : 'bg-secondary'}`}>
              <i className={`fa-solid ${terminal.isActive ? 'fa-circle-check' : 'fa-circle-pause'} me-1`} />
              {terminal.isActive ? 'Active' : 'Inactive'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <i className="fa-solid fa-arrows-rotate" /> Refresh
          </button>
          <Link to="/admin/terminals" className="px-3 py-1.5 border rounded-lg text-xs font-medium">All Terminals</Link>
          {canWrite && (
            <Link to={`/admin/terminals/edit/${terminal.id}`} className="px-3 py-1.5 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
              <i className="fa-solid fa-pen" /> <span>Edit</span>
            </Link>
          )}
          {canWrite && (
            <button type="button" onClick={() => setShowDeleteModal(true)} className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1">
              <i className="fa-solid fa-trash" /> <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="text-[10px] font-mono text-blue-300 font-bold uppercase">Location</span>
          <div className="text-sm font-bold">{terminal.city}, {terminal.district}</div>
          <div className="text-xs text-slate-300">{terminal.division} Division · {terminal.country}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">Address</span>
          <div className="text-sm font-bold">{terminal.address}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">Timestamps</span>
          <div className="text-xs text-slate-300">Created {new Date(terminal.createdAtUtc).toLocaleString()}</div>
          {terminal.updatedAtUtc && <div className="text-xs text-slate-300">Updated {new Date(terminal.updatedAtUtc).toLocaleString()}</div>}
        </div>
      </div>

      {/* Map */}
      {mapUrl ? (
        <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
          <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span><i className="fa-solid fa-map-location-dot text-indigo-500 me-1.5" />Map Location</span>
            <a href={`https://www.google.com/maps?q=${terminal.latitude},${terminal.longitude}`} target="_blank" rel="noreferrer" className="text-blue-600 text-[11px] hover:underline">
              Open in Google Maps <i className="fa-solid fa-arrow-up-right-from-square ms-1" />
            </a>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200/80">
            <iframe title="map" src={mapUrl} className="w-full" style={{ height: 300, border: 0 }} loading="lazy" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Lat {terminal.latitude} · Lng {terminal.longitude}</div>
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-5 shadow-xs text-xs text-slate-500">
          <i className="fa-solid fa-map-location-dot text-slate-300 me-1.5" />
          No coordinates set for this terminal.
        </div>
      )}

      {/* Raw DTO */}
      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">API Response DTO (TerminalResponseDto)</div>
        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
          {JSON.stringify(terminal, null, 2)}
        </pre>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Terminal</h3>
            <p className="text-xs text-slate-600">Are you sure you want to delete <strong>{terminal.name}</strong>?</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleDelete} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalsDetails;

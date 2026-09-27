import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCancellationPolicyById, deleteCancellationPolicy, uploadPolicyDocumentImage, getCurrentUserRole, getBusOperatorNameById, formatMoney, extractErrorMessage } from '@/services/cancellationPolicyService';
import type { CancellationPolicyResponseDto } from '@/types/cancellationPolicy.types';

export const CancellationPoliciesDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';

  const [policy, setPolicy] = useState<CancellationPolicyResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getCancellationPolicyById(id);
      setPolicy(p);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !policy) return;
    setUploading(true);
    try {
      await uploadPolicyDocumentImage(policy.id, file);
      await load();
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!policy) return;
    try {
      await deleteCancellationPolicy(policy.id);
      window.location.href = '/admin/cancellation-policies';
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-rose-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading policy details...
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="alert alert-danger text-xs">{error || 'Policy not found.'}</div>
        <Link to="/admin/cancellation-policies" className="text-xs text-blue-600">&larr; Back to Policies</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <input type="file" accept="image/*" ref={fileInputRef} className="d-none" onChange={handleFileSelected} />

      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/cancellation-policies" className="hover:text-blue-600">Cancellation Policies</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">{policy.name}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-ban text-rose-600" />
            {policy.name}
            <span className={`badge ${policy.isActive ? 'bg-success' : 'bg-secondary'}`}>
              <i className={`fa-solid ${policy.isActive ? 'fa-circle-check' : 'fa-circle-pause'} me-1`} />
              {policy.isActive ? 'Active' : 'Inactive'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <i className="fa-solid fa-arrows-rotate" /> Refresh
          </button>
          <Link to="/admin/cancellation-policies" className="px-3 py-1.5 border rounded-lg text-xs font-medium">All Policies</Link>
          {canWrite && (
            <Link to={`/admin/cancellation-policies/edit/${policy.id}`} className="px-3 py-1.5 bg-gradient-to-br from-rose-600 to-orange-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
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

      <div className="bg-gradient-to-br from-slate-900 to-rose-950 rounded-2xl p-6 text-white shadow-md grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="text-[10px] font-mono text-rose-300 font-bold uppercase">Scope</span>
          <div className="text-sm font-bold">{policy.busOperatorId ? getBusOperatorNameById(policy.busOperatorId) : 'Platform-Wide'}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">Effective Window</span>
          <div className="text-sm font-bold">
            {policy.effectiveFromUtc ? new Date(policy.effectiveFromUtc).toLocaleDateString() : '—'}
            {' → '}
            {policy.effectiveToUtc ? new Date(policy.effectiveToUtc).toLocaleDateString() : 'Open-ended'}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">Created</span>
          <div className="text-sm font-bold">{new Date(policy.createdAtUtc).toLocaleString()}</div>
          {policy.updatedAtUtc && <div className="text-xs text-slate-300">Updated {new Date(policy.updatedAtUtc).toLocaleString()}</div>}
        </div>
      </div>

      {policy.description && (
        <div className="bg-white border rounded-xl p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-900 mb-2">Description</div>
          <p className="text-xs text-slate-600">{policy.description}</p>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">Refund Tiers ({policy.rules.length})</div>
        <div className="overflow-x-auto">
          <table className="table table-sm text-xs align-middle mb-0">
            <thead>
              <tr className="text-slate-500">
                <th>Min Hours Before</th><th>Max Hours Before</th><th>Refund %</th><th>Fixed Fee</th>
              </tr>
            </thead>
            <tbody>
              {policy.rules.map((r) => (
                <tr key={r.id}>
                  <td className="fw-semibold">{r.minHoursBeforeDeparture}h</td>
                  <td>{r.maxHoursBeforeDeparture != null ? `${r.maxHoursBeforeDeparture}h` : 'Open tier'}</td>
                  <td><span className="badge bg-success-subtle text-success border border-success">{r.refundPercentage}%</span></td>
                  <td>{formatMoney(r.fixedCancellationFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
          <span><i className="fa-solid fa-file-image text-slate-400 me-1.5" />Policy Document</span>
          {canWrite && (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-sm btn-outline-secondary">
              <i className={`fa-solid ${uploading ? 'fa-circle-notch fa-spin' : 'fa-upload'} me-1`} />
              {policy.policyDocumentImageUrl ? 'Replace' : 'Upload'}
            </button>
          )}
        </div>
        {policy.policyDocumentImageUrl ? (
          <a href={policy.policyDocumentImageUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">
            <i className="fa-solid fa-image me-1" />View Document
          </a>
        ) : (
          <p className="text-xs text-slate-400">No policy document uploaded.</p>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">API Response DTO (CancellationPolicyResponseDto)</div>
        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
          {JSON.stringify(policy, null, 2)}
        </pre>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Policy</h3>
            <p className="text-xs text-slate-600">Are you sure you want to delete <strong>{policy.name}</strong>?</p>
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

export default CancellationPoliciesDetails;

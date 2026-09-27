import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCancellationPolicyById, updateCancellationPolicy, deleteCancellationPolicy, getCurrentUserRole, getStoredBusOperators, extractErrorMessage } from '@/services/cancellationPolicyService';
import type { CancellationPolicyRuleCreateDto } from '@/types/cancellationPolicy.types';

const emptyRule = (): CancellationPolicyRuleCreateDto => ({
  minHoursBeforeDeparture: 0, maxHoursBeforeDeparture: null, refundPercentage: 100, fixedCancellationFee: 0,
});

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export const CancellationPoliciesEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';
  const operators = getStoredBusOperators();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busOperatorId, setBusOperatorId] = useState('');
  const [effectiveFromUtc, setEffectiveFromUtc] = useState('');
  const [effectiveToUtc, setEffectiveToUtc] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rules, setRules] = useState<CancellationPolicyRuleCreateDto[]>([emptyRule()]);
  const [rowVersion, setRowVersion] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setConflictError(false);
    try {
      const p = await getCancellationPolicyById(id);
      setName(p.name);
      setDescription(p.description || '');
      setBusOperatorId(p.busOperatorId || '');
      setEffectiveFromUtc(toDateInput(p.effectiveFromUtc));
      setEffectiveToUtc(toDateInput(p.effectiveToUtc));
      setIsActive(p.isActive);
      setRules(p.rules.length ? p.rules.map((r) => ({
        minHoursBeforeDeparture: r.minHoursBeforeDeparture, maxHoursBeforeDeparture: r.maxHoursBeforeDeparture,
        refundPercentage: r.refundPercentage, fixedCancellationFee: r.fixedCancellationFee,
      })) : [emptyRule()]);
      setRowVersion(p.rowVersion);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const updateRule = (idx: number, patch: Partial<CancellationPolicyRuleCreateDto>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRule = () => setRules((prev) => [...prev, emptyRule()]);
  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!name.trim()) { setError('Policy name is required.'); return; }
    if (rules.length === 0) { setError('At least one refund tier is required.'); return; }

    setSubmitting(true);
    setError(null);
    setConflictError(false);
    try {
      const updated = await updateCancellationPolicy(id, {
        busOperatorId: busOperatorId || null,
        name: name.trim(),
        description: description.trim() || null,
        effectiveFromUtc: effectiveFromUtc ? new Date(effectiveFromUtc).toISOString() : null,
        effectiveToUtc: effectiveToUtc ? new Date(effectiveToUtc).toISOString() : null,
        isActive,
        rules,
        rowVersion,
      });
      navigate(`/admin/cancellation-policies/${updated.id}`);
    } catch (err) {
      const msg = extractErrorMessage(err);
      if (msg.toLowerCase().includes('changed by another') || msg.toLowerCase().includes('conflict')) {
        setConflictError(true);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteCancellationPolicy(id);
      navigate('/admin/cancellation-policies');
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-rose-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading policy for editing...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/cancellation-policies" className="hover:text-blue-600">Cancellation Policies</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Edit</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-ban text-rose-600" /> Edit Policy: {name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/admin/cancellation-policies/${id}`} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
            <i className="fa-solid fa-arrow-up-right-from-square" /> <span>View</span>
          </Link>
          <Link to="/admin/cancellation-policies" className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
            <i className="fa-solid fa-arrow-left" /> <span>Cancel</span>
          </Link>
        </div>
      </div>

      {conflictError && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between gap-3 text-xs mb-0">
          <div className="d-flex align-items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation mt-0.5" />
            <div><strong>409 Conflict:</strong> This Policy was modified by another request. Reload to get the latest data.</div>
          </div>
          <button type="button" onClick={loadData} className="btn btn-sm btn-warning">Reload Latest</button>
        </div>
      )}
      {error && !conflictError && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <fieldset disabled={!canWrite}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Policy Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Scope</label>
                <select value={busOperatorId} onChange={(e) => setBusOperatorId(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <option value="">Platform-Wide (all operators)</option>
                  {operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Effective From</label>
                <input type="date" value={effectiveFromUtc} onChange={(e) => setEffectiveFromUtc(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Effective To</label>
                <input type="date" value={effectiveToUtc} onChange={(e) => setEffectiveToUtc(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
              </div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 text-rose-600 rounded" />
                  <span className="text-xs text-slate-800 font-medium">Active</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                <i className="fa-solid fa-layer-group text-rose-500 me-1.5" />Refund Tiers ({rules.length})
              </span>
              <button type="button" onClick={addRule} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                <i className="fa-solid fa-plus" /> <span>Add Tier</span>
              </button>
            </div>

            {rules.map((r, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Min Hours Before Departure *</label>
                  <input type="number" min={0} max={720} value={r.minHoursBeforeDeparture}
                    onChange={(e) => updateRule(idx, { minHoursBeforeDeparture: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Max Hours (blank = open tier)</label>
                  <input type="number" min={0} max={720} value={r.maxHoursBeforeDeparture ?? ''}
                    onChange={(e) => updateRule(idx, { maxHoursBeforeDeparture: e.target.value ? Number(e.target.value) : null })}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Refund % *</label>
                  <input type="number" min={0} max={100} step="0.01" value={r.refundPercentage}
                    onChange={(e) => updateRule(idx, { refundPercentage: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Fixed Fee (৳)</label>
                  <input type="number" min={0} step="0.01" value={r.fixedCancellationFee}
                    onChange={(e) => updateRule(idx, { fixedCancellationFee: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => removeRule(idx)} disabled={rules.length === 1}
                    className="w-full px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg disabled:opacity-40">
                    <i className="fa-solid fa-trash me-1" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-500 font-mono">
            RowVersion Token: <code className="text-rose-700 font-bold">{rowVersion}</code>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
            <button type="button" onClick={() => setShowDeleteModal(true)} className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <i className="fa-solid fa-trash" /> <span>Delete Policy</span>
            </button>
            <div className="flex items-center gap-2">
              <Link to="/admin/cancellation-policies" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-br from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </fieldset>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Policy</h3>
            <p className="text-xs text-slate-600">Are you sure you want to delete <strong>{name}</strong>?</p>
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

export default CancellationPoliciesEdit;

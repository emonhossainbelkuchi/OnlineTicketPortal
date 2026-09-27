import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createCancellationPolicy, getCurrentUserRole, getStoredBusOperators, extractErrorMessage } from '@/services/cancellationPolicyService';
import type { CancellationPolicyCreateDto, CancellationPolicyRuleCreateDto } from '@/types/cancellationPolicy.types';

const emptyRule = (): CancellationPolicyRuleCreateDto => ({
  minHoursBeforeDeparture: 0, maxHoursBeforeDeparture: null, refundPercentage: 100, fixedCancellationFee: 0,
});

export const CancellationPoliciesCreate: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';
  const operators = getStoredBusOperators();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busOperatorId, setBusOperatorId] = useState('');
  const [effectiveFromUtc, setEffectiveFromUtc] = useState('');
  const [effectiveToUtc, setEffectiveToUtc] = useState('');
  const [rules, setRules] = useState<CancellationPolicyRuleCreateDto[]>([emptyRule()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRule = (idx: number, patch: Partial<CancellationPolicyRuleCreateDto>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRule = () => setRules((prev) => [...prev, emptyRule()]);
  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx));

  const validate = (): string | null => {
    if (!name.trim()) return 'Policy name is required.';
    if (rules.length === 0) return 'At least one refund tier (rule) is required.';
    for (const r of rules) {
      if (r.minHoursBeforeDeparture < 0 || r.minHoursBeforeDeparture > 720) return 'MinHoursBeforeDeparture must be 0–720.';
      if (r.maxHoursBeforeDeparture != null && (r.maxHoursBeforeDeparture < 0 || r.maxHoursBeforeDeparture > 720)) return 'MaxHoursBeforeDeparture must be 0–720.';
      if (r.refundPercentage < 0 || r.refundPercentage > 100) return 'RefundPercentage must be 0–100.';
      if (r.fixedCancellationFee < 0) return 'FixedCancellationFee cannot be negative.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }

    const dto: CancellationPolicyCreateDto = {
      busOperatorId: busOperatorId || null,
      name: name.trim(),
      description: description.trim() || null,
      effectiveFromUtc: effectiveFromUtc ? new Date(effectiveFromUtc).toISOString() : null,
      effectiveToUtc: effectiveToUtc ? new Date(effectiveToUtc).toISOString() : null,
      rules,
    };

    setSubmitting(true);
    setError(null);
    try {
      const created = await createCancellationPolicy(dto);
      navigate(`/admin/cancellation-policies/${created.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/cancellation-policies" className="hover:text-blue-600">Cancellation Policies</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Create</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-orange-500 text-white flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-ban text-sm" />
            </div>
            New Cancellation Policy
          </h1>
        </div>
        <Link to="/admin/cancellation-policies" className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
          <i className="fa-solid fa-arrow-left" /> <span>Back</span>
        </Link>
      </div>

      {!canWrite && (
        <div className="alert alert-warning d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <div>Only Admin, Staff or Operator roles can create policies. Currently simulating <strong>{currentRole}</strong>.</div>
        </div>
      )}
      {error && (
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
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="Standard Refund Policy" />
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
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" placeholder="Explain when/how this policy applies..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Effective From</label>
                <input type="date" value={effectiveFromUtc} onChange={(e) => setEffectiveFromUtc(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Effective To (blank = open-ended)</label>
                <input type="date" value={effectiveToUtc} onChange={(e) => setEffectiveToUtc(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
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
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-3 relative">
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/admin/cancellation-policies" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg">Cancel</Link>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-br from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50">
              <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
              <span>{submitting ? 'Creating...' : 'Create Policy'}</span>
            </button>
          </div>
        </form>
      </fieldset>
    </div>
  );
};

export default CancellationPoliciesCreate;

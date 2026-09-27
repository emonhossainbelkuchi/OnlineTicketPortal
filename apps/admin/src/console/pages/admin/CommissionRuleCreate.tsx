import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import commissionRuleService from '@/services/commissionRuleService';
import {
  CommissionRuleCreateDto,
  CommissionType,
  SaleChannel,
} from '@/types/commissionRule.types';

const emptyForm: CommissionRuleCreateDto = {
  busOperatorId: '',
  operatorContractId: '',
  busRouteId: '',
  saleChannel: SaleChannel.Online,
  commissionType: CommissionType.Percentage,
  commissionValue: 0,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  isActive: true,
};

export default function CommissionRuleCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CommissionRuleCreateDto>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CommissionRuleCreateDto>(key: K, value: CommissionRuleCreateDto[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.commissionType === CommissionType.Percentage && form.commissionValue > 100) {
      setError('Commission value cannot exceed 100 when type is Percentage.');
      return;
    }

    setSaving(true);
    try {
      const dto: CommissionRuleCreateDto = {
        ...form,
        operatorContractId: form.operatorContractId || null,
        busRouteId: form.busRouteId || null,
        effectiveTo: form.effectiveTo || null,
      };
      const created = await commissionRuleService.create(dto);
      navigate(`/admin/resource/CommissionRules/${created.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create commission rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">New Commission Rule</h4>
        <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/CommissionRules">
          <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
          Back to list
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="card card-body shadow-sm">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Bus Operator ID</label>
            <input
              className="form-control"
              required
              value={form.busOperatorId}
              onChange={(e) => set('busOperatorId', e.target.value)}
              placeholder="GUID"
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Operator Contract ID</label>
            <input
              className="form-control"
              value={form.operatorContractId ?? ''}
              onChange={(e) => set('operatorContractId', e.target.value)}
              placeholder="Optional GUID"
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Bus Route ID</label>
            <input
              className="form-control"
              value={form.busRouteId ?? ''}
              onChange={(e) => set('busRouteId', e.target.value)}
              placeholder="Optional GUID"
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Sale Channel</label>
            <select
              className="form-select"
              value={form.saleChannel}
              onChange={(e) => set('saleChannel', Number(e.target.value) as SaleChannel)}
            >
              <option value={SaleChannel.Online}>Online</option>
              <option value={SaleChannel.Offline}>Offline</option>
              <option value={SaleChannel.Both}>Both</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Commission Type</label>
            <select
              className="form-select"
              value={form.commissionType}
              onChange={(e) => set('commissionType', Number(e.target.value) as CommissionType)}
            >
              <option value={CommissionType.Percentage}>Percentage</option>
              <option value={CommissionType.Flat}>Flat</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">
              Commission Value {form.commissionType === CommissionType.Percentage ? '(%)' : '(BDT)'}
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              max={form.commissionType === CommissionType.Percentage ? 100 : undefined}
              className="form-control"
              required
              value={form.commissionValue}
              onChange={(e) => set('commissionValue', Number(e.target.value))}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Effective From</label>
            <input
              type="date"
              className="form-control"
              required
              value={form.effectiveFrom}
              onChange={(e) => set('effectiveFrom', e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Effective To</label>
            <input
              type="date"
              className="form-control"
              value={form.effectiveTo ?? ''}
              onChange={(e) => set('effectiveTo', e.target.value)}
            />
          </div>

          <div className="col-12 form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="isActive">
              Active
            </label>
          </div>
        </div>

        <div className="d-flex justify-content-end mt-4 gap-2">
          <Link className="btn btn-outline-secondary" to="/admin/resource/CommissionRules">
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <FontAwesomeIcon icon={faSave} className="me-1" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

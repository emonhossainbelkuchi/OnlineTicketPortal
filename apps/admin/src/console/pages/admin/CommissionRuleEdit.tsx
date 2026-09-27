import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import commissionRuleService from '@/services/commissionRuleService';
import {
  CommissionRule,
  CommissionRuleUpdateDto,
  CommissionType,
  SaleChannel,
} from '@/types/commissionRule.types';

export default function CommissionRuleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [source, setSource] = useState<CommissionRule | null>(null);
  const [form, setForm] = useState<CommissionRuleUpdateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await commissionRuleService.getById(id);
      setSource(data);
      setForm({
        busOperatorId: data.busOperatorId,
        operatorContractId: data.operatorContractId ?? '',
        busRouteId: data.busRouteId ?? '',
        saleChannel: data.saleChannel,
        commissionType: data.commissionType,
        commissionValue: data.commissionValue,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo ?? '',
        isActive: data.isActive,
        rowVersion: data.rowVersion,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load commission rule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof CommissionRuleUpdateDto>(key: K, value: CommissionRuleUpdateDto[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !form) return;
    setError(null);

    if (form.commissionType === CommissionType.Percentage && form.commissionValue > 100) {
      setError('Commission value cannot exceed 100 when type is Percentage.');
      return;
    }

    setSaving(true);
    try {
      const dto: CommissionRuleUpdateDto = {
        ...form,
        operatorContractId: form.operatorContractId || null,
        busRouteId: form.busRouteId || null,
        effectiveTo: form.effectiveTo || null,
      };
      await commissionRuleService.update(id, dto);
      navigate(`/admin/resource/CommissionRules/${id}`);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setError(
          e?.response?.data?.message ??
            'This rule was changed by another request. Reloading the latest version — please re-apply your changes.'
        );
        load();
      } else {
        setError(e?.response?.data?.message ?? 'Failed to update commission rule.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <FontAwesomeIcon icon={faSyncAlt} spin size="2x" />
      </div>
    );
  }

  if (!source || !form) {
    return (
      <div className="container-fluid py-3">
        <div className="alert alert-danger">{error ?? 'Commission rule not found.'}</div>
        <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/CommissionRules">
          <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Edit Commission Rule</h4>
        <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/CommissionRules">
          <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
          Back to list
        </Link>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      <form onSubmit={handleSubmit} className="card card-body shadow-sm">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Bus Operator ID</label>
            <input
              className="form-control"
              required
              value={form.busOperatorId}
              onChange={(e) => set('busOperatorId', e.target.value)}
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
              id="isActiveEdit"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="isActiveEdit">
              Active
            </label>
          </div>
        </div>

        <div className="d-flex justify-content-end mt-4 gap-2">
          <Link className="btn btn-outline-secondary" to={`/admin/resource/CommissionRules/${id}`}>
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <FontAwesomeIcon icon={faSave} className="me-1" />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

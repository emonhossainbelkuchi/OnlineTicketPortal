// "Create" here means GENERATE — the backend has no generic POST for OperatorSettlement
// (see class comment on OperatorSettlementsController). This calls POST /generate, which
// runs SettlementGenerationService for one operator + date range and computes everything
// server-side from real PlatformLedger rows.
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faArrowLeft, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import operatorSettlementService from '@/services/operatorSettlementService';
import { getStoredBusOperators, BusOperator } from '@/services/busOperatorService';
import { SettlementGenerateDto } from '@/types/operatorSettlement.types';

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

const emptyForm: SettlementGenerateDto = {
  busOperatorId: '',
  fromDate: firstOfMonth,
  toDate: today,
  remarks: '',
};

export default function OperatorSettlementCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SettlementGenerateDto>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingLookups(true);
      try {
        const ops = await Promise.resolve(getStoredBusOperators());
        setOperators(Array.isArray(ops) ? ops : []);
      } catch {
        setOperators([]);
      } finally {
        setLoadingLookups(false);
      }
    })();
  }, []);

  const operatorOptions = useMemo(
    () => operators.map((op: any) => ({ id: op.id, label: op.name ?? op.companyName ?? op.id })),
    [operators]
  );

  const set = <K extends keyof SettlementGenerateDto>(key: K, value: SettlementGenerateDto[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.busOperatorId) {
      setError('Please select a Bus Operator.');
      return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      setError('"To" date cannot be before "From" date.');
      return;
    }

    setSaving(true);
    try {
      const dto: SettlementGenerateDto = { ...form, remarks: form.remarks || null };
      const created = await operatorSettlementService.generate(dto);
      navigate(`/admin/resource/OperatorSettlement/${created.id}`);
    } catch (e: any) {
      // The service throws InvalidOperationException (400) for things like "nothing to
      // settle in this range" or "an open settlement already covers part of this period".
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate settlement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 680 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Generate Settlement</h4>
        <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/OperatorSettlement">
          <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
          Back to list
        </Link>
      </div>

      <div className="alert alert-info small">
        This runs the settlement batch for the chosen operator and date range. Gross amounts,
        charges, and the net total are computed from real ledger entries — nothing here is typed
        in by hand.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="card card-body shadow-sm">
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Bus Operator</label>
            <select
              className="form-select"
              required
              value={form.busOperatorId}
              onChange={(e) => set('busOperatorId', e.target.value)}
              disabled={loadingLookups}
            >
              <option value="">
                {loadingLookups ? 'Loading operators...' : 'Select operator...'}
              </option>
              {operatorOptions.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-control"
              required
              value={form.fromDate}
              onChange={(e) => set('fromDate', e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-control"
              required
              value={form.toDate}
              onChange={(e) => set('toDate', e.target.value)}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Remarks (optional)</label>
            <textarea
              className="form-control"
              rows={3}
              maxLength={500}
              value={form.remarks ?? ''}
              onChange={(e) => set('remarks', e.target.value)}
              placeholder="Any note to attach to this settlement run..."
            />
          </div>
        </div>

        <div className="d-flex justify-content-end mt-4 gap-2">
          <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorSettlement">
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? (
              <FontAwesomeIcon icon={faSyncAlt} spin className="me-1" />
            ) : (
              <FontAwesomeIcon icon={faBolt} className="me-1" />
            )}
            {saving ? 'Generating...' : 'Generate Settlement'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPen, faSyncAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import commissionRuleService from '@/services/commissionRuleService';
import { CommissionRule, CommissionTypeLabel, SaleChannelLabel } from '@/types/commissionRule.types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="col-md-6 mb-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-medium">{value}</div>
    </div>
  );
}

export default function CommissionRuleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<CommissionRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await commissionRuleService.getById(id));
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

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this commission rule?')) return;
    setDeleting(true);
    try {
      await commissionRuleService.remove(id);
      navigate('/admin/resource/CommissionRules');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <FontAwesomeIcon icon={faSyncAlt} spin size="2x" />
      </div>
    );
  }

  if (!item) {
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
    <div className="container-fluid py-3" style={{ maxWidth: 800 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Commission Rule Details</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={load}>
            <FontAwesomeIcon icon={faSyncAlt} className="me-1" />
            Refresh
          </button>
          <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/CommissionRules">
            <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
            Back
          </Link>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row">
            <Field label="Bus Operator ID" value={item.busOperatorId} />
            <Field label="Operator Contract ID" value={item.operatorContractId ?? '—'} />
            <Field label="Bus Route ID" value={item.busRouteId ?? '—'} />
            <Field label="Sale Channel" value={SaleChannelLabel[item.saleChannel]} />
            <Field label="Commission Type" value={CommissionTypeLabel[item.commissionType]} />
            <Field
              label="Commission Value"
              value={`${item.commissionValue}${item.commissionType === 0 ? '%' : ' BDT'}`}
            />
            <Field label="Effective From" value={item.effectiveFrom} />
            <Field label="Effective To" value={item.effectiveTo ?? '—'} />
            <Field
              label="Status"
              value={
                <span className={`badge ${item.isActive ? 'bg-success' : 'bg-secondary'}`}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
              }
            />
            <Field label="Created (UTC)" value={item.createdAtUtc} />
            <Field label="Updated (UTC)" value={item.updatedAtUtc ?? '—'} />
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end gap-2">
          <button className="btn btn-outline-danger" onClick={handleDelete} disabled={deleting}>
            <FontAwesomeIcon icon={faTrash} className="me-1" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <Link className="btn btn-primary" to={`/admin/resource/CommissionRules/${item.id}/edit`}>
            <FontAwesomeIcon icon={faPen} className="me-1" />
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

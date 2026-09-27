// "Edit" here means APPROVE — the backend has no PUT for OperatorSettlement (totals and
// status are system-computed, never client-editable; see class comment on
// OperatorSettlementsController). This screen is read-only for every figure and only lets a
// platform Admin/Staff move a Draft settlement to Approved via POST /{id}/approve.
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faArrowLeft, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import operatorSettlementService from '@/services/operatorSettlementService';
import {
  OperatorSettlementDetail,
  SettlementStatus,
  SettlementStatusLabel,
  SettlementStatusBadgeClass,
  SettlementDirectionLabel,
} from '@/types/operatorSettlement.types';

export default function OperatorSettlementEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<OperatorSettlementDetail | null>(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await operatorSettlementService.getById(id);
      setItem(data);
      setRemarks(data.remarks ?? '');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load settlement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApprove = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setApproving(true);
    try {
      await operatorSettlementService.approve(id, { remarks: remarks || null });
      navigate(`/admin/resource/OperatorSettlement/${id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to approve settlement.');
    } finally {
      setApproving(false);
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
        <div className="alert alert-danger">{error ?? 'Settlement not found.'}</div>
        <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/OperatorSettlement">
          <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
          Back to list
        </Link>
      </div>
    );
  }

  const canApprove = item.status === SettlementStatus.Draft;

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Approve Settlement — {item.settlementNo}</h4>
        <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/OperatorSettlement">
          <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
          Back to list
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-2">
              <div className="text-muted small">Bus Operator ID</div>
              <div className="fw-medium">{item.busOperatorId}</div>
            </div>
            <div className="col-md-6 mb-2">
              <div className="text-muted small">Period</div>
              <div className="fw-medium">
                {item.fromDate} → {item.toDate}
              </div>
            </div>
            <div className="col-md-6 mb-2">
              <div className="text-muted small">Direction</div>
              <div className="fw-medium">{SettlementDirectionLabel[item.direction]}</div>
            </div>
            <div className="col-md-6 mb-2">
              <div className="text-muted small">Status</div>
              <span className={`badge ${SettlementStatusBadgeClass[item.status]}`}>
                {SettlementStatusLabel[item.status]}
              </span>
            </div>
            <div className="col-md-6 mb-2">
              <div className="text-muted small">Net Amount</div>
              <div className="fw-bold fs-5">{item.netAmount.toLocaleString()} BDT</div>
            </div>
            <div className="col-md-6 mb-2">
              <div className="text-muted small">Gross (Online / Offline)</div>
              <div className="fw-medium">
                {item.onlineGrossAmount.toLocaleString()} / {item.offlineGrossAmount.toLocaleString()} BDT
              </div>
            </div>
          </div>
        </div>
      </div>

      {!canApprove && (
        <div className="alert alert-secondary">
          This settlement is already <strong>{SettlementStatusLabel[item.status]}</strong> — only a
          Draft settlement can be approved.
        </div>
      )}

      {canApprove && (
        <form onSubmit={handleApprove} className="card card-body shadow-sm">
          <label className="form-label">Approval Remarks (optional)</label>
          <textarea
            className="form-control"
            rows={3}
            maxLength={500}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Any note for this approval..."
          />
          <div className="d-flex justify-content-end mt-3 gap-2">
            <Link className="btn btn-outline-secondary" to={`/admin/resource/OperatorSettlement/${id}`}>
              Cancel
            </Link>
            <button className="btn btn-success" type="submit" disabled={approving}>
              {approving ? (
                <FontAwesomeIcon icon={faSyncAlt} spin className="me-1" />
              ) : (
                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
              )}
              {approving ? 'Approving...' : 'Approve Settlement'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

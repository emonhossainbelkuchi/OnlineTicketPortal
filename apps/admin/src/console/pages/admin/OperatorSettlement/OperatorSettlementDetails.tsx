import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheckCircle, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import operatorSettlementService from '@/services/operatorSettlementService';
import {
  OperatorSettlementDetail,
  SettlementStatus,
  SettlementStatusLabel,
  SettlementStatusBadgeClass,
  SettlementDirectionLabel,
  StatementItemTypeLabel,
  SaleChannelLabel,
} from '@/types/operatorSettlement.types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="col-md-4 mb-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-medium">{value}</div>
    </div>
  );
}

export default function OperatorSettlementDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<OperatorSettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await operatorSettlementService.getById(id));
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

  return (
    <div className="container-fluid py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Settlement {item.settlementNo}</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={load}>
            <FontAwesomeIcon icon={faSyncAlt} className="me-1" />
            Refresh
          </button>
          <Link className="btn btn-outline-secondary btn-sm" to="/admin/resource/OperatorSettlement">
            <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
            Back
          </Link>
          {item.status === SettlementStatus.Draft && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => navigate(`/admin/resource/OperatorSettlement/${item.id}/edit`)}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
              Approve
            </button>
          )}
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row">
            <Field label="Bus Operator ID" value={item.busOperatorId} />
            <Field label="Period" value={`${item.fromDate} → ${item.toDate}`} />
            <Field
              label="Status"
              value={
                <span className={`badge ${SettlementStatusBadgeClass[item.status]}`}>
                  {SettlementStatusLabel[item.status]}
                </span>
              }
            />
            <Field label="Direction" value={SettlementDirectionLabel[item.direction]} />
            <Field label="Online Gross" value={`${item.onlineGrossAmount.toLocaleString()} BDT`} />
            <Field label="Offline Gross" value={`${item.offlineGrossAmount.toLocaleString()} BDT`} />
            <Field label="Platform Charge" value={`${item.platformCharge.toLocaleString()} BDT`} />
            <Field label="Gateway Charge" value={`${item.gatewayCharge.toLocaleString()} BDT`} />
            <Field label="Refund Amount" value={`${item.refundAmount.toLocaleString()} BDT`} />
            <Field label="Net Amount" value={<strong className="fs-5">{item.netAmount.toLocaleString()} BDT</strong>} />
            <Field label="Paid At (UTC)" value={item.paidAtUtc ?? '—'} />
            <Field label="Remarks" value={item.remarks ?? '—'} />
            <Field label="Created (UTC)" value={item.createdAtUtc} />
            <Field label="Updated (UTC)" value={item.updatedAtUtc ?? '—'} />
          </div>
        </div>
      </div>

      <h5 className="mb-2">Line Items ({item.items.length})</h5>
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Type</th>
              <th>Channel</th>
              <th className="text-end">Ticket Fare</th>
              <th className="text-end">Platform Charge</th>
              <th className="text-end">Gateway Charge</th>
              <th className="text-end">Refund</th>
              <th className="text-end">Net</th>
            </tr>
          </thead>
          <tbody>
            {item.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-3">
                  No line items.
                </td>
              </tr>
            ) : (
              item.items.map((li) => (
                <tr key={li.id}>
                  <td>{StatementItemTypeLabel[li.itemType]}</td>
                  <td>{SaleChannelLabel[li.saleChannel]}</td>
                  <td className="text-end">{li.ticketFare.toLocaleString()}</td>
                  <td className="text-end">{li.platformCharge.toLocaleString()}</td>
                  <td className="text-end">{li.gatewayCharge.toLocaleString()}</td>
                  <td className="text-end">{li.refundAmount.toLocaleString()}</td>
                  <td className="text-end fw-medium">{li.netAmount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

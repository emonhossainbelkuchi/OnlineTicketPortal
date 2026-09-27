import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getOperatorSettlementItemById,
  OperatorSettlementItemResponseDto,
  OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT,
} from '@/services/operatorSettlementItemService';

export const OperatorSettlementItemDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<OperatorSettlementItemResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const data = await getOperatorSettlementItemById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setError(err?.message || 'Could not load settlement item from the API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener(OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT, handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
        Loading settlement item from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-lock me-1" /> This settlement item belongs to another operator — you don't have
        permission to view it. <Link to="/admin/operator-settlement-items">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Settlement item not found.{' '}
        <Link to="/admin/operator-settlement-items">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 820 }}>
      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-exclamation me-1" /> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/operator-settlement-items" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-receipt text-dark me-2" />
            Settlement Item Details
          </h1>
        </div>
        <span className="badge text-bg-secondary-subtle text-secondary-emphasis border">
          <i className="fa-solid fa-lock me-1" /> Read-only ledger row
        </span>
      </div>

      <div className="alert alert-info py-2 small mb-3">
        <i className="fa-solid fa-circle-info me-1" />
        This row is generated automatically by SettlementGenerationService. It cannot be created or edited by hand.
      </div>

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Parent Settlement</span>
            <Link
              to={`/admin/operator-settlement-items?operatorSettlementId=${item.operatorSettlementId}`}
              className="font-monospace small"
            >
              <i className="fa-solid fa-link me-1" /> {item.operatorSettlementId}
            </Link>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Item Type</span>
            <span className="badge text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">{item.itemType}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Sale Channel</span>
            <span className="badge text-bg-light border">{item.saleChannel}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Ticket Fare</span>
            <span className="fw-semibold">{item.ticketFare.toFixed(2)}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Platform Charge</span>
            <span className="text-danger">{item.platformCharge ? `-${item.platformCharge.toFixed(2)}` : '0.00'}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Gateway Charge</span>
            <span className="text-danger">{item.gatewayCharge ? `-${item.gatewayCharge.toFixed(2)}` : '0.00'}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Refund Amount</span>
            <span className="text-danger">{item.refundAmount ? `-${item.refundAmount.toFixed(2)}` : '0.00'}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Net Amount</span>
            <span className="fw-bold fs-6">{item.netAmount.toFixed(2)}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Booking</span>
            {item.bookingId ? (
              <span className="font-monospace small">{item.bookingId}</span>
            ) : (
              <span className="text-muted fst-italic">—</span>
            )}
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Ticket</span>
            {item.ticketId ? (
              <span className="font-monospace small">{item.ticketId}</span>
            ) : (
              <span className="text-muted fst-italic">—</span>
            )}
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Platform Ledger</span>
            {item.platformLedgerId ? (
              <span className="font-monospace small">{item.platformLedgerId}</span>
            ) : (
              <span className="text-muted fst-italic">—</span>
            )}
          </div>

          <div className="col-12">
            <hr />
          </div>

          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Created: {new Date(item.createdAtUtc).toLocaleString()}
          </div>
          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Last Updated:{' '}
            {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : '—'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorSettlementItemDetails;

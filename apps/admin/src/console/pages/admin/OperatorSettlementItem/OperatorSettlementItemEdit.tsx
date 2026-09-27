import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOperatorSettlementItemById, OperatorSettlementItemResponseDto } from '@/services/operatorSettlementItemService';

export const OperatorSettlementItemEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OperatorSettlementItemResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getOperatorSettlementItemById(id)
      .then((data) => setItem(data || null))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="pb-4" style={{ maxWidth: 700 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to={id ? `/admin/operator-settlement-items/${id}` : '/admin/operator-settlement-items'} className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-pen text-dark me-2" />
          Edit Settlement Item
        </h1>
      </div>

      <div className="bg-white p-4 rounded-3 border shadow-sm text-center">
        <i className="fa-solid fa-lock fa-2x text-secondary mb-3 d-block" />
        <h2 className="h6 fw-bold">Editing a settlement item isn't possible</h2>
        <p className="text-muted small mb-3" style={{ maxWidth: 520, margin: '0 auto' }}>
          <code>OperatorSettlementItemsController</code> exposes no PUT endpoint — this is an
          append-only ledger row written once by <code>SettlementGenerationService</code>. Letting
          it be hand-edited here would desync it from the real payment/refund events it records,
          so the API intentionally doesn't allow it.
        </p>
        {!loading && item && (
          <p className="text-muted small mb-4">
            Net amount on record: <strong>{item.netAmount.toFixed(2)}</strong> ({item.itemType})
          </p>
        )}
        <Link to={id ? `/admin/operator-settlement-items/${id}` : '/admin/operator-settlement-items'} className="btn btn-primary btn-sm">
          <i className="fa-solid fa-eye me-1" /> View Item Details Instead
        </Link>
      </div>
    </div>
  );
};

export default OperatorSettlementItemEdit;

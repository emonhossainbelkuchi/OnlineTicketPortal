import React from 'react';
import { Link } from 'react-router-dom';

export const OperatorSettlementItemCreate: React.FC = () => {
  return (
    <div className="pb-4" style={{ maxWidth: 700 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/operator-settlement-items" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-receipt text-dark me-2" />
          New Settlement Item
        </h1>
      </div>

      <div className="bg-white p-4 rounded-3 border shadow-sm text-center">
        <i className="fa-solid fa-lock fa-2x text-secondary mb-3 d-block" />
        <h2 className="h6 fw-bold">Creating a settlement item isn't possible</h2>
        <p className="text-muted small mb-3" style={{ maxWidth: 520, margin: '0 auto' }}>
          <code>OperatorSettlementItemsController</code> on the real API only exposes{' '}
          <strong>GET</strong> endpoints on purpose — every row is written by{' '}
          <code>SettlementGenerationService</code> as part of generating its parent
          <code> OperatorSettlement</code>, tied to a real ledger event. There is no POST endpoint
          to submit a form to, so hand-creating one here would either silently do nothing or lie
          about what happened.
        </p>
        <p className="text-muted small mb-4">
          To get a new item to appear, run settlement generation for the operator/date range it
          belongs to — its items will show up in the list automatically once generated.
        </p>
        <Link to="/admin/operator-settlement-items" className="btn btn-primary btn-sm">
          <i className="fa-solid fa-list me-1" /> Go to Settlement Items List
        </Link>
      </div>
    </div>
  );
};

export default OperatorSettlementItemCreate;

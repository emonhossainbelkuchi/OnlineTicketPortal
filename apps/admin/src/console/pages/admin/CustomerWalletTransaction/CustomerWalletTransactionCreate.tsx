import React from 'react';
import { Link } from 'react-router-dom';

export const CustomerWalletTransactionCreate: React.FC = () => {
  return (
    <div className="pb-4" style={{ maxWidth: 700 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/customer-wallet-transactions" className="btn btn-sm btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-wallet text-success me-2" />
          New Wallet Transaction
        </h1>
      </div>

      <div className="bg-white p-4 rounded-3 border shadow-sm text-center">
        <i className="fa-solid fa-lock fa-2x text-secondary mb-3 d-block" />
        <h2 className="h6 fw-bold">Creating a wallet transaction isn't possible</h2>
        <p className="text-muted small mb-3" style={{ maxWidth: 520, margin: '0 auto' }}>
          <code>CustomerWalletTransactionsController</code> on the real API only exposes{' '}
          <strong>GET</strong> endpoints on purpose — every row is written by{' '}
          <code>CustomerWalletService.CreditAsync</code> / <code>DebitAsync</code>, always
          together with the actual balance change it explains. There's no POST endpoint to submit
          a form to, so hand-creating one here would desync the ledger from the real balance.
        </p>
        <p className="text-muted small mb-4">
          To get a new transaction to appear, trigger a real wallet credit/debit (top-up, booking
          payment, refund, admin adjustment) — it'll show up in the list automatically.
        </p>
        <Link to="/admin/customer-wallet-transactions" className="btn btn-primary btn-sm">
          <i className="fa-solid fa-list me-1" /> Go to Wallet Transactions List
        </Link>
      </div>
    </div>
  );
};

export default CustomerWalletTransactionCreate;

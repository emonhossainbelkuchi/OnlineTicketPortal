import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getCustomerWalletTransactionById,
  CustomerWalletTransactionResponseDto,
} from '@/services/customerWalletTransactionService';

export const CustomerWalletTransactionEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<CustomerWalletTransactionResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getCustomerWalletTransactionById(id)
      .then((data) => setItem(data || null))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="pb-4" style={{ maxWidth: 700 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link
          to={id ? `/admin/customer-wallet-transactions/${id}` : '/admin/customer-wallet-transactions'}
          className="btn btn-sm btn-outline-secondary"
        >
          <i className="fa-solid fa-arrow-left me-1" /> Back
        </Link>
        <h1 className="h5 fw-bold mb-0">
          <i className="fa-solid fa-pen text-success me-2" />
          Edit Wallet Transaction
        </h1>
      </div>

      <div className="bg-white p-4 rounded-3 border shadow-sm text-center">
        <i className="fa-solid fa-lock fa-2x text-secondary mb-3 d-block" />
        <h2 className="h6 fw-bold">Editing a wallet transaction isn't possible</h2>
        <p className="text-muted small mb-3" style={{ maxWidth: 520, margin: '0 auto' }}>
          <code>CustomerWalletTransactionsController</code> exposes no PUT endpoint — this is an
          append-only ledger row written once by <code>CustomerWalletService</code>. Letting it be
          hand-edited would desync it from the customer's real wallet balance, so the API
          intentionally doesn't allow it.
        </p>
        {!loading && item && (
          <p className="text-muted small mb-4">
            On record: <strong>{item.amount.toFixed(2)} {item.currency}</strong> ({item.transactionType}), balance
            after <strong>{item.balanceAfter.toFixed(2)}</strong>
          </p>
        )}
        <Link
          to={id ? `/admin/customer-wallet-transactions/${id}` : '/admin/customer-wallet-transactions'}
          className="btn btn-primary btn-sm"
        >
          <i className="fa-solid fa-eye me-1" /> View Transaction Details Instead
        </Link>
      </div>
    </div>
  );
};

export default CustomerWalletTransactionEdit;

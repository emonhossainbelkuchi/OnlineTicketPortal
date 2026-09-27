import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getCustomerWalletTransactionById,
  CustomerWalletTransactionResponseDto,
  CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT,
} from '@/services/customerWalletTransactionService';

const isCredit = (t: string) => t === 'TopUp' || t === 'RefundCredit';

export const CustomerWalletTransactionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<CustomerWalletTransactionResponseDto | null>(null);
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
      const data = await getCustomerWalletTransactionById(id);
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
        setError(err?.message || 'Could not load wallet transaction from the API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener(CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT, handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
        Loading wallet transaction from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-lock me-1" /> This transaction belongs to another customer's wallet — you don't
        have permission to view it. <Link to="/admin/customer-wallet-transactions">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Wallet transaction not found.{' '}
        <Link to="/admin/customer-wallet-transactions">Back to list</Link>
      </div>
    );
  }

  const credit = isCredit(item.transactionType);

  return (
    <div className="pb-4" style={{ maxWidth: 820 }}>
      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-exclamation me-1" /> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/customer-wallet-transactions" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-wallet text-success me-2" />
            Wallet Transaction Details
          </h1>
        </div>
        <span className="badge text-bg-secondary-subtle text-secondary-emphasis border">
          <i className="fa-solid fa-lock me-1" /> Read-only ledger row
        </span>
      </div>

      <div className="alert alert-info py-2 small mb-3">
        <i className="fa-solid fa-circle-info me-1" />
        This row is written automatically by CustomerWalletService whenever the wallet balance
        actually changes. It cannot be created or edited by hand.
      </div>

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Customer Profile</span>
            <span className="font-monospace small">{item.customerProfileId}</span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Type</span>
            <span className="badge text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
              {item.transactionType}
            </span>
          </div>

          <div className="col-md-3">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Currency</span>
            <span>{item.currency}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Amount</span>
            <span className={`fw-bold fs-6 ${credit ? 'text-success' : 'text-danger'}`}>
              {credit ? '+' : '-'}
              {item.amount.toFixed(2)} {item.currency}
            </span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Balance After</span>
            <span className="fw-bold fs-6">
              {item.balanceAfter.toFixed(2)} {item.currency}
            </span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Description</span>
            <span>{item.description || <span className="text-muted fst-italic">—</span>}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Related Booking</span>
            {item.bookingId ? (
              <span className="font-monospace small">{item.bookingId}</span>
            ) : (
              <span className="text-muted fst-italic">—</span>
            )}
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Related Refund</span>
            {item.refundId ? (
              <span className="font-monospace small">{item.refundId}</span>
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

export default CustomerWalletTransactionDetails;

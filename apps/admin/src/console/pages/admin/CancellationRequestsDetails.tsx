// CancellationRequestsDetails.tsx
// Live-updating detail view (Bootstrap + FontAwesome), built on the shared
// useCancellationRequest hook. Approve/Reject/Complete use plain window
// prompts — no extra modal component needed.
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCancellationRequest } from '@/hooks/useCancellationRequest';
import { getCurrentUserRole } from '@/services/cancellationRequestService';
import { cancellationStatusBadgeClass } from '@/lib/cancellationStatusBadge';

export default function CancellationRequestsDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = getCurrentUserRole();
  const canManage = role === 'Admin' || role === 'Staff' || role === 'Operator';

  const { item, loading, error, busy, approve, reject, complete } = useCancellationRequest(id);

  function handleApprove() {
    if (!item) return;
    const input = window.prompt(
      `Approve refund amount. This must exactly match the policy-calculated amount ` +
        `(${item.requestedRefundAmount}) — leave blank to accept it as-is:`,
      ''
    );
    if (input === null) return;
    const amount = input.trim() === '' ? null : Number(input);
    if (amount !== null && Number.isNaN(amount)) {
      toast.error('Enter a valid number, or leave it blank.');
      return;
    }
    // Same rule the API enforces (CancellationProcessingService.ApproveAsync) — checked here
    // too so a mismatched amount never round-trips to the server just to bounce back.
    if (amount !== null && amount !== item.requestedRefundAmount) {
      toast.error(
        `Approved amount must equal the policy amount (${item.requestedRefundAmount}) — leave the field blank to accept it.`
      );
      return;
    }
    approve(amount);
  }

  function handleReject() {
    const reason = window.prompt('Reason for rejection (required):', '');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }
    reject(reason.trim());
  }

  function handleComplete() {
    if (!window.confirm('Mark this cancellation as complete? This only succeeds once the linked refund has actually succeeded.')) return;
    complete();
  }

  if (loading) {
    return (
      <div className="container-fluid py-4 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" />
        Loading...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">{error || 'Cancellation request not found.'}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/cancellation-requests')}>
          <i className="fa-solid fa-arrow-left me-1" />
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-rotate-left me-2" />
          Cancellation Request Details
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
        <div>
          {canManage && item.status === 'Requested' && (
            <>
              <button className="btn btn-outline-success me-2" disabled={busy} onClick={handleApprove}>
                <i className="fa-solid fa-check me-1" />
                Approve
              </button>
              <button className="btn btn-outline-danger me-2" disabled={busy} onClick={handleReject}>
                <i className="fa-solid fa-xmark me-1" />
                Reject
              </button>
            </>
          )}
          {canManage && item.status === 'Approved' && (
            <button className="btn btn-outline-success me-2" disabled={busy} onClick={handleComplete}>
              {busy ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-flag-checkered me-1" />}
              Complete
            </button>
          )}
          <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/cancellation-requests')}>
            <i className="fa-solid fa-arrow-left me-1" />
            Back to List
          </button>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-4">
              <i className="fa-solid fa-ticket me-1 text-muted" />
              Booking
            </dt>
            <dd className="col-sm-8">{item.bookingLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-user me-1 text-muted" />
              Requested By
            </dt>
            <dd className="col-sm-8">{item.requestedByLabel}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-flag me-1 text-muted" />
              Status
            </dt>
            <dd className="col-sm-8">
              <span className={`badge ${cancellationStatusBadgeClass(item.status)}`}>{item.status}</span>
            </dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-comment me-1 text-muted" />
              Reason
            </dt>
            <dd className="col-sm-8">{item.reason}</dd>

            {item.rejectedReason && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-comment-slash me-1 text-muted" />
                  Rejected Reason
                </dt>
                <dd className="col-sm-8">{item.rejectedReason}</dd>
              </>
            )}

            <dt className="col-sm-4">
              <i className="fa-solid fa-receipt me-1 text-muted" />
              Amount Paid
            </dt>
            <dd className="col-sm-8">{item.bookingGrandTotalAtRequest.toLocaleString()}</dd>

            <dt className="col-sm-4">
              <i className="fa-solid fa-scale-balanced me-1 text-muted" />
              Refundable Fare Base
            </dt>
            <dd className="col-sm-8">
              {item.baseAmount.toLocaleString()}
              {item.bookingGrandTotalAtRequest > item.baseAmount && (
                <span className="text-muted small ms-2">
                  ({(item.bookingGrandTotalAtRequest - item.baseAmount).toLocaleString()} of the amount paid is
                  tax/service charge and is never refundable)
                </span>
              )}
            </dd>

            {item.appliedRefundPercentage != null && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-percent me-1 text-muted" />
                  Policy Applied
                </dt>
                <dd className="col-sm-8">
                  {item.appliedRefundPercentage}% refund
                  {item.appliedFixedCancellationFee ? ` − ${item.appliedFixedCancellationFee} fixed fee` : ''}
                </dd>
              </>
            )}

            <dt className="col-sm-4">
              <i className="fa-solid fa-money-bill me-1 text-muted" />
              Requested Refund
            </dt>
            <dd className="col-sm-8">{item.requestedRefundAmount.toLocaleString()}</dd>

            {item.approvedRefundAmount != null && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-sack-dollar me-1 text-muted" />
                  Approved Refund
                </dt>
                <dd className="col-sm-8">{item.approvedRefundAmount.toLocaleString()}</dd>
              </>
            )}

            {item.approvedByLabel !== '-' && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-user-check me-1 text-muted" />
                  Approved By
                </dt>
                <dd className="col-sm-8">{item.approvedByLabel}</dd>
              </>
            )}

            {item.refundId && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-money-bill-transfer me-1 text-muted" />
                  Linked Refund
                </dt>
                <dd className="col-sm-8">
                  <Link to={`/admin/resource/Refunds/${item.refundId}`}>
                    View refund ({item.refundStatus})
                  </Link>
                  {item.refundStatus !== 'Succeeded' && (
                    <div className="text-muted small mt-1">
                      <i className="fa-solid fa-circle-info me-1" />
                      Approving this cancellation only creates the refund — no money moves and
                      the Financial numbers on the Dashboard won't change until the refund itself
                      is Approved and Processed on that page.
                    </div>
                  )}
                </dd>
              </>
            )}

            <dt className="col-sm-4">
              <i className="fa-solid fa-calendar-plus me-1 text-muted" />
              Requested At (UTC)
            </dt>
            <dd className="col-sm-8">{new Date(item.requestedAtUtc).toLocaleString()}</dd>

            {item.approvedAtUtc && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-calendar-check me-1 text-muted" />
                  Approved At (UTC)
                </dt>
                <dd className="col-sm-8">{new Date(item.approvedAtUtc).toLocaleString()}</dd>
              </>
            )}

            {item.completedAtUtc && (
              <>
                <dt className="col-sm-4">
                  <i className="fa-solid fa-flag-checkered me-1 text-muted" />
                  Completed At (UTC)
                </dt>
                <dd className="col-sm-8">{new Date(item.completedAtUtc).toLocaleString()}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
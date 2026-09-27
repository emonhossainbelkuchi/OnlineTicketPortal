// CancellationRequestsList.tsx
// Dynamic, live-updating table (Bootstrap + FontAwesome). Data + polling +
// search/filter/pagination live in useCancellationRequests; Approve/Reject/
// Complete use plain window prompts (no extra modal component needed).
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useCancellationRequests } from '@/hooks/useCancellationRequests';
import {
  approveCancellationRequest,
  rejectCancellationRequest,
  completeCancellationRequest,
  getCurrentUserRole,
  extractErrorMessage,
} from '@/services/cancellationRequestService';
import { cancellationStatusBadgeClass } from '@/lib/cancellationStatusBadge';
import type { CancellationRequestDisplayDto } from '@/types/cancellationRequest.types';

export default function CancellationRequestsList() {
  const navigate = useNavigate();
  const role = getCurrentUserRole();
  const canManage = role === 'Admin' || role === 'Staff' || role === 'Operator';

  const {
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    pageItems,
    filteredCount,
    newIds,
    setItems,
    pageSize,
  } = useCancellationRequests();

  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleApprove(item: CancellationRequestDisplayDto) {
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
    setBusyId(item.id);
    try {
      const updated = await approveCancellationRequest(item.id, amount);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...updated } : x)));
      toast.success('Cancellation approved');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(item: CancellationRequestDisplayDto) {
    const reason = window.prompt('Reason for rejection (required):', '');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }
    setBusyId(item.id);
    try {
      await rejectCancellationRequest(item.id, reason.trim());
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, status: 'Rejected', rejectedReason: reason.trim() } : x))
      );
      toast.success('Cancellation rejected');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(item: CancellationRequestDisplayDto) {
    if (!window.confirm('Mark this cancellation as complete? This only succeeds once the linked refund has actually succeeded.')) return;
    setBusyId(item.id);
    try {
      const updated = await completeCancellationRequest(item.id);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...updated } : x)));
      toast.success('Cancellation completed');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-rotate-left me-2" />
          Cancellation Requests
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
      </div>

      <div className="row mb-3 g-2">
        <div className="col-md-4">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by booking, requester, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="table-responsive shadow-sm rounded">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Booking</th>
              <th>Requested By</th>
              <th>Reason</th>
              <th>Refund</th>
              <th>Status</th>
              <th>Requested At</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading cancellation requests...
                </td>
              </tr>
            )}

            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
                  No cancellation requests found.
                </td>
              </tr>
            )}

            {!loading &&
              pageItems.map((item, idx) => {
                const isNew = newIds.has(item.id);
                const isBusy = busyId === item.id;
                return (
                  <tr key={item.id} className={isNew ? 'table-warning' : ''}>
                    <td>{(page - 1) * pageSize + idx + 1}</td>
                    <td>
                      {item.bookingLabel}
                      {isNew && (
                        <span className="badge bg-danger ms-2">
                          <i className="fa-solid fa-bolt me-1" />
                          NEW
                        </span>
                      )}
                    </td>
                    <td>
                      <i className="fa-solid fa-user me-1 text-muted" />
                      {item.requestedByLabel}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 220 }} title={item.reason}>
                      {item.reason}
                    </td>
                    <td>
                      {item.approvedRefundAmount != null
                        ? item.approvedRefundAmount.toLocaleString()
                        : item.requestedRefundAmount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${cancellationStatusBadgeClass(item.status)}`}>{item.status}</span>
                    </td>
                    <td>{new Date(item.requestedAtUtc).toLocaleString()}</td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/admin/cancellation-requests/${item.id}`)}
                        >
                          <i className="fa-solid fa-eye" />
                        </button>
                        {canManage && item.status === 'Requested' && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-success"
                              disabled={isBusy}
                              onClick={() => handleApprove(item)}
                            >
                              {isBusy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={isBusy}
                              onClick={() => handleReject(item)}
                            >
                              <i className="fa-solid fa-xmark" />
                            </button>
                          </>
                        )}
                        {canManage && item.status === 'Approved' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            disabled={isBusy}
                            onClick={() => handleComplete(item)}
                          >
                            {isBusy ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-flag-checkered" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && filteredCount > 0 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center mb-0">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <i className="fa-solid fa-angle-left" />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <i className="fa-solid fa-angle-right" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

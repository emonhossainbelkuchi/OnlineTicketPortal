import { CancellationRequestStatus } from './enums';

// Mirrors DTO/BookingsExtraDtos.cs -> CancellationRequestCreateDto. POST /api/cancellationrequests.
// Deliberately carries no Status/refund-amount field — CancellationProcessingService prices the
// refund itself from the trip's real CancellationPolicy, never from anything the client sends.
// A customer (or staff, on their behalf) can ask to cancel a whole booking (ticketId omitted)
// or one ticket in it.
export interface CancellationRequestCreateRequest {
  bookingId: string;
  ticketId?: string; // Omit to cancel the whole booking; set to cancel just one ticket in it.
  reason: string;
}

// Mirrors CancellationApproveDto. POST /api/cancellationrequests/{id}/approve.
// Leave approvedRefundAmount undefined to accept the cancellation policy's
// own computed requestedRefundAmount as-is. (Piece 5: staff action.)
export interface CancellationApproveRequest {
  approvedRefundAmount?: number;
  remarks?: string;
}

// Mirrors CancellationRejectDto. POST /api/cancellationrequests/{id}/reject.
// (Piece 5: staff action.)
export interface CancellationRejectRequest {
  rejectedReason: string;
}

// Mirrors DTO/BookingsExtraDtos.cs -> CancellationRequestResponseDto. No Update DTO exists on the
// backend — a cancellation only ever moves Request -> Approve/Reject -> Complete (see
// CancellationRequestsController's class comment).
export interface CancellationRequest {
  id: string;
  bookingId: string;
  ticketId: string | null;
  requestedByUserId: string | null;
  approvedByUserId: string | null;
  status: CancellationRequestStatus;
  reason: string;
  rejectedReason: string | null;
  // Snapshot behind requestedRefundAmount, taken when the request was made — baseAmount is
  // fare-only (never tax/service charge), so it's normally lower than
  // bookingGrandTotalAtRequest; that gap, plus any policy fee, is why requestedRefundAmount
  // looks smaller than what was actually paid.
  baseAmount: number;
  bookingGrandTotalAtRequest: number;
  appliedRefundPercentage: number | null;
  appliedFixedCancellationFee: number | null;
  requestedRefundAmount: number;
  approvedRefundAmount: number | null;
  requestedAtUtc: string;
  approvedAtUtc: string | null;
  completedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

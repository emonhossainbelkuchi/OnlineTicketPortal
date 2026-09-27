// cancellationRequest.types.ts
// Mirrors CancellationRequestResponseDto (CancellationRequestsController).
// No raw PUT/DELETE by design — a request only ever moves through
// Approve/Reject/Complete (CancellationProcessingService).

export interface CancellationRequestResponseDto {
  id: string;
  bookingId: string;
  ticketId?: string | null;
  requestedByUserId?: string | null;
  approvedByUserId?: string | null;
  status: string; // Requested | Approved | Rejected | Completed
  reason: string;
  rejectedReason?: string | null;
  // Breakdown behind requestedRefundAmount — see CancellationRequestResponseDto on the API
  // side. baseAmount is fare-only (never includes tax/service charge), which is why it's
  // normally lower than bookingGrandTotalAtRequest — that gap plus any policy fee is what
  // explains requestedRefundAmount looking smaller than what the customer actually paid.
  baseAmount: number;
  bookingGrandTotalAtRequest: number;
  appliedRefundPercentage?: number | null;
  appliedFixedCancellationFee?: number | null;
  requestedRefundAmount: number;
  approvedRefundAmount?: number | null;
  refundId?: string | null;
  refundStatus?: string | null;
  requestedAtUtc: string;
  approvedAtUtc?: string | null;
  completedAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

// Best-effort — Booking/User DTO shapes weren't given, so a few plausible
// field names are tried with fallbacks (same defensive pattern used for
// Bus/Trip resolution in seatHoldService).
export interface BookingSummary {
  id: string;
  bookingCode?: string;
  bookingNumber?: string;
  tripId?: string;
  totalAmount?: number;
}

export interface UserSummary {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
}

export interface CancellationRequestDisplayDto extends CancellationRequestResponseDto {
  bookingLabel: string;
  requestedByLabel: string;
  approvedByLabel: string;
}
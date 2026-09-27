import { RefundStatus } from './enums';

// Mirrors DTO/PaymentsExtraDtos.cs -> RefundApproveDto/RefundRejectDto/
// RefundManualPayoutDto. There is no RefundCreateDto — a Refund is only
// ever created automatically (PaymentConfirmationService on a paid-but-seats-lost
// race, or CancellationProcessingService.ApproveAsync) — see RefundsController's
// class comment. Customers track status read-only (Piece 3); staff drive the
// workflow through these actions (Piece 5, RefundsController approve/reject/
// process/manual-payout).
export interface RefundApproveRequest {
  remarks?: string;
}

export interface RefundRejectRequest {
  reason: string;
}

// POST /api/refunds/{id}/manual-payout — the only way a guest refund (no
// CustomerProfile to credit a wallet on) can finish once it's sitting at
// PendingManualPayout. Platform Admin/Staff only.
export interface RefundManualPayoutRequest {
  manualPayoutReference: string;
}

// Mirrors RefundResponseDto.
export interface Refund {
  id: string;
  bookingId: string;
  paymentId: string;
  cancellationRequestId: string | null;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  gatewayRefundReference: string | null;
  manualPayoutReference: string | null;
  requestedAtUtc: string;
  refundedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

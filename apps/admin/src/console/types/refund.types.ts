// src/types/refund.types.ts
//
// Mirrors RefundsController exactly. There is NO RefundCreateDto — a Refund
// is only ever created automatically (PaymentConfirmationService today,
// CancellationRequest workflow later). From Requested it only moves forward
// through Approve -> Process (or stops at Reject); a guest refund (no
// CustomerProfile) makes one extra stop at PendingManualPayout after
// Process, leaving only via ManualPayout. There is no generic PUT/DELETE —
// every transition here is one of the four POST actions below.

export enum RefundStatus {
  Requested = 1,
  Approved = 2,
  Processing = 3,
  Succeeded = 4,
  Rejected = 5,
  Failed = 6,
  PendingManualPayout = 7,
  ReconciliationNeeded = 8,
}

export const RefundStatusLabel: Record<RefundStatus, string> = {
  [RefundStatus.Requested]: 'Requested',
  [RefundStatus.Approved]: 'Approved',
  [RefundStatus.Processing]: 'Processing',
  [RefundStatus.Succeeded]: 'Succeeded',
  [RefundStatus.Rejected]: 'Rejected',
  [RefundStatus.Failed]: 'Failed',
  [RefundStatus.PendingManualPayout]: 'Pending Manual Payout',
  [RefundStatus.ReconciliationNeeded]: 'Reconciliation Needed',
};

export const RefundStatusBadgeClass: Record<RefundStatus, string> = {
  [RefundStatus.Requested]: 'bg-secondary',
  [RefundStatus.Approved]: 'bg-info text-dark',
  [RefundStatus.Processing]: 'bg-primary',
  [RefundStatus.Succeeded]: 'bg-success',
  [RefundStatus.Rejected]: 'bg-danger',
  [RefundStatus.Failed]: 'bg-danger',
  [RefundStatus.PendingManualPayout]: 'bg-warning text-dark',
  [RefundStatus.ReconciliationNeeded]: 'bg-dark',
};

export const RefundStatusIcon: Record<RefundStatus, string> = {
  [RefundStatus.Requested]: 'fa-solid fa-hourglass-start',
  [RefundStatus.Approved]: 'fa-solid fa-thumbs-up',
  [RefundStatus.Processing]: 'fa-solid fa-spinner',
  [RefundStatus.Succeeded]: 'fa-solid fa-circle-check',
  [RefundStatus.Rejected]: 'fa-solid fa-circle-xmark',
  [RefundStatus.Failed]: 'fa-solid fa-triangle-exclamation',
  [RefundStatus.PendingManualPayout]: 'fa-solid fa-hand-holding-dollar',
  [RefundStatus.ReconciliationNeeded]: 'fa-solid fa-magnifying-glass-dollar',
};

export interface RefundResponseDto {
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

export interface RefundApproveDto {
  remarks?: string | null;
}

export interface RefundRejectDto {
  reason: string;
}

export interface RefundManualPayoutDto {
  manualPayoutReference: string;
}

// Client-side list params — GetAll takes none, so search/filter/sort/paging
// all happen in the hook, same pattern as PaymentHistoriesList.
export interface RefundListParams {
  search?: string;
  status?: RefundStatus | 'all';
  groupByStatus?: boolean;
  sortBy?: 'requestedAtUtc' | 'amount' | 'status' | 'refundedAtUtc';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

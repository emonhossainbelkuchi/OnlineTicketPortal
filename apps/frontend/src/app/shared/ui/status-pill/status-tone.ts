export type PillTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

/**
 * Maps every backend status string (BookingStatus, PaymentStatus, TripStatus,
 * SeatHoldStatus, RefundStatus, TicketStatus, CancellationRequestStatus,
 * SettlementStatus — see core/models/enums.ts) to a visual tone, so no
 * feature module has to write its own switch statement just to color a pill.
 *
 * Add to this map as new statuses come up — don't hardcode a tone in a
 * feature component.
 */
const STATUS_TONE_MAP: Record<string, PillTone> = {
  // positive / final-success states
  Confirmed: 'success',
  Completed: 'success',
  Succeeded: 'success',
  Paid: 'success',
  Issued: 'success',
  CheckedIn: 'success',
  Used: 'success',
  Approved: 'success',
  Active: 'success',

  // negative / failure states
  Cancelled: 'danger',
  Failed: 'danger',
  Rejected: 'danger',
  Expired: 'danger',
  NoShow: 'danger',
  ReconciliationNeeded: 'danger',

  // in-progress / needs-attention states
  Pending: 'warning',
  PendingPayment: 'warning',
  Processing: 'warning',
  Requested: 'warning',
  Held: 'warning',
  PendingManualPayout: 'warning',
  PartiallyCancelled: 'warning',
  PartiallyRefunded: 'warning',
  PartiallyPaid: 'warning', // InvoiceStatus (Piece 6) — same "needs attention" bucket as the other Partially* states.
  Delayed: 'warning',

  // informational / neutral-but-notable states
  Draft: 'neutral',
  Scheduled: 'neutral',
  Boarding: 'info',
  Departed: 'info',
  Running: 'info',
  Arrived: 'info',
  Initiated: 'info',
  Refunded: 'info',
  Invoiced: 'info',
};

export function toneForStatus(status: string): PillTone {
  return STATUS_TONE_MAP[status] ?? 'neutral';
}

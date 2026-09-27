const STATUS_TONE_MAP: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  Confirmed: 'success',
  Completed: 'success',
  Succeeded: 'success',
  Paid: 'success',
  Issued: 'success',
  CheckedIn: 'success',
  Used: 'success',
  Approved: 'success',
  Active: 'success',
  Cancelled: 'danger',
  Failed: 'danger',
  Rejected: 'danger',
  Expired: 'danger',
  NoShow: 'danger',
  ReconciliationNeeded: 'danger',
  Pending: 'warning',
  PendingPayment: 'warning',
  Processing: 'warning',
  Requested: 'warning',
  Held: 'warning',
  PendingManualPayout: 'warning',
  PartiallyCancelled: 'warning',
  PartiallyRefunded: 'warning',
  Delayed: 'warning',
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

/**
 * Same status->tone map as Angular's shared/ui/status-pill/status-tone.ts —
 * keep these two in sync if you add a new backend status. Renders the same
 * shared .tp-pill classes so it looks identical to the Angular app's pill.
 */
export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE_MAP[status] ?? 'neutral';
  return <span className={`tp-pill tp-pill--${tone}`}>{status}</span>;
}

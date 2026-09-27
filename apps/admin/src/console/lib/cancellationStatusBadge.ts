// cancellationStatusBadge.ts
// Shared Bootstrap badge color mapping for CancellationRequestStatus, used by
// both CancellationRequestsList and CancellationRequestsDetails so the
// colors never drift apart between the two pages.
export function cancellationStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'requested':
      return 'bg-warning text-dark';
    case 'approved':
      return 'bg-primary';
    case 'rejected':
      return 'bg-danger';
    case 'completed':
      return 'bg-success';
    default:
      return 'bg-light text-dark';
  }
}

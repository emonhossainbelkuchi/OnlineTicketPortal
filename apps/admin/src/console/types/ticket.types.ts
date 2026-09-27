// src/types/ticket.types.ts
//
// Mirrors TicketPortal.Api.DTO.TicketResponseDto exactly.
// Ticket has NO create/update DTO on the backend — tickets are issued only by
// PaymentConfirmationService the moment an online payment is confirmed.
// TicketsController is read-only (GET /api/Tickets, GET /api/Tickets/{id}).
// So there is intentionally no TicketCreateDto / TicketUpdateDto here.

export enum TicketStatus {
  PendingPayment = 1,
  Issued = 2,
  CheckedIn = 3,
  Used = 4,
  Cancelled = 5,
  Refunded = 6,
  NoShow = 7,
}

export const TicketStatusLabel: Record<TicketStatus, string> = {
  [TicketStatus.PendingPayment]: 'Pending Payment',
  [TicketStatus.Issued]: 'Issued',
  [TicketStatus.CheckedIn]: 'Checked In',
  [TicketStatus.Used]: 'Used',
  [TicketStatus.Cancelled]: 'Cancelled',
  [TicketStatus.Refunded]: 'Refunded',
  [TicketStatus.NoShow]: 'No Show',
};

// Bootstrap badge color per status, used everywhere a status pill is rendered.
export const TicketStatusBadgeClass: Record<TicketStatus, string> = {
  [TicketStatus.PendingPayment]: 'bg-warning text-dark',
  [TicketStatus.Issued]: 'bg-success',
  [TicketStatus.CheckedIn]: 'bg-info text-dark',
  [TicketStatus.Used]: 'bg-secondary',
  [TicketStatus.Cancelled]: 'bg-danger',
  [TicketStatus.Refunded]: 'bg-dark',
  [TicketStatus.NoShow]: 'bg-danger',
};

export interface TicketResponseDto {
  id: string;
  bookingId: string;
  bookingPassengerId: string;
  tripId: string;
  tripSeatId: string;
  ticketNumber: string;
  externalTicketKey: string | null;
  seatNumberSnapshot: string;
  qrCodePayload: string;
  fare: number;
  discountAmount: number;
  finalFare: number;
  status: TicketStatus;
  issuedAtUtc: string | null;
  checkedInAtUtc: string | null;
  cancelledAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string; // base64 byte[]
}

// Query params supported by GET /api/Tickets. The controller itself doesn't
// take query params yet (it just scopes by role), so search/paging below are
// done client-side in the hook — kept here so the hook & UI share one shape.
export interface TicketListParams {
  search?: string;
  status?: TicketStatus | 'all';
  page?: number;
  pageSize?: number;
}

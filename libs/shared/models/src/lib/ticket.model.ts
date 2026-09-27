import { TicketStatus } from './enums';

// Mirrors DTO/BookingsExtraDtos.cs -> TicketResponseDto. Read-only on the backend — a Ticket is
// only ever issued by PaymentConfirmationService the moment an online (or counter-sale) payment
// is confirmed, one per booked seat. This is what Piece 3's e-ticket / booking-history screens
// render; TicketsController.GetAll is already scoped server-side to "my own tickets" for a
// Customer caller, so the frontend just filters the result by bookingId client-side.
export interface Ticket {
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
  rowVersion: string;
}

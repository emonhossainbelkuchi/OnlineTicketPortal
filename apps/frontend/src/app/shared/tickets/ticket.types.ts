import { Ticket } from '@ticketportal-mono/models';

/**
 * TicketsController returns TicketResponseDto, which carries the trip/bus/passenger context
 * next to the core ticket fields the shared `Ticket` model already describes. Only the
 * enrichment is added here so the shared model stays a plain mirror of the ticket row.
 */
export interface TicketView extends Ticket {
  pnr: string | null;
  passengerName: string | null;
  passengerPhone: string | null;
  passengerAge: number | null;
  seatNumber: string | null;
  tripCode: string | null;
  departureTimeUtc: string | null;
  arrivalTimeUtc: string | null;
  busName: string | null;
  busBrand: string | null;
  busModel: string | null;
  busCoachNumber: string | null;
  busRegistrationNumber: string | null;
  busOperatorName: string | null;
  departureTerminalName: string | null;
  departureCity: string | null;
  arrivalTerminalName: string | null;
  arrivalCity: string | null;
  boardingTerminalName: string | null;
  droppingTerminalName: string | null;
}

export function ticketRoute(ticket: TicketView): string {
  const from = ticket.departureCity || ticket.departureTerminalName || 'Origin';
  const to = ticket.arrivalCity || ticket.arrivalTerminalName || 'Destination';
  return `${from} → ${to}`;
}

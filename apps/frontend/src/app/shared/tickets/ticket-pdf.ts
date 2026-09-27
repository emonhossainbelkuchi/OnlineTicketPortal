import { parseUtc } from '../../core/utils/utc';
import { TicketView, ticketRoute } from './ticket.types';

function formatWhen(iso: string | null): string {
  const date = parseUtc(iso);
  return date ? date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

/**
 * Builds a one-page A5 e-ticket PDF (text + QR) entirely in the browser. jsPDF is loaded on
 * demand so it never weighs on the initial page load - only customers who press "Download PDF"
 * pay for it.
 */
export async function downloadTicketPdf(ticket: TicketView, qrDataUrl: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const width = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Header band
  doc.setFillColor(255, 199, 44);
  doc.rect(0, 0, width, 22, 'F');
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TicketPortal', margin, 14);
  doc.setFontSize(10);
  doc.text('E-TICKET', width - margin, 14, { align: 'right' });

  // Route
  let y = 36;
  doc.setFontSize(15);
  // jsPDF's built-in Helvetica has no arrow glyph, so the on-screen "→" becomes "to" here.
  doc.text(ticketRoute(ticket).replace('→', 'to'), margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(ticket.busOperatorName ?? '', margin, y);

  // Key/value rows
  const rows: [string, string][] = [
    ['Ticket number', ticket.ticketNumber],
    ['Booking (PNR)', ticket.pnr ?? '—'],
    ['Passenger', [ticket.passengerName, ticket.passengerAge ? `(${ticket.passengerAge})` : ''].filter(Boolean).join(' ') || '—'],
    ['Seat', ticket.seatNumber ?? ticket.seatNumberSnapshot],
    ['Trip', ticket.tripCode ?? '—'],
    ['Departure', formatWhen(ticket.departureTimeUtc)],
    ['Arrival', formatWhen(ticket.arrivalTimeUtc)],
    ['Boarding point', ticket.boardingTerminalName ?? ticket.departureTerminalName ?? '—'],
    ['Dropping point', ticket.droppingTerminalName ?? ticket.arrivalTerminalName ?? '—'],
    ['Bus', [ticket.busBrand, ticket.busModel, ticket.busCoachNumber ? `#${ticket.busCoachNumber}` : ''].filter(Boolean).join(' ') || ticket.busName || '—'],
    ['Fare paid', `BDT ${ticket.finalFare.toFixed(2)}`],
    ['Status', ticket.status],
  ];
  y += 10;
  for (const [label, value] of rows) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.text(label, margin, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(value), width - margin, y, { align: 'right', maxWidth: width - margin * 2 - 32 });
    doc.setFont('helvetica', 'normal');
    y += 7.5;
  }

  // QR + footer
  const qrSize = 38;
  doc.addImage(qrDataUrl, 'PNG', (width - qrSize) / 2, y + 4, qrSize, qrSize);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Show this QR code at boarding. Anyone can verify the ticket number on the TicketPortal website.', width / 2, y + qrSize + 10, {
    align: 'center',
    maxWidth: width - margin * 2,
  });

  doc.save(`ticket-${ticket.ticketNumber}.pdf`);
}

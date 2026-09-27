import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { TpSpinnerComponent } from '../ui';
import { TicketView } from './ticket.types';

/**
 * Chunk 6 task 4 — the one-ticket key/value block + QR code, extracted out of
 * ticket-detail.component.ts (My Bookings) so the counter desk's printable
 * receipt (features/counter/receipt/counter-receipt.component.ts) can reuse
 * the exact same layout instead of re-building it. Both features render one
 * of these per ticket; ticket-detail wraps it in a single <tp-card> with its
 * own header/actions, and the counter receipt repeats it once per seat.
 *
 * The QR itself is generated here (not passed in) so both callers get it for
 * free — ticket-detail listens for `qrReady` because its own "Download PDF"
 * button needs the same data URL that's on screen.
 */
@Component({
  selector: 'tp-ticket-qr-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TpSpinnerComponent],
  template: `
    <div class="tp-ticket-qr-card">
      <dl>
        <div><dt>Ticket number</dt><dd>{{ ticket.ticketNumber }}</dd></div>
        <div><dt>Booking (PNR)</dt><dd>{{ ticket.pnr || '—' }}</dd></div>
        <div><dt>Passenger</dt><dd>{{ ticket.passengerName || '—' }}{{ ticket.passengerAge ? ' (' + ticket.passengerAge + ')' : '' }}</dd></div>
        <div><dt>Seat</dt><dd>{{ ticket.seatNumber || ticket.seatNumberSnapshot }}</dd></div>
        <div><dt>Trip</dt><dd>{{ ticket.tripCode || '—' }}</dd></div>
        <div><dt>Departs</dt><dd>{{ ticket.departureTimeUtc | date: 'EEE, d MMM y · h:mm a' }}</dd></div>
        <div><dt>Arrives</dt><dd>{{ ticket.arrivalTimeUtc | date: 'EEE, d MMM y · h:mm a' }}</dd></div>
        <div><dt>Boarding point</dt><dd>{{ ticket.boardingTerminalName || ticket.departureTerminalName || '—' }}</dd></div>
        <div><dt>Dropping point</dt><dd>{{ ticket.droppingTerminalName || ticket.arrivalTerminalName || '—' }}</dd></div>
        <div><dt>Bus</dt><dd>{{ busLabel() }}</dd></div>
        <div><dt>Fare paid</dt><dd>BDT {{ ticket.finalFare | number: '1.2-2' }}</dd></div>
      </dl>
      <div class="tp-ticket-qr-card__qr">
        @if (qr(); as src) {
          <img [src]="src" alt="Ticket QR code" width="180" height="180" />
        } @else {
          <tp-spinner size="sm" />
        }
        <p class="tp-muted">Show this at boarding</p>
      </div>
    </div>
  `,
  styles: [
    `
      .tp-ticket-qr-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 200px;
        gap: var(--tp-space-5);
      }
      dl {
        margin: 0;
        display: grid;
        gap: var(--tp-space-2);
      }
      dl div {
        display: flex;
        justify-content: space-between;
        gap: var(--tp-space-4);
      }
      dt {
        color: var(--tp-text-muted);
      }
      dd {
        margin: 0;
        font-weight: 600;
        text-align: right;
      }
      .tp-ticket-qr-card__qr {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--tp-space-2);
      }
      .tp-ticket-qr-card__qr img {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-md);
        padding: var(--tp-space-2);
        background: #fff;
      }
      .tp-ticket-qr-card__qr p {
        margin: 0;
        font-size: 12px;
      }
      @media (max-width: 640px) {
        .tp-ticket-qr-card {
          grid-template-columns: 1fr;
        }
      }
      @media print {
        .tp-ticket-qr-card__qr {
          break-inside: avoid;
        }
      }
    `,
  ],
})
export class TicketQrCardComponent implements OnChanges {
  @Input({ required: true }) ticket!: TicketView;

  // Emits the built QR data URL (or null if it couldn't be built) every time
  // `ticket` changes — the only reason ticket-detail.component.ts needs this
  // is that its own "Download PDF" button hands the same data URL to
  // downloadTicketPdf() (ticket-pdf.ts) rather than re-rendering the QR.
  @Output() readonly qrReady = new EventEmitter<string | null>();

  protected readonly qr = signal<string | null>(null);

  ngOnChanges(): void {
    void this.buildQr();
  }

  protected busLabel(): string {
    const t = this.ticket;
    if (!t) return '';
    return [t.busBrand, t.busModel, t.busCoachNumber ? `#${t.busCoachNumber}` : ''].filter(Boolean).join(' ') || t.busName || '—';
  }

  /** QR encodes what the server issued (qrCodePayload); the ticket number is the fallback. */
  private async buildQr(): Promise<void> {
    try {
      // qrcode is CommonJS: depending on the bundler's interop its API sits on the namespace or on .default.
      const mod = await import('qrcode');
      const qrcode = mod.default ?? mod;
      const dataUrl = await qrcode.toDataURL(this.ticket.qrCodePayload || this.ticket.ticketNumber, { margin: 1, width: 360 });
      this.qr.set(dataUrl);
      this.qrReady.emit(dataUrl);
    } catch {
      this.qr.set(null);
      this.qrReady.emit(null);
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Booking, Ticket } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { TpButtonDirective, TpCardComponent, TpSpinnerComponent, TpStatusPillComponent } from '../../../../shared/ui';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { TripDisplayContext, TripDisplayService } from '../../services/trip-display.service';

/**
 * Deliberately re-fetches everything from the API by the bookingId route param instead of
 * trusting CheckoutStateService — this screen also has to work as a standalone deep link (a
 * "View E-Ticket" button from booking history, or a page refresh right after paying), where
 * the in-memory checkout state won't be there.
 */
@Component({
  selector: 'tp-checkout-confirmation',
  standalone: true,
  imports: [CommonModule, TpCardComponent, TpButtonDirective, TpSpinnerComponent, TpStatusPillComponent],
  template: `
    <div class="tp-page tp-confirmation-page">
      @if (loading()) {
        <div class="tp-loading-block">
          <tp-spinner size="lg" />
          <p class="tp-muted">Loading your ticket…</p>
        </div>
      } @else if (booking(); as b) {
        <div class="tp-confirmation-header">
          <h2>Booking Confirmed</h2>
          <p class="tp-muted">PNR <strong>{{ b.pnr }}</strong> · {{ tickets().length }} ticket(s) issued</p>
        </div>

        @if (context(); as ctx) {
          <tp-card class="tp-trip-summary">
            <h3>{{ ctx.operatorName }} · {{ ctx.trip.tripCode }}</h3>
            <p class="tp-muted">{{ ctx.boardingTerminalName }} → {{ ctx.droppingTerminalName }}</p>
            <p class="tp-muted">
              Departs {{ ctx.trip.departureTimeUtc | date: 'medium' }} · Arrives {{ ctx.trip.arrivalTimeUtc | date: 'medium' }}
            </p>
          </tp-card>
        }

        @if (b.requiresExternalConfirmation) {
          <tp-card class="tp-external-confirmation-note">
            <strong>Awaiting operator confirmation.</strong>
            <span>
              This operator manages its own booking system. Your seats are held and your payment is recorded, but the
              operator's system still needs to confirm the seat — this normally happens automatically within a few
              minutes. Check My Bookings for the latest status.
            </span>
          </tp-card>
        }

        <div class="tp-ticket-grid">
          @for (t of tickets(); track t.id) {
            <tp-card class="tp-ticket-card">
              <div class="tp-ticket-card__header">
                <span class="tp-ticket-card__seat">Seat {{ t.seatNumberSnapshot }}</span>
                <tp-status-pill [status]="t.status" />
              </div>
              <p class="tp-ticket-card__number">{{ t.ticketNumber }}</p>
              <p class="tp-ticket-card__fare">{{ t.finalFare | number: '1.2-2' }} {{ b.currency }}</p>
              <div class="tp-ticket-card__qr">{{ t.qrCodePayload }}</div>
            </tp-card>
          }
        </div>

        <div class="tp-confirmation-page__actions">
          <button tpButton variant="secondary" (click)="print()">Print / Save PDF</button>
          <button tpButton variant="primary" (click)="viewInMyBookings(b.id)">View in My Bookings</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tp-confirmation-page {
        max-width: 800px;
      }

      .tp-loading-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--tp-space-3);
        padding: var(--tp-space-7) 0;
      }

      .tp-confirmation-header {
        margin-bottom: var(--tp-space-5);
      }

      .tp-trip-summary {
        margin-bottom: var(--tp-space-5);
      }

      .tp-external-confirmation-note {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-1);
        margin-bottom: var(--tp-space-5);
        border-left: 4px solid var(--tp-warning, #d97706);
        font-size: 13px;
        color: var(--tp-text-muted);
      }

      .tp-external-confirmation-note strong {
        color: var(--tp-text);
        font-family: var(--tp-font-heading);
      }

      .tp-ticket-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: var(--tp-space-4);
        margin-bottom: var(--tp-space-5);
      }

      .tp-ticket-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--tp-space-2);
      }

      .tp-ticket-card__seat {
        font-weight: 700;
        font-size: 15px;
      }

      .tp-ticket-card__number {
        font-family: monospace;
        font-size: 13px;
        color: var(--tp-text-muted);
        margin: 0 0 var(--tp-space-2);
      }

      .tp-ticket-card__fare {
        font-weight: 600;
        margin-bottom: var(--tp-space-3);
      }

      .tp-ticket-card__qr {
        font-family: monospace;
        font-size: 10px;
        word-break: break-all;
        background: var(--tp-bg-soft);
        border-radius: var(--tp-radius-sm);
        padding: var(--tp-space-2);
        color: var(--tp-text-muted);
      }

      .tp-confirmation-page__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--tp-space-3);
      }

      @media print {
        .tp-confirmation-page__actions {
          display: none;
        }
      }
    `,
  ],
})
export class ConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly tripDisplay = inject(TripDisplayService);
  private readonly checkoutState = inject(CheckoutStateService);

  protected readonly loading = signal(true);
  protected readonly booking = signal<Booking | null>(null);
  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly context = signal<TripDisplayContext | null>(null);

  ngOnInit(): void {
    const bookingId = this.route.snapshot.paramMap.get('bookingId');
    if (!bookingId) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      booking: this.api.get<Booking>(`bookings/${bookingId}`),
      tickets: this.api.get<Ticket[]>('tickets'),
    }).subscribe({
      next: ({ booking, tickets }) => {
        this.booking.set(booking);
        this.tickets.set(tickets.filter((t) => t.bookingId === booking.id));
        this.loading.set(false);
        // The checkout wizard is done — clear the in-progress state so a stray back-navigation
        // can't re-enter checkout/passengers or checkout/payment with a stale hold.
        this.checkoutState.reset();

        this.tripDisplay.loadContext(booking.tripId).subscribe((ctx) => this.context.set(ctx));
      },
      error: () => this.loading.set(false),
    });
  }

  print(): void {
    window.print();
  }

  viewInMyBookings(bookingId: string): void {
    this.router.navigate(['/my-bookings', bookingId]);
  }
}

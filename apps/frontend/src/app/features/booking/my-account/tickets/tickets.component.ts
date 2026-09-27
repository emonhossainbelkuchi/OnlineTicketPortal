import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { parseUtc } from '../../../../core/utils/utc';
import { TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, TpStatusPillComponent, TpTabsComponent } from '../../../../shared/ui';
import { AccountNavComponent } from '../account-nav/account-nav.component';
import { TicketView, ticketRoute } from '../../../../shared/tickets/ticket.types';

@Component({
  selector: 'tp-my-tickets',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, AccountNavComponent, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, TpStatusPillComponent, TpTabsComponent],
  template: `
    <div class="tp-page">
      <h2>My Tickets</h2>
      <tp-account-nav />
      <tp-tabs [tabs]="['Upcoming', 'Past & cancelled']" [(activeIndex)]="tabIndex" />

      @if (loading()) {
        <div class="tp-center"><tp-spinner /></div>
      } @else if (error()) {
        <tp-card><p class="tp-error-text">{{ error() }}</p></tp-card>
      } @else if (visible().length === 0) {
        <tp-empty-state
          [title]="tabIndex() === 0 ? 'No upcoming tickets' : 'Nothing here yet'"
          [message]="tabIndex() === 0 ? 'Tickets appear here as soon as a payment is confirmed.' : 'Used, expired and cancelled tickets show up here.'"
        />
      } @else {
        <div class="tp-ticket-list">
          @for (t of visible(); track t.id) {
            <a class="tp-ticket-link" [routerLink]="['/my-bookings/tickets', t.id]">
              <tp-card [hoverable]="true" class="tp-ticket-row">
                <div>
                  <p class="tp-ticket-row__route">{{ route(t) }}</p>
                  <p class="tp-muted tp-ticket-row__meta">
                    {{ t.departureTimeUtc | date: 'EEE, d MMM y · h:mm a' }} · Seat {{ t.seatNumber || t.seatNumberSnapshot }}
                  </p>
                  <p class="tp-muted tp-ticket-row__meta">{{ t.ticketNumber }}{{ t.passengerName ? ' · ' + t.passengerName : '' }}</p>
                </div>
                <div class="tp-ticket-row__side">
                  <tp-status-pill [status]="t.status" />
                  <strong>BDT {{ t.finalFare | number: '1.0-0' }}</strong>
                </div>
              </tp-card>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .tp-center { display: flex; justify-content: center; padding: var(--tp-space-6); }
    .tp-error-text { color: var(--tp-danger); margin: 0; }
    .tp-ticket-list { display: flex; flex-direction: column; gap: var(--tp-space-3); }
    .tp-ticket-link { text-decoration: none; color: inherit; }
    .tp-ticket-row { display: flex; justify-content: space-between; align-items: center; gap: var(--tp-space-4); }
    .tp-ticket-row__route { margin: 0; font-weight: 700; font-size: 16px; }
    .tp-ticket-row__meta { margin: 2px 0 0; font-size: 13px; }
    .tp-ticket-row__side { display: flex; flex-direction: column; align-items: flex-end; gap: var(--tp-space-1); }
  `],
})
export class MyTicketsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly tickets = signal<TicketView[]>([]);
  protected readonly tabIndex = signal(0);

  private static readonly LIVE = new Set(['PendingPayment', 'Issued', 'CheckedIn']);

  protected readonly visible = computed(() => {
    const now = Date.now();
    const upcoming = this.tabIndex() === 0;
    return this.tickets()
      .filter((t) => {
        const departs = parseUtc(t.departureTimeUtc)?.getTime() ?? now;
        const isUpcoming = MyTicketsComponent.LIVE.has(t.status) && departs >= now;
        return upcoming ? isUpcoming : !isUpcoming;
      })
      .sort((a, b) => {
        const diff = (parseUtc(a.departureTimeUtc)?.getTime() ?? 0) - (parseUtc(b.departureTimeUtc)?.getTime() ?? 0);
        return upcoming ? diff : -diff; // soonest first for upcoming, most recent first for past
      });
  });

  ngOnInit(): void {
    // TicketsController.GetAll is already scoped server-side to the caller's own tickets.
    this.api.get<TicketView[]>('tickets').subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message || 'Could not load your tickets.');
        this.loading.set(false);
      },
    });
  }

  protected route(ticket: TicketView): string {
    return ticketRoute(ticket);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SeatHold, SeatHoldItem } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpStatusPillComponent } from '../../../../shared/ui';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { TripDisplayService } from '../../services/trip-display.service';

/**
 * Piece 2's seat map now hands off here via a `holdToken` query param (see
 * trip-seat-map.component.ts#holdSeats), so that's the normal way anyone lands on this screen.
 * The manual paste field below is a fallback only — for a direct/bookmarked visit to this URL
 * with no token — and is never where "Release Seats & Start Over" or an expired-hold's "Start
 * Over" send the customer; both of those navigate back to /search instead so this screen
 * doesn't dead-end on a box they never had to use in the first place.
 */
@Component({
  selector: 'tp-checkout-start',
  standalone: true,
  imports: [CommonModule, FormsModule, TpCardComponent, TpButtonDirective, TpEmptyStateComponent, TpStatusPillComponent],
  template: `
    <div class="tp-page tp-checkout-start">
      <h2>Start Checkout</h2>

      @if (!state.hold()) {
        <tp-card class="tp-lookup-card">
          <p class="tp-muted">
            Paste the seat-hold token from your seat selection to continue. (Once the search &amp;
            seat-map screens exist, this step happens automatically — you'll land here with the
            token already filled in.)
          </p>
          <div class="tp-lookup-row">
            <input
              type="text"
              placeholder="Seat hold token"
              [(ngModel)]="tokenInput"
              [disabled]="loading()"
              (keydown.enter)="lookup()"
            />
            <button tpButton variant="primary" [disabled]="!tokenInput().trim() || loading()" (click)="lookup()">
              {{ loading() ? 'Looking up…' : 'Look Up Hold' }}
            </button>
          </div>
          @if (errorMessage()) {
            <p class="tp-error-text">{{ errorMessage() }}</p>
          }
        </tp-card>
      } @else if (!state.hasActiveHold()) {
        <tp-card>
          <tp-empty-state title="This hold has expired" message="The seats were released back to availability. Please select your seats again.">
            <button tpButton variant="primary" (click)="startOver()">Start Over</button>
          </tp-empty-state>
        </tp-card>
      } @else {
        <tp-card class="tp-hold-summary">
          <div class="tp-hold-summary__header">
            <div>
              <h3>{{ state.operatorName() }} · {{ state.trip()?.tripCode }}</h3>
              <p class="tp-muted">{{ state.boardingTerminalName() }} → {{ state.droppingTerminalName() }}</p>
              <p class="tp-muted">
                Departs {{ state.trip()?.departureTimeUtc | date: 'medium' }} · Arrives
                {{ state.trip()?.arrivalTimeUtc | date: 'medium' }}
              </p>
            </div>
            <div class="tp-hold-timer">
              <tp-status-pill [status]="countdownLabel()" [tone]="countdownTone()" />
              <span class="tp-muted">seats held</span>
            </div>
          </div>

          <table class="tp-seat-table">
            <thead>
              <tr>
                <th>Seat</th>
                <th style="text-align: right">Fare</th>
              </tr>
            </thead>
            <tbody>
              @for (item of state.holdItems(); track item.id) {
                <tr>
                  <td>{{ seatNumberFor(item) }}</td>
                  <td style="text-align: right">{{ item.fareAtHold | number: '1.2-2' }} {{ state.trip()?.currency }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div class="tp-hold-summary__actions">
            <button tpButton variant="secondary" (click)="releaseAndStartOver()">Release Seats &amp; Start Over</button>
            <button tpButton variant="primary" (click)="continue()">Continue to Passenger Details</button>
          </div>
        </tp-card>
      }
    </div>
  `,
  styles: [
    `
      .tp-checkout-start {
        max-width: 720px;
      }

      .tp-lookup-card p {
        margin-top: 0;
      }

      .tp-lookup-row {
        display: flex;
        gap: var(--tp-space-3);
      }

      .tp-lookup-row input {
        flex: 1;
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
      }

      .tp-lookup-row input:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }

      .tp-error-text {
        color: var(--tp-danger);
        font-size: 13px;
        margin-bottom: 0;
      }

      .tp-hold-summary__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--tp-space-4);
        margin-bottom: var(--tp-space-4);
      }

      .tp-hold-summary__header h3 {
        margin-bottom: var(--tp-space-1);
      }

      .tp-hold-timer {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--tp-space-1);
        font-size: 12px;
      }

      .tp-seat-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        margin-bottom: var(--tp-space-5);
      }

      .tp-seat-table th {
        text-align: left;
        color: var(--tp-text-muted);
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        border-bottom: 1px solid var(--tp-border);
        padding: var(--tp-space-2) 0;
      }

      .tp-seat-table td {
        padding: var(--tp-space-2) 0;
        border-bottom: 1px solid var(--tp-border);
      }

      .tp-hold-summary__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--tp-space-3);
      }
    `,
  ],
})
export class CheckoutStartComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tripDisplay = inject(TripDisplayService);
  protected readonly state = inject(CheckoutStateService);

  protected readonly tokenInput = signal('');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('holdToken');
    if (fromQuery) {
      this.tokenInput.set(fromQuery);
      this.lookup();
    }
  }

  lookup(): void {
    const token = this.tokenInput().trim();
    if (!token) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.api.get<SeatHold>(`seatholds/by-token/${encodeURIComponent(token)}`).subscribe({
      next: (hold) => this.onHoldResolved(hold),
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No active hold found for that token. Double-check it and try again.');
      },
    });
  }

  private onHoldResolved(hold: SeatHold): void {
    if (hold.status !== 'Active' || hold.secondsRemaining <= 0) {
      this.loading.set(false);
      this.errorMessage.set('This hold has already expired. Please select your seats again.');
      return;
    }

    forkJoin({
      items: this.api.get<SeatHoldItem[]>('seatholditems'),
      context: this.tripDisplay.loadContext(hold.tripId),
    }).subscribe({
      next: ({ items, context }) => {
        this.loading.set(false);
        this.state.startCheckout({
          hold,
          holdItems: items.filter((i) => i.seatHoldId === hold.id),
          trip: context.trip,
          operatorName: context.operatorName,
          boardingTerminalName: context.boardingTerminalName,
          droppingTerminalName: context.droppingTerminalName,
        });
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Found the hold, but could not load the trip details. Please try again.');
      },
    });
  }

  seatNumberFor(item: SeatHoldItem): string {
    const seat = this.state.trip()?.tripSeats.find((s) => s.id === item.tripSeatId);
    return seat?.seatNumber ?? item.tripSeatId.slice(0, 8);
  }

  countdownLabel(): string {
    const seconds = this.state.hold()?.secondsRemaining ?? 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  countdownTone(): 'danger' | 'warning' {
    return (this.state.hold()?.secondsRemaining ?? 0) <= 60 ? 'danger' : 'warning';
  }

  releaseAndStartOver(): void {
    const hold = this.state.hold();
    if (hold) {
      this.api.post(`seatholds/${hold.id}/release`, {}).subscribe();
    }
    // "Start Over" means abandon this checkout attempt, full stop — not land on the leftover
    // manual-token lookup card below (that box only exists as a fallback for a direct/bookmarked
    // visit to this URL with no holdToken; it was never something a customer was meant to use
    // day-to-day, and re-showing it here just looks like the button is broken). Release the hold
    // server-side, clear local state, and send them back to search so they can pick fresh seats.
    this.state.reset();
    this.router.navigate(['/search']);
  }

  startOver(): void {
    // Same reasoning as releaseAndStartOver — nothing to release here (the hold already
    // expired server-side), but "Start Over" still shouldn't dead-end on the manual-token
    // lookup card. Send the customer back to search to pick seats again.
    this.state.reset();
    this.router.navigate(['/search']);
  }

  continue(): void {
    this.router.navigate(['/my-bookings/checkout/passengers']);
  }
}

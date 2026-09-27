import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Trip, TripSearchResult, TripSeat } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  TpButtonDirective,
  TpCardComponent,
  TpEmptyStateComponent,
  TpSpinnerComponent,
} from '../../../shared/ui';
import { BusSeatLayoutComponent } from '../../../shared/bus-seat-layout/bus-seat-layout.component';
import { SearchApiService } from '../services/search-api.service';

interface FastNavState {
  searchResult?: TripSearchResult;
}

/**
 * Piece 2 — seat map + hold. Anyone can browse this page and click seats; nothing is reserved
 * on the backend, and no login is required, until "Hold Seats & Continue" calls
 * SeatHoldsController.Create — see holdSeats() below, which checks auth first and sends an
 * anonymous visitor to log in (returning to this exact trip) rather than letting the backend's
 * 401 do it. On success we hand off to Piece 3's checkout by holdToken alone (see
 * booking/checkout/checkout-start.component.ts, which looks the hold up again by that token)
 * rather than passing the hold object through router state, so a refresh mid-checkout still
 * works.
 *
 * If a couple of seats get taken by someone else between opening this page and clicking Hold,
 * the backend replies 409 (ErrorInterceptor already toasts the message) — we just refetch the
 * trip so the grid reflects reality and drop any now-unavailable seats from the selection.
 */
@Component({
  selector: 'tp-trip-seat-map',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TpButtonDirective,
    TpCardComponent,
    TpEmptyStateComponent,
    TpSpinnerComponent,
    BusSeatLayoutComponent,
  ],
  template: `
    <div class="tp-page tp-seat-map-page">
      @if (loading()) {
        <tp-spinner />
      } @else if (!trip()) {
        <tp-empty-state
          title="Trip not found"
          message="This trip may have been removed or is no longer available."
        >
          <a routerLink="/search">
            <button tpButton variant="primary">Back to search</button>
          </a>
        </tp-empty-state>
      } @else {
        <a class="tp-back-link" [routerLink]="['/search/results']" [queryParams]="backQueryParams">
          ← Back to results
        </a>

        <tp-card class="tp-trip-header">
          <div>
            <h2>{{ operatorName() }}</h2>
            <p class="tp-muted">
              {{ departureTerminalName() }} → {{ arrivalTerminalName() }} ·
              {{ trip()!.departureTimeUtc | date: 'medium' }}
            </p>
          </div>
          <span class="tp-muted tp-trip-code">Trip {{ trip()!.tripCode }}</span>
        </tp-card>

        <div class="tp-seat-layout">
          <tp-card class="tp-bus-card">
            <tp-bus-seat-layout
              [seats]="trip()!.tripSeats"
              [selectedIds]="selectedSeatIds()"
              [currency]="trip()!.currency"
              (toggle)="toggleSeatById($event)"
            />
          </tp-card>

          <aside class="tp-seat-aside">
            <tp-card class="tp-seat-summary">
              <h3>Your seats</h3>
              @if (selectedSeatIds().length === 0) {
                <p class="tp-muted">Tap a seat on the bus to select it.</p>
              } @else {
                <ul class="tp-seat-summary__list">
                  @for (seat of selectedSeats(); track seat.id) {
                    <li>
                      <span>Seat <strong>{{ seat.seatNumber }}</strong></span>
                      <span>{{ trip()!.currency }} {{ seat.fare }}</span>
                    </li>
                  }
                </ul>
              }
              <div class="tp-seat-summary__total">
                <span class="tp-muted">Total fare</span>
                <span class="tp-seat-summary__amount">{{ trip()!.currency }} {{ selectedFareTotal() }}</span>
              </div>
              <button
                tpButton
                variant="primary"
                size="lg"
                class="tp-seat-summary__cta"
                [disabled]="selectedSeatIds().length === 0 || holding()"
                (click)="holdSeats()"
              >
                {{ holding() ? 'Holding…' : 'Hold Seats & Continue' }}
              </button>
              <p class="tp-muted tp-seat-summary__note">Your seats are held for a few minutes while you complete payment.</p>
            </tp-card>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tp-seat-map-page {
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding-top: 20px;
      }

      .tp-back-link {
        font-size: 13px;
        color: var(--tp-text-muted);
        text-decoration: none;
        width: fit-content;
      }

      .tp-back-link:hover {
        color: var(--tp-text);
      }

      .tp-trip-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .tp-trip-code {
        font-size: 13px;
      }

      .tp-seat-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 18px;
        align-items: start;
      }

      .tp-seat-aside {
        position: sticky;
        top: 90px;
      }

      .tp-seat-summary h3 {
        margin: 0 0 12px;
        font-family: var(--tp-font-heading);
      }

      .tp-seat-summary p {
        margin: 0;
      }

      .tp-seat-summary__list {
        list-style: none;
        margin: 0 0 12px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .tp-seat-summary__list li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .tp-seat-summary__total {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 0;
        border-top: 1px dashed var(--tp-border);
      }

      .tp-seat-summary__amount {
        font-weight: 700;
        font-size: 20px;
      }

      .tp-seat-summary__cta {
        width: 100%;
      }

      .tp-seat-summary__note {
        margin-top: 10px !important;
        font-size: 12px;
      }

      @media (max-width: 860px) {
        .tp-seat-layout {
          grid-template-columns: 1fr;
        }

        .tp-seat-aside {
          position: static;
        }
      }
    `,
  ],
})
export class TripSeatMapComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly searchApi = inject(SearchApiService);

  protected readonly loading = signal(true);
  protected readonly holding = signal(false);
  protected readonly trip = signal<Trip | null>(null);
  protected readonly operatorName = signal('');
  protected readonly operatorLogoUrl = signal<string | null>(null);
  protected readonly departureTerminalName = signal('');
  protected readonly arrivalTerminalName = signal('');
  protected readonly selectedSeatIds = signal<string[]>([]);
  protected readonly backQueryParams = this.route.snapshot.queryParams;

  protected readonly selectedFareTotal = computed(() => {
    const trip = this.trip();
    if (!trip) return 0;
    return this.selectedSeatIds().reduce(
      (sum, id) => sum + (trip.tripSeats.find((s) => s.id === id)?.fare ?? 0),
      0,
    );
  });

  protected readonly selectedSeats = computed(() => {
    const trip = this.trip();
    if (!trip) return [] as TripSeat[];
    return this.selectedSeatIds()
      .map((id) => trip.tripSeats.find((s) => s.id === id))
      .filter((seat): seat is TripSeat => !!seat);
  });

  ngOnInit(): void {
    const tripId = this.route.snapshot.paramMap.get('tripId');
    if (!tripId) {
      this.loading.set(false);
      return;
    }

    // history.state (not Router.getCurrentNavigation(), which is only non-null DURING
    // navigation) carries whatever `state` object SearchResultsComponent.selectTrip passed —
    // this is the fast path that avoids three extra lookups just to render the header.
    const fastState = history.state as FastNavState;
    const hasFastState = !!fastState?.searchResult && fastState.searchResult.tripId === tripId;

    if (hasFastState) {
      const result = fastState.searchResult!;
      this.operatorName.set(result.busOperatorName);
      this.operatorLogoUrl.set(this.api.resolveAssetUrl(result.busOperatorLogoUrl));
      this.departureTerminalName.set(result.departureTerminalName);
      this.arrivalTerminalName.set(result.arrivalTerminalName);
    }

    this.loadTrip(tripId, !hasFastState);
  }

  isSelected(seat: TripSeat): boolean {
    return this.selectedSeatIds().includes(seat.id);
  }

  toggleSeatById(seatId: string): void {
    const seat = this.trip()?.tripSeats.find((s) => s.id === seatId);
    if (seat) this.toggleSeat(seat);
  }

  toggleSeat(seat: TripSeat): void {
    if (seat.status !== 'Available' && !this.isSelected(seat)) return;
    this.selectedSeatIds.update((ids) =>
      ids.includes(seat.id) ? ids.filter((id) => id !== seat.id) : [...ids, seat.id],
    );
  }

  holdSeats(): void {
    const trip = this.trip();
    const seatIds = this.selectedSeatIds();
    if (!trip || seatIds.length === 0) return;

    // Browsing/selecting seats is public; actually holding one is the "book" action, which
    // requires an account. Catching this here (rather than letting the backend's 401 bounce
    // through ErrorInterceptor) avoids a confusing "session expired" toast for someone who was
    // never logged in, and sends them back to this exact trip after they log in.
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Please log in to hold your seats and continue booking.');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.holding.set(true);
    this.searchApi.holdSeats({ tripId: trip.id, tripSeatIds: seatIds }).subscribe({
      next: (hold) => {
        this.holding.set(false);
        this.router.navigate(['/my-bookings/checkout/start'], {
          queryParams: { holdToken: hold.holdToken },
        });
      },
      error: () => {
        this.holding.set(false);
        // ErrorInterceptor already toasted the backend's message (e.g. which seat numbers
        // were just taken) — refresh the seat map so the grid matches reality again.
        this.selectedSeatIds.set([]);
        this.loadTrip(trip.id, false);
      },
    });
  }

  private loadTrip(tripId: string, needsHeaderNames: boolean): void {
    this.loading.set(true);
    if (needsHeaderNames) {
      this.searchApi.loadTripHeaderContext(tripId).subscribe({
        next: (ctx) => {
          this.trip.set(ctx.trip);
          this.operatorName.set(ctx.operatorName);
          this.operatorLogoUrl.set(this.api.resolveAssetUrl(ctx.operatorLogoUrl));
          this.departureTerminalName.set(ctx.departureTerminalName);
          this.arrivalTerminalName.set(ctx.arrivalTerminalName);
          this.loading.set(false);
        },
        error: () => {
          this.trip.set(null);
          this.loading.set(false);
        },
      });
    } else {
      this.searchApi.getTrip(tripId).subscribe({
        next: (trip) => {
          this.trip.set(trip);
          this.loading.set(false);
        },
        error: () => {
          this.trip.set(null);
          this.loading.set(false);
        },
      });
    }
  }
}

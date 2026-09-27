import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';
import { toLocalDateValue } from '../../../core/utils/utc';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent } from '../../../shared/ui';
import { BusSeatCell, BusSeatLayoutComponent } from '../../../shared/bus-seat-layout/bus-seat-layout.component';
import { BrowseApiService, BrowseBus } from '../services/browse-api.service';

@Component({
  selector: 'tp-bus-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, BusSeatLayoutComponent, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent],
  template: `
    <div class="tp-page tp-bus-detail">
      <a routerLink="/buses" class="tp-back-link">← All buses</a>

      @if (loading()) {
        <div class="tp-bus-detail__center"><tp-spinner /></div>
      } @else if (error()) {
        <tp-empty-state title="Bus not available" [message]="error()">
          <a routerLink="/buses"><button tpButton variant="secondary" type="button">Back to buses</button></a>
        </tp-empty-state>
      } @else if (bus(); as b) {
        <div class="tp-bus-detail__layout">
          <div class="tp-bus-detail__main">
            <tp-card>
              @if (imageUrl(); as src) { <img class="tp-bus-detail__photo" [src]="src" [alt]="title()" /> }
              <div class="tp-bus-detail__heading">
                <div>
                  <h2>{{ title() }}</h2>
                  <p class="tp-muted">Coach {{ b.coachNumber }} · {{ b.registrationNumber }}</p>
                </div>
                <span class="tp-bus-detail__type">{{ b.busType }}</span>
              </div>
              <dl>
                <div><dt>Seats</dt><dd>{{ b.totalSeats }}</dd></div>
                @if (b.manufactureYear) { <div><dt>Manufactured</dt><dd>{{ b.manufactureYear }}</dd></div> }
                <div><dt>Wi-Fi</dt><dd>{{ b.hasWifi ? 'Yes' : 'No' }}</dd></div>
                <div><dt>Toilet</dt><dd>{{ b.hasToilet ? 'Yes' : 'No' }}</dd></div>
                <div><dt>Upcoming trips</dt><dd>{{ b.upcomingTripCount }}</dd></div>
              </dl>
              @if (b.amenities.length) {
                <div class="tp-bus-detail__chips">
                  @for (a of b.amenities; track a) { <span>{{ a }}</span> }
                </div>
              }
            </tp-card>

            <tp-card>
              <h3>Seat map · next trip</h3>
              <p class="tp-muted">Live availability for trip {{ b.tripCode }}. Pick your seats on the next screen.</p>
              @if (seatCells().length === 0) {
                <p class="tp-muted">Seat layout is not available for this bus.</p>
              } @else {
                <p class="tp-bus-detail__counts tp-muted">
                  {{ b.availableSeats }} available · {{ b.heldSeats }} held · {{ b.bookedSeats }} booked{{ b.blockedSeats > 0 ? ' · ' + b.blockedSeats + ' blocked' : '' }}
                </p>
                <tp-bus-seat-layout [seats]="seatCells()" [currency]="b.currency" [readOnly]="true" />
              }
            </tp-card>
          </div>

          <aside>
            <tp-card class="tp-bus-detail__trip">
              <p class="tp-muted">Next departure</p>
              <h3>{{ b.departureCity || b.departureTerminalName }} → {{ b.arrivalCity || b.arrivalTerminalName }}</h3>
              <dl>
                <div><dt>Departs</dt><dd>{{ b.departureTimeUtc | date: 'EEE, d MMM · h:mm a' }}</dd></div>
                <div><dt>Arrives</dt><dd>{{ b.arrivalTimeUtc | date: 'EEE, d MMM · h:mm a' }}</dd></div>
                <div><dt>Duration</dt><dd>{{ b.duration }}</dd></div>
                @if (b.reportingTimeUtc) { <div><dt>Report by</dt><dd>{{ b.reportingTimeUtc | date: 'h:mm a' }}</dd></div> }
                <div><dt>From</dt><dd>{{ b.departureTerminalName }}</dd></div>
                <div><dt>To</dt><dd>{{ b.arrivalTerminalName }}</dd></div>
              </dl>
              <p class="tp-bus-detail__fare">{{ b.currency }} {{ b.baseFare | number: '1.0-0' }} <span class="tp-muted">per seat</span></p>
              <a [routerLink]="['/search/trip', b.tripId]" [queryParams]="tripQuery()">
                <button tpButton variant="primary" type="button" class="tp-bus-detail__cta">Select seats</button>
              </a>
            </tp-card>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .tp-bus-detail { display: flex; flex-direction: column; gap: var(--tp-space-4); padding-top: var(--tp-space-6); }
    .tp-back-link { color: var(--tp-text-muted); text-decoration: none; font-weight: 600; }
    .tp-bus-detail__center { display: flex; justify-content: center; padding: var(--tp-space-6); }
    .tp-bus-detail__layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: var(--tp-space-4); align-items: start; }
    .tp-bus-detail__main { display: flex; flex-direction: column; gap: var(--tp-space-4); }
    .tp-bus-detail__photo { width: 100%; max-height: 280px; object-fit: cover; border-radius: var(--tp-radius-md); margin-bottom: var(--tp-space-3); }
    .tp-bus-detail__heading { display: flex; justify-content: space-between; gap: var(--tp-space-3); align-items: start; }
    h2, h3 { font-family: var(--tp-font-heading); margin: 0; }
    .tp-bus-detail__heading p { margin: var(--tp-space-1) 0 0; }
    .tp-bus-detail__type { border-radius: var(--tp-radius-pill); padding: 4px 10px; font-size: 12px; font-weight: 700; background: var(--tp-yellow-tint); color: var(--tp-text-on-yellow); }
    dl { margin: var(--tp-space-3) 0 0; display: grid; gap: var(--tp-space-2); }
    dl div { display: flex; justify-content: space-between; gap: var(--tp-space-4); }
    dt { color: var(--tp-text-muted); } dd { margin: 0; font-weight: 600; text-align: right; }
    .tp-bus-detail__chips { display: flex; flex-wrap: wrap; gap: var(--tp-space-1); margin-top: var(--tp-space-3); }
    .tp-bus-detail__chips span { font-size: 12px; padding: 3px 9px; border-radius: var(--tp-radius-pill); background: var(--tp-surface-alt); color: var(--tp-text-muted); }
    .tp-bus-detail__fare { font-size: 22px; font-weight: 800; margin: var(--tp-space-4) 0 var(--tp-space-3); }
    .tp-bus-detail__cta { width: 100%; }
    .tp-bus-detail__counts { margin: var(--tp-space-1) 0 var(--tp-space-4); font-size: 13px; text-align: center; }
    @media (max-width: 860px) { .tp-bus-detail__layout { grid-template-columns: 1fr; } }
  `],
})
export class BusDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly browseApi = inject(BrowseApiService);
  private readonly api = inject(ApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly bus = signal<BrowseBus | null>(null);

  protected readonly title = computed(() => {
    const b = this.bus();
    if (!b) return '';
    return [b.brand, b.model].filter(Boolean).join(' ').trim() || b.coachNumber;
  });
  protected readonly imageUrl = computed(() => this.api.resolveAssetUrl(this.bus()?.primaryImageUrl));

  /** The bus page only shows availability; the drawing itself lives in the shared bus layout. */
  protected readonly seatCells = computed<BusSeatCell[]>(() =>
    (this.bus()?.seats ?? [])
      .filter((s) => s.isActive)
      .map((s) => ({
        id: s.tripSeatId,
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        fare: s.fare,
        status: s.status,
        rowNumber: s.rowNumber,
        columnNumber: s.columnNumber,
        deckLevel: s.deckLevel,
        isWindow: s.isWindow,
      })),
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('busId');
    if (!id) {
      this.error.set('No bus selected.');
      this.loading.set(false);
      return;
    }
    this.browseApi.bus(id).subscribe({
      next: (bus) => {
        this.bus.set(bus);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.status === 404 ? 'This bus is inactive or has no upcoming bookable trip.' : err.message || 'Could not load this bus.');
        this.loading.set(false);
      },
    });
  }

  protected tripQuery(): Record<string, string> {
    const b = this.bus();
    const query: Record<string, string> = {};
    if (!b) return query;
    if (b.departureTerminalId) query['fromTerminalId'] = b.departureTerminalId;
    if (b.arrivalTerminalId) query['toTerminalId'] = b.arrivalTerminalId;
    query['date'] = toLocalDateValue(b.departureTimeUtc);
    return query;
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Terminal, TripSearchResult } from '@ticketportal-mono/models';
import type { BusType } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';
import {
  TpButtonDirective,
  TpCardComponent,
  TpEmptyStateComponent,
  TpSpinnerComponent,
} from '../../../shared/ui';
import { SearchApiService } from '../services/search-api.service';

type SortMode = 'departure' | 'price';
type TimeSlotKey = 'earlyMorning' | 'morning' | 'afternoon' | 'evening';

function slotForTime(isoUtc: string): TimeSlotKey {
  const hour = new Date(isoUtc).getHours();
  if (hour < 6) return 'earlyMorning';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Piece 2 — results list. The URL's query params (fromTerminalId/toTerminalId/date) are the
 * source of truth for what was searched, not component state, so this page works from a
 * refresh, a shared link, or the browser back button, and the small "edit search" bar re-runs
 * the search in place instead of bouncing back to the home screen.
 */
@Component({
  selector: 'tp-search-results',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TpCardComponent,
    TpButtonDirective,
    TpEmptyStateComponent,
    TpSpinnerComponent,
  ],
  template: `
    <div class="tp-page tp-search-results">
      <tp-card class="tp-edit-search">
        <form [formGroup]="form" (ngSubmit)="editSearch()" class="tp-edit-search-form">
          <label class="tp-field">
            <span>From</span>
            <select formControlName="fromTerminalId">
              @for (t of terminals(); track t.id) {
                <option [value]="t.id">{{ t.name }} — {{ t.city }}</option>
              }
            </select>
          </label>
          <label class="tp-field">
            <span>To</span>
            <select formControlName="toTerminalId">
              @for (t of terminals(); track t.id) {
                <option [value]="t.id">{{ t.name }} — {{ t.city }}</option>
              }
            </select>
          </label>
          <label class="tp-field">
            <span>Date</span>
            <input type="date" formControlName="date" />
          </label>
          <button tpButton variant="secondary" type="submit" [disabled]="form.invalid">
            Update Search
          </button>
        </form>
      </tp-card>

      @if (loading()) {
        <tp-spinner />
      } @else if (!searched()) {
        <tp-empty-state
          title="Start a search"
          message="Pick a from/to terminal and a date above to see available buses."
        />
      } @else if (results().length === 0) {
        <tp-empty-state
          title="No buses found"
          message="No trips matched that route and date. Try a nearby date or a different terminal."
        />
      } @else {
        <div class="tp-results-layout">
          <aside class="tp-filters">
            <div class="tp-filters__head">
              <h4>Filters</h4>
              <button type="button" class="tp-filters__reset" (click)="resetFilters()">Reset</button>
            </div>

            <div class="tp-filter-group">
              <h5>Bus Type</h5>
              @for (bt of busTypeOptions(); track bt) {
                <label class="tp-filter-check">
                  <input type="checkbox" [checked]="isBusTypeSelected(bt)" (change)="toggleBusType(bt)" />
                  {{ busTypeLabel(bt) }}
                </label>
              }
            </div>

            <div class="tp-filter-group">
              <h5>Operator</h5>
              @for (op of operatorOptions(); track op) {
                <label class="tp-filter-check">
                  <input type="checkbox" [checked]="isOperatorSelected(op)" (change)="toggleOperator(op)" />
                  {{ op }}
                </label>
              }
            </div>

            <div class="tp-filter-group">
              <h5>Departure Time</h5>
              @for (slot of timeSlots; track slot.key) {
                <label class="tp-filter-check tp-filter-check--sm">
                  <input type="checkbox" [checked]="isSlotSelected('departure', slot.key)" (change)="toggleSlot('departure', slot.key)" />
                  {{ slot.label }} <span class="tp-muted">({{ slot.range }})</span>
                </label>
              }
            </div>

            <div class="tp-filter-group">
              <h5>Arrival Time</h5>
              @for (slot of timeSlots; track slot.key) {
                <label class="tp-filter-check tp-filter-check--sm">
                  <input type="checkbox" [checked]="isSlotSelected('arrival', slot.key)" (change)="toggleSlot('arrival', slot.key)" />
                  {{ slot.label }} <span class="tp-muted">({{ slot.range }})</span>
                </label>
              }
            </div>
          </aside>

          <div class="tp-results-main">
            <div class="tp-results-toolbar">
              <p class="tp-muted">{{ filteredResults().length }} bus(es) found</p>
              <label class="tp-sort-field">
                Sort by
                <select [value]="sortBy()" (change)="setSort($any($event.target).value)">
                  <option value="departure">Departure time</option>
                  <option value="price">Lowest fare</option>
                </select>
              </label>
            </div>

            @if (filteredResults().length === 0) {
              <tp-empty-state title="No buses match your filters" message="Try clearing a filter above." />
            }

            <div class="tp-trip-list">
              @for (trip of filteredResults(); track trip.tripId) {
                <tp-card class="tp-trip-card" [hoverable]="true">
                  <div class="tp-trip-card__cover">
                    @if (coverUrl(trip); as cover) {
                      <img [src]="cover" [alt]="trip.busOperatorName" loading="lazy" />
                    } @else {
                      <span aria-hidden="true">🚌</span>
                    }
                  </div>

                  <div class="tp-trip-card__main">
                    <div class="tp-trip-card__operator">
                      @if (logoUrl(trip); as logo) {
                        <img [src]="logo" [alt]="trip.busOperatorName" class="tp-trip-card__logo" />
                      }
                      <div>
                        <div class="tp-trip-card__operator-name">{{ trip.busOperatorName }}</div>
                        <div class="tp-muted tp-trip-card__bus">
                          {{ busTypeLabel(trip.busType) }} @if (trip.busModel) {, {{ trip.busModel }}}
                        </div>
                      </div>
                    </div>

                    <div class="tp-trip-card__route">
                      <div class="tp-trip-card__time-block">
                        <span class="tp-trip-card__time">{{ trip.departureTimeUtc | date: 'h:mm a' }}</span>
                        <span class="tp-muted">{{ trip.departureTerminalName }}</span>
                      </div>
                      <div class="tp-trip-card__duration">
                        <span class="tp-muted">{{ durationLabel(trip) }}</span>
                        <div class="tp-trip-card__line"></div>
                      </div>
                      <div class="tp-trip-card__time-block">
                        <span class="tp-trip-card__time">{{ trip.arrivalTimeUtc | date: 'h:mm a' }}</span>
                        <span class="tp-muted">{{ trip.arrivalTerminalName }}</span>
                      </div>
                    </div>

                    <div class="tp-trip-card__amenities">
                      @if (trip.hasWifi) {
                        <span class="tp-chip">Wifi</span>
                      }
                      @if (trip.hasToilet) {
                        <span class="tp-chip">Toilet</span>
                      }
                      @if (trip.isWheelchairAccessible) {
                        <span class="tp-chip">Wheelchair accessible</span>
                      }
                    </div>
                  </div>

                  <div class="tp-trip-card__side">
                    <div class="tp-trip-card__fare">
                      @if (trip.lowestAvailableFare !== null) {
                        <span class="tp-trip-card__price">{{ trip.currency }} {{ trip.lowestAvailableFare }}</span>
                      } @else {
                        <span class="tp-muted">Sold out</span>
                      }
                      <span class="tp-muted">{{ trip.availableSeatCount }} / {{ trip.totalSeatCount }} seats left</span>
                    </div>
                    <button
                      tpButton
                      variant="primary"
                      [disabled]="trip.availableSeatCount === 0"
                      (click)="selectTrip(trip)"
                    >
                      Select Seats
                    </button>
                  </div>
                </tp-card>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tp-search-results {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding-top: 24px;
      }

      .tp-edit-search-form {
        display: grid;
        grid-template-columns: 1fr 1fr auto auto;
        gap: 12px;
        align-items: end;
      }

      .tp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-field select,
      .tp-field input {
        border: 1px solid var(--tp-border);
        border-radius: 8px;
        padding: 9px 10px;
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
        background: var(--tp-surface);
      }

      .tp-results-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .tp-sort-field {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--tp-text-muted);
      }

      .tp-sort-field select {
        border: 1px solid var(--tp-border);
        border-radius: 8px;
        padding: 6px 8px;
        font-size: 13px;
      }

      .tp-trip-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .tp-trip-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }

      .tp-trip-card__main {
        display: flex;
        align-items: center;
        gap: 28px;
        flex-wrap: wrap;
        flex: 1;
      }

      .tp-trip-card__operator {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 160px;
      }

      .tp-trip-card__logo {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        object-fit: cover;
      }

      .tp-trip-card__operator-name {
        font-weight: 600;
      }

      .tp-trip-card__bus {
        font-size: 12px;
      }

      .tp-trip-card__route {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .tp-trip-card__time-block {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .tp-trip-card__time {
        font-weight: 700;
        font-size: 16px;
      }

      .tp-trip-card__duration {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        min-width: 80px;
      }

      .tp-trip-card__line {
        width: 100%;
        height: 1px;
        background: var(--tp-border);
      }

      .tp-trip-card__amenities {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .tp-chip {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 999px;
        background: var(--tp-surface-alt);
        color: var(--tp-text-muted);
      }

      .tp-trip-card__side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
      }

      .tp-trip-card__fare {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }

      .tp-trip-card__price {
        font-weight: 700;
        font-size: 18px;
        color: var(--tp-text);
      }

      .tp-results-layout {
        display: flex;
        align-items: flex-start;
        gap: 20px;
      }

      .tp-filters {
        width: 230px;
        flex-shrink: 0;
        background: var(--tp-surface);
        border: 1px solid var(--tp-border);
        border-radius: 10px;
        padding: 14px;
        position: sticky;
        top: 12px;
      }

      .tp-filters__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .tp-filters__head h4 {
        margin: 0;
        font-size: 14px;
      }

      .tp-filters__reset {
        background: none;
        border: none;
        color: var(--tp-yellow-dark);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
      }

      .tp-filter-group {
        padding: 10px 0;
        border-top: 1px solid var(--tp-border);
      }

      .tp-filter-group:first-of-type {
        border-top: none;
      }

      .tp-filter-group h5 {
        margin: 0 0 6px;
        font-size: 11px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--tp-text-muted);
      }

      .tp-filter-check {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        padding: 3px 0;
        cursor: pointer;
      }

      .tp-filter-check--sm {
        font-size: 12px;
      }

      .tp-filter-check input {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }

      .tp-results-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .tp-trip-card__cover {
        width: 88px;
        height: 64px;
        border-radius: 8px;
        overflow: hidden;
        flex-shrink: 0;
        background: var(--tp-surface-alt);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }

      .tp-trip-card__cover img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      @media (max-width: 900px) {
        .tp-results-layout {
          flex-direction: column;
        }

        .tp-filters {
          width: 100%;
          position: static;
        }
      }

      @media (max-width: 760px) {
        .tp-edit-search-form {
          grid-template-columns: 1fr;
        }

        .tp-trip-card {
          flex-direction: column;
          align-items: stretch;
        }

        .tp-trip-card__side {
          align-items: stretch;
        }
      }
    `,
  ],
})
export class SearchResultsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly searchApi = inject(SearchApiService);

  protected readonly terminals = signal<Terminal[]>([]);
  protected readonly results = signal<TripSearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly sortBy = signal<SortMode>('departure');

  // Filters sidebar state. Options (busTypeOptions/operatorOptions) are derived from whatever
  // came back for this search, not a fixed global list — no point offering "Sleeper" as a
  // filter when nothing in today's results is a Sleeper.
  protected readonly timeSlots: { key: TimeSlotKey; label: string; range: string }[] = [
    { key: 'earlyMorning', label: 'Early Morning', range: 'before 6 AM' },
    { key: 'morning', label: 'Morning', range: '6 AM–12 PM' },
    { key: 'afternoon', label: 'Afternoon', range: '12 PM–6 PM' },
    { key: 'evening', label: 'Evening', range: 'after 6 PM' },
  ];

  protected readonly selectedBusTypes = signal<Set<BusType>>(new Set());
  protected readonly selectedOperators = signal<Set<string>>(new Set());
  protected readonly selectedDepartureSlots = signal<Set<TimeSlotKey>>(new Set());
  protected readonly selectedArrivalSlots = signal<Set<TimeSlotKey>>(new Set());

  protected readonly busTypeOptions = computed(() => {
    const set = new Set<BusType>();
    for (const r of this.results()) set.add(r.busType);
    return Array.from(set).sort();
  });

  protected readonly operatorOptions = computed(() => {
    const set = new Set<string>();
    for (const r of this.results()) set.add(r.busOperatorName);
    return Array.from(set).sort();
  });

  protected readonly form = this.fb.nonNullable.group({
    fromTerminalId: ['', Validators.required],
    toTerminalId: ['', Validators.required],
    date: ['', Validators.required],
  });

  ngOnInit(): void {
    this.searchApi.terminals().subscribe((terminals) => this.terminals.set(terminals));

    this.route.queryParamMap.subscribe((params) => {
      const fromTerminalId = params.get('fromTerminalId') ?? '';
      const toTerminalId = params.get('toTerminalId') ?? '';
      const date = params.get('date') ?? '';
      this.form.patchValue({ fromTerminalId, toTerminalId, date }, { emitEvent: false });

      if (fromTerminalId && toTerminalId && date) {
        this.runSearch(fromTerminalId, toTerminalId, date);
      } else {
        this.searched.set(false);
        this.results.set([]);
      }
    });
  }

  protected filteredResults(): TripSearchResult[] {
    const busTypes = this.selectedBusTypes();
    const operators = this.selectedOperators();
    const depSlots = this.selectedDepartureSlots();
    const arrSlots = this.selectedArrivalSlots();

    const items = this.results().filter((r) => {
      if (busTypes.size > 0 && !busTypes.has(r.busType)) return false;
      if (operators.size > 0 && !operators.has(r.busOperatorName)) return false;
      if (depSlots.size > 0 && !depSlots.has(slotForTime(r.departureTimeUtc))) return false;
      if (arrSlots.size > 0 && !arrSlots.has(slotForTime(r.arrivalTimeUtc))) return false;
      return true;
    });

    if (this.sortBy() === 'price') {
      items.sort((a, b) => (a.lowestAvailableFare ?? Infinity) - (b.lowestAvailableFare ?? Infinity));
    } else {
      items.sort((a, b) => new Date(a.departureTimeUtc).getTime() - new Date(b.departureTimeUtc).getTime());
    }
    return items;
  }

  protected isBusTypeSelected(bt: BusType): boolean {
    return this.selectedBusTypes().has(bt);
  }

  protected toggleBusType(bt: BusType): void {
    const next = new Set(this.selectedBusTypes());
    if (next.has(bt)) next.delete(bt);
    else next.add(bt);
    this.selectedBusTypes.set(next);
  }

  protected isOperatorSelected(op: string): boolean {
    return this.selectedOperators().has(op);
  }

  protected toggleOperator(op: string): void {
    const next = new Set(this.selectedOperators());
    if (next.has(op)) next.delete(op);
    else next.add(op);
    this.selectedOperators.set(next);
  }

  protected isSlotSelected(which: 'departure' | 'arrival', slot: TimeSlotKey): boolean {
    return (which === 'departure' ? this.selectedDepartureSlots() : this.selectedArrivalSlots()).has(slot);
  }

  protected toggleSlot(which: 'departure' | 'arrival', slot: TimeSlotKey): void {
    const sig = which === 'departure' ? this.selectedDepartureSlots : this.selectedArrivalSlots;
    const next = new Set(sig());
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    sig.set(next);
  }

  protected resetFilters(): void {
    this.selectedBusTypes.set(new Set());
    this.selectedOperators.set(new Set());
    this.selectedDepartureSlots.set(new Set());
    this.selectedArrivalSlots.set(new Set());
  }

  private static readonly BUS_TYPE_LABELS: Record<BusType, string> = {
    NonAc: 'Non AC',
    Ac: 'AC',
    Sleeper: 'Sleeper',
    DoubleDecker: 'Double Decker',
    BusinessClass: 'Business Class',
    Economy: 'Economy',
    Luxury: 'Luxury',
  };

  protected busTypeLabel(bt: BusType): string {
    return SearchResultsComponent.BUS_TYPE_LABELS[bt] ?? bt;
  }

  protected coverUrl(trip: TripSearchResult): string | null {
    return this.api.resolveAssetUrl(trip.coverImageUrl);
  }

  protected setSort(value: SortMode): void {
    this.sortBy.set(value);
  }

  protected logoUrl(trip: TripSearchResult): string | null {
    return this.api.resolveAssetUrl(trip.busOperatorLogoUrl);
  }

  protected durationLabel(trip: TripSearchResult): string {
    const ms = new Date(trip.arrivalTimeUtc).getTime() - new Date(trip.departureTimeUtc).getTime();
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  editSearch(): void {
    if (this.form.invalid) return;
    const { fromTerminalId, toTerminalId, date } = this.form.getRawValue();
    this.router.navigate(['/search/results'], { queryParams: { fromTerminalId, toTerminalId, date } });
  }

  selectTrip(trip: TripSearchResult): void {
    this.router.navigate(['/search/trip', trip.tripId], {
      state: { searchResult: trip },
      queryParams: this.route.snapshot.queryParams,
    });
  }

  private runSearch(fromTerminalId: string, toTerminalId: string, date: string): void {
    this.loading.set(true);
    this.resetFilters(); // a fresh search shouldn't inherit filters picked for the previous one
    this.searchApi.searchTrips({ fromTerminalId, toTerminalId, date }).subscribe({
      next: (results) => {
        this.results.set(results);
        this.loading.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
        this.searched.set(true);
      },
    });
  }
}

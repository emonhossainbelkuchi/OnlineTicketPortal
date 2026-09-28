import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';
import { toLocalDateValue } from '../../../core/utils/utc';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent } from '../../../shared/ui';
import { BrowseApiService, BrowseBus, BrowseTerminal } from '../services/browse-api.service';

// Same labels used by the Search Trips results filters (search-results.component.ts) - keeping
// this map identical there and here is what makes "AC" mean the same checkbox in both places.
const BUS_TYPE_LABELS: Record<string, string> = {
  NonAc: 'Non AC',
  Ac: 'AC',
  Sleeper: 'Sleeper',
  DoubleDecker: 'Double Decker',
  BusinessClass: 'Business Class',
  Economy: 'Economy',
  Luxury: 'Luxury',
};

// Same shift buckets and slotting rule as Search Trips results (search-results.component.ts).
type TimeSlotKey = 'night' | 'morning' | 'afternoon' | 'evening';
const TIME_SLOTS: { key: TimeSlotKey; label: string; range: string }[] = [
  { key: 'night', label: 'Night', range: '12 AM–6 AM' },
  { key: 'morning', label: 'Morning', range: '6 AM–12 PM' },
  { key: 'afternoon', label: 'Mid-day', range: '12 PM–4 PM' },
  { key: 'evening', label: 'Evening/Night', range: 'after 4 PM' },
];
function slotForTime(isoUtc: string): TimeSlotKey {
  const hour = new Date(isoUtc).getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 16) return 'afternoon';
  return 'evening';
}

@Component({
  selector: 'tp-bus-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, MatFormFieldModule, MatSelectModule],
  template: `
    <div class="tp-page tp-bus-list">
      <header class="tp-bus-list__header">
        <h2>Browse buses</h2>
        <p class="tp-muted">Every coach with an upcoming trip and free seats, across all operators. Looking for a specific route? <a routerLink="/search">Search trips</a>.</p>
      </header>

      <tp-card>
        <form class="tp-bus-list__filters" [formGroup]="filters" (ngSubmit)="load()">
          <label>From
            <select formControlName="from">
              <option value="">Anywhere</option>
              @for (t of departureTerminals(); track t.id) { <option [value]="t.id">{{ t.name }}{{ t.city ? ', ' + t.city : '' }}</option> }
            </select>
          </label>
          <label>To
            <select formControlName="to">
              <option value="">Anywhere</option>
              @for (t of arrivalTerminals(); track t.id) { <option [value]="t.id">{{ t.name }}{{ t.city ? ', ' + t.city : '' }}</option> }
            </select>
          </label>
          <label>Date
            <input type="date" formControlName="date" />
          </label>
          <div class="tp-bus-list__actions">
            <button tpButton variant="primary" type="submit" [disabled]="loading()">Show buses</button>
            <button tpButton variant="ghost" type="button" (click)="clear()">Clear</button>
          </div>
        </form>
      </tp-card>

      @if (loading()) {
        <div class="tp-bus-list__center"><tp-spinner /></div>
      } @else if (error()) {
        <tp-card><p class="tp-error-text">{{ error() }}</p></tp-card>
      } @else if (buses().length === 0) {
        <tp-empty-state title="No buses match" message="Try another date or clear the filters." />
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
              <mat-form-field appearance="outline" class="tp-filter-select">
                <mat-label>Any operator</mat-label>
                <mat-select multiple [value]="selectedOperatorsArray()" (selectionChange)="onOperatorSelectionChange($event.value)">
                  @for (op of operatorOptions(); track op) {
                    <mat-option [value]="op">{{ op }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="tp-filter-group">
              <h5>Departure Time</h5>
              @for (slot of timeSlots; track slot.key) {
                <label class="tp-filter-check">
                  <input type="checkbox" [checked]="isDepartureSlotSelected(slot.key)" (change)="toggleDepartureSlot(slot.key)" />
                  {{ slot.label }} <span class="tp-muted">({{ slot.range }})</span>
                </label>
              }
            </div>
          </aside>

          <div class="tp-results-main">
            <p class="tp-muted">{{ filteredBuses().length }} bus{{ filteredBuses().length === 1 ? '' : 'es' }} with seats available</p>

            @if (filteredBuses().length === 0) {
              <tp-empty-state title="No buses match your filters" message="Try clearing a filter above." />
            }

            <div class="tp-trip-list">
              @for (bus of filteredBuses(); track bus.id) {
                <tp-card class="tp-trip-card" [hoverable]="true">
                  <div class="tp-trip-card__cover">
                    @if (imageUrl(bus); as src) {
                      <img [src]="src" [alt]="title(bus)" loading="lazy" />
                    } @else {
                      <span aria-hidden="true">🚌</span>
                    }
                  </div>

                  <div class="tp-trip-card__main">
                    <div class="tp-trip-card__operator">
                      <div>
                        <div class="tp-trip-card__operator-name">{{ bus.busOperatorName || title(bus) }}</div>
                        <div class="tp-muted tp-trip-card__bus">
                          {{ busTypeLabel(bus.busType) }}{{ title(bus) !== (bus.busOperatorName || title(bus)) ? ', ' + title(bus) : '' }}
                        </div>
                      </div>
                    </div>

                    <div class="tp-trip-card__route">
                      <div class="tp-trip-card__time-block">
                        <span class="tp-trip-card__time">{{ bus.departureTimeUtc | date: 'h:mm a' }}</span>
                        <span class="tp-muted">{{ bus.departureCity || bus.departureTerminalName }}</span>
                      </div>
                      <div class="tp-trip-card__duration">
                        <span class="tp-muted">{{ bus.duration }}</span>
                        <div class="tp-trip-card__line"></div>
                      </div>
                      <div class="tp-trip-card__time-block">
                        <span class="tp-trip-card__time">{{ bus.arrivalTimeUtc | date: 'h:mm a' }}</span>
                        <span class="tp-muted">{{ bus.arrivalCity || bus.arrivalTerminalName }}</span>
                      </div>
                    </div>

                    <div class="tp-trip-card__amenities">
                      @if (bus.hasWifi) { <span class="tp-chip">Wi-Fi</span> }
                      @if (bus.hasToilet) { <span class="tp-chip">Toilet</span> }
                      @for (a of bus.amenities.slice(0, 3); track a) { <span class="tp-chip">{{ a }}</span> }
                    </div>
                  </div>

                  <div class="tp-trip-card__side">
                    <div class="tp-trip-card__fare">
                      <span class="tp-trip-card__price">{{ bus.currency }} {{ bus.baseFare | number: '1.0-0' }}</span>
                      <span class="tp-muted">{{ bus.availableSeats }} of {{ bus.totalSeats }} seats free</span>
                    </div>
                    <div class="tp-bus-card__buttons">
                      <a [routerLink]="['/buses', bus.id]"><button tpButton variant="secondary" size="sm" type="button">Details</button></a>
                      <a [routerLink]="['/search/trip', bus.tripId]" [queryParams]="tripQuery(bus)"><button tpButton variant="primary" size="sm" type="button">Select seats</button></a>
                    </div>
                  </div>
                </tp-card>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tp-bus-list { display: flex; flex-direction: column; gap: var(--tp-space-4); padding-top: var(--tp-space-6); }
    .tp-bus-list__header h2 { margin: 0; font-family: var(--tp-font-heading); }
    .tp-bus-list__header p { margin: var(--tp-space-1) 0 0; }
    .tp-bus-list__filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--tp-space-3); align-items: end; }
    label { display: flex; flex-direction: column; gap: var(--tp-space-1); font-size: 13px; font-weight: 600; color: var(--tp-text-muted); }
    select, input { border: 1px solid var(--tp-border); border-radius: var(--tp-radius-sm); padding: 10px var(--tp-space-3); font: inherit; color: var(--tp-text); background: var(--tp-surface); }
    .tp-bus-list__actions { display: flex; gap: var(--tp-space-2); }
    .tp-bus-list__center { display: flex; justify-content: center; padding: var(--tp-space-6); }
    .tp-error-text { color: var(--tp-danger); margin: 0; }

    /* Same result-list layout/card look as Search Trips results (search-results.component.ts) -
       kept in sync deliberately so the two "find a bus" entry points feel like one product. */
    .tp-results-layout { display: flex; align-items: flex-start; gap: 20px; }

    .tp-filters { width: 230px; flex-shrink: 0; background: var(--tp-surface); border: 1px solid var(--tp-border); border-radius: 10px; padding: 14px; position: sticky; top: 12px; }
    .tp-filters__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .tp-filters__head h4 { margin: 0; font-size: 14px; }
    .tp-filters__reset { background: none; border: none; color: var(--tp-yellow-dark); font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; }
    .tp-filter-group { padding: 10px 0; border-top: 1px solid var(--tp-border); }
    .tp-filter-group:first-of-type { border-top: none; }
    .tp-filter-group h5 { margin: 0 0 6px; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--tp-text-muted); }
    .tp-filter-check { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 3px 0; cursor: pointer; }
    .tp-filter-check input { width: 14px; height: 14px; flex-shrink: 0; }
    .tp-filter-select { width: 100%; }
    .tp-filter-select ::ng-deep .mat-mdc-text-field-wrapper { padding: 0 8px; }
    .tp-filter-select ::ng-deep .mat-mdc-form-field-infix { min-height: 40px; padding-top: 8px; padding-bottom: 8px; }

    .tp-results-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
    .tp-trip-list { display: flex; flex-direction: column; gap: 14px; }

    .tp-trip-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
    .tp-trip-card__cover { width: 88px; height: 64px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--tp-surface-alt); display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .tp-trip-card__cover img { width: 100%; height: 100%; object-fit: cover; }
    .tp-trip-card__main { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; flex: 1; }
    .tp-trip-card__operator { display: flex; align-items: center; gap: 10px; min-width: 160px; }
    .tp-trip-card__operator-name { font-weight: 600; }
    .tp-trip-card__bus { font-size: 12px; }
    .tp-trip-card__route { display: flex; align-items: center; gap: 14px; }
    .tp-trip-card__time-block { display: flex; flex-direction: column; gap: 2px; }
    .tp-trip-card__time { font-weight: 700; font-size: 16px; }
    .tp-trip-card__duration { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; min-width: 80px; }
    .tp-trip-card__line { width: 100%; height: 1px; background: var(--tp-border); }
    .tp-trip-card__amenities { display: flex; gap: 6px; flex-wrap: wrap; }
    .tp-chip { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: var(--tp-surface-alt); color: var(--tp-text-muted); }
    .tp-trip-card__side { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .tp-trip-card__fare { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .tp-trip-card__price { font-weight: 700; font-size: 18px; color: var(--tp-text); }
    .tp-bus-card__buttons { display: flex; gap: var(--tp-space-2); }

    @media (max-width: 900px) {
      .tp-results-layout { flex-direction: column; }
      .tp-filters { width: 100%; position: static; }
    }

    @media (max-width: 760px) {
      .tp-trip-card { flex-direction: column; align-items: stretch; }
      .tp-trip-card__side { align-items: stretch; }
    }
  `],
})
export class BusListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly browseApi = inject(BrowseApiService);
  private readonly api = inject(ApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly buses = signal<BrowseBus[]>([]);
  protected readonly departureTerminals = signal<BrowseTerminal[]>([]);
  protected readonly arrivalTerminals = signal<BrowseTerminal[]>([]);
  protected readonly filters = this.fb.nonNullable.group({ from: [''], to: [''], date: [''] });

  // Filters sidebar state - same shape as Search Trips results (search-results.component.ts):
  // options are derived from whatever this page's own list actually contains, not a fixed
  // global list, so a customer never sees a "Sleeper" checkbox when nothing shown is a Sleeper.
  protected readonly selectedBusTypes = signal<Set<string>>(new Set());
  protected readonly selectedOperators = signal<Set<string>>(new Set());
  protected readonly selectedDepartureSlots = signal<Set<TimeSlotKey>>(new Set());
  protected readonly timeSlots = TIME_SLOTS;

  protected readonly busTypeOptions = computed(() => {
    const set = new Set<string>();
    for (const b of this.buses()) set.add(b.busType);
    return Array.from(set).sort();
  });

  protected readonly operatorOptions = computed(() => {
    const set = new Set<string>();
    for (const b of this.buses()) if (b.busOperatorName) set.add(b.busOperatorName);
    return Array.from(set).sort();
  });

  protected readonly selectedOperatorsArray = computed(() => Array.from(this.selectedOperators()));

  protected readonly filteredBuses = computed(() => {
    const busTypes = this.selectedBusTypes();
    const operators = this.selectedOperators();
    const departureSlots = this.selectedDepartureSlots();
    return this.buses().filter((b) => {
      if (busTypes.size > 0 && !busTypes.has(b.busType)) return false;
      if (operators.size > 0 && !operators.has(b.busOperatorName)) return false;
      if (departureSlots.size > 0 && !departureSlots.has(slotForTime(b.departureTimeUtc))) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.browseApi.terminals().subscribe({
      next: (t) => {
        this.departureTerminals.set(t.departureTerminals);
        this.arrivalTerminals.set(t.arrivalTerminals);
      },
      error: () => undefined, // the filters are optional; the list below still loads
    });
    this.load();
  }

  load(): void {
    const { from, to, date } = this.filters.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.resetFilters(); // a fresh search shouldn't inherit filters picked for the previous one
    this.browseApi.buses({ from: from || undefined, to: to || undefined, date: date || undefined }).subscribe({
      next: (res) => {
        this.buses.set(res.buses);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message || 'Could not load buses.');
        this.loading.set(false);
      },
    });
  }

  clear(): void {
    this.filters.reset({ from: '', to: '', date: '' });
    this.load();
  }

  protected isBusTypeSelected(bt: string): boolean {
    return this.selectedBusTypes().has(bt);
  }

  protected toggleBusType(bt: string): void {
    const next = new Set(this.selectedBusTypes());
    if (next.has(bt)) next.delete(bt);
    else next.add(bt);
    this.selectedBusTypes.set(next);
  }

  protected onOperatorSelectionChange(values: string[]): void {
    this.selectedOperators.set(new Set(values));
  }

  protected isDepartureSlotSelected(slot: TimeSlotKey): boolean {
    return this.selectedDepartureSlots().has(slot);
  }

  protected toggleDepartureSlot(slot: TimeSlotKey): void {
    const next = new Set(this.selectedDepartureSlots());
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    this.selectedDepartureSlots.set(next);
  }

  protected resetFilters(): void {
    this.selectedBusTypes.set(new Set());
    this.selectedOperators.set(new Set());
    this.selectedDepartureSlots.set(new Set());
  }

  protected busTypeLabel(bt: string): string {
    return BUS_TYPE_LABELS[bt] ?? bt;
  }

  protected title(bus: BrowseBus): string {
    const name = [bus.brand, bus.model].filter(Boolean).join(' ').trim();
    return name || bus.coachNumber;
  }

  protected imageUrl(bus: BrowseBus): string | null {
    return this.api.resolveAssetUrl(bus.primaryImageUrl);
  }

  /** Carries the route/date along so the seat-map page's "back to results" link still works. */
  protected tripQuery(bus: BrowseBus): Record<string, string> {
    const query: Record<string, string> = {};
    if (bus.departureTerminalId) query['fromTerminalId'] = bus.departureTerminalId;
    if (bus.arrivalTerminalId) query['toTerminalId'] = bus.arrivalTerminalId;
    query['date'] = toLocalDateValue(bus.departureTimeUtc);
    return query;
  }
}
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';
import { toLocalDateValue } from '../../../core/utils/utc';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent } from '../../../shared/ui';
import { BrowseApiService, BrowseBus, BrowseTerminal } from '../services/browse-api.service';

@Component({
  selector: 'tp-bus-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent],
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
        <p class="tp-muted">{{ buses().length }} bus{{ buses().length === 1 ? '' : 'es' }} with seats available</p>
        <div class="tp-bus-list__grid">
          @for (bus of buses(); track bus.id) {
            <tp-card [hoverable]="true" class="tp-bus-card">
              <div class="tp-bus-card__image">
                @if (imageUrl(bus); as src) {
                  <img [src]="src" [alt]="title(bus)" loading="lazy" />
                } @else {
                  <span class="tp-bus-card__placeholder" aria-hidden="true">🚌</span>
                }
              </div>
              <div class="tp-bus-card__body">
                <div class="tp-bus-card__top">
                  <h3>{{ title(bus) }}</h3>
                  <span class="tp-bus-card__type">{{ bus.busType }}</span>
                </div>
                <p class="tp-bus-card__route">{{ bus.departureCity || bus.departureTerminalName }} → {{ bus.arrivalCity || bus.arrivalTerminalName }}</p>
                <p class="tp-muted tp-bus-card__time">
                  {{ bus.departureTimeUtc | date: 'EEE, d MMM · h:mm a' }} · {{ bus.duration }}
                </p>
                <div class="tp-bus-card__chips">
                  @if (bus.hasWifi) { <span>Wi-Fi</span> }
                  @if (bus.hasToilet) { <span>Toilet</span> }
                  @for (a of bus.amenities.slice(0, 3); track a) { <span>{{ a }}</span> }
                </div>
                <div class="tp-bus-card__foot">
                  <div>
                    <strong>{{ bus.currency }} {{ bus.baseFare | number: '1.0-0' }}</strong>
                    <span class="tp-muted"> · {{ bus.availableSeats }} of {{ bus.totalSeats }} seats free</span>
                  </div>
                  <div class="tp-bus-card__buttons">
                    <a [routerLink]="['/buses', bus.id]"><button tpButton variant="secondary" size="sm" type="button">Details</button></a>
                    <a [routerLink]="['/search/trip', bus.tripId]" [queryParams]="tripQuery(bus)"><button tpButton variant="primary" size="sm" type="button">Select seats</button></a>
                  </div>
                </div>
              </div>
            </tp-card>
          }
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
    .tp-bus-list__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--tp-space-4); }
    .tp-bus-card { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
    .tp-bus-card__image { height: 150px; background: var(--tp-surface-alt); display: flex; align-items: center; justify-content: center; }
    .tp-bus-card__image img { width: 100%; height: 100%; object-fit: cover; }
    .tp-bus-card__placeholder { font-size: 48px; }
    .tp-bus-card__body { padding: var(--tp-space-4); display: flex; flex-direction: column; gap: var(--tp-space-2); flex: 1; }
    .tp-bus-card__top { display: flex; align-items: start; justify-content: space-between; gap: var(--tp-space-2); }
    .tp-bus-card__top h3 { margin: 0; font-family: var(--tp-font-heading); font-size: 17px; }
    .tp-bus-card__type { border-radius: var(--tp-radius-pill); padding: 3px 9px; font-size: 12px; font-weight: 700; background: var(--tp-yellow-tint); color: var(--tp-text-on-yellow); white-space: nowrap; }
    .tp-bus-card__route { margin: 0; font-weight: 700; }
    .tp-bus-card__time { margin: 0; font-size: 13px; }
    .tp-bus-card__chips { display: flex; flex-wrap: wrap; gap: var(--tp-space-1); }
    .tp-bus-card__chips span { font-size: 12px; padding: 2px 8px; border-radius: var(--tp-radius-pill); background: var(--tp-surface-alt); color: var(--tp-text-muted); }
    .tp-bus-card__foot { margin-top: auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--tp-space-2); padding-top: var(--tp-space-2); }
    .tp-bus-card__buttons { display: flex; gap: var(--tp-space-2); }
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

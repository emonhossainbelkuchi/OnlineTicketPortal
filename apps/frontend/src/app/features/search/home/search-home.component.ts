import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Terminal } from '@ticketportal-mono/models';
import { TpButtonDirective, TpCardComponent, TpSpinnerComponent } from '../../../shared/ui';
import { SearchApiService } from '../services/search-api.service';

// Chunk 3 task 2: the backend now treats a search "date" as a Dhaka calendar day (see
// DhakaClock.DayRangeUtc on the API side) — this default has to agree, or "today" pre-fills
// with the wrong date for anyone browsing between midnight and 6am Dhaka time (browser-local
// midnight in Dhaka is 18:00 UTC the previous day, so `new Date().toISOString()` — UTC — was
// landing on yesterday for that whole early-morning window). Bangladesh is a fixed UTC+6 with
// no DST, so a plain offset is exact here without pulling in a timezone library.
function todayIso(): string {
  const dhakaMs = Date.now() + 6 * 60 * 60 * 1000;
  return new Date(dhakaMs).toISOString().slice(0, 10);
}

/**
 * Piece 2 — landing screen. Loads the terminal list once (Terminals are near-static reference
 * data, not worth re-fetching per keystroke) and lets the user pick from/to/date before handing
 * off to SearchResultsComponent via query params — the URL is the source of truth for a search,
 * so results are bookmarkable/shareable and survive a refresh.
 */
@Component({
  selector: 'tp-search-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TpCardComponent, TpButtonDirective, TpSpinnerComponent],
  template: `
    <div class="tp-page tp-search-home">
      <section class="tp-hero">
        <div class="tp-hero__deco" aria-hidden="true">✈️ 🚌 🚆</div>
        <h1>Book your next bus trip</h1>
        <p class="tp-muted">
          Search live seat availability across every operator on TicketPortal.
        </p>
      </section>

      <tp-card class="tp-search-card">
        @if (loadingTerminals()) {
          <tp-spinner />
        } @else if (loadError()) {
          <p class="tp-error-text">Couldn't load terminals. Please refresh and try again.</p>
        } @else {
          <div class="tp-trip-tabs">
            <span class="tp-trip-tab tp-trip-tab--active">One Way</span>
            <span class="tp-trip-tab tp-trip-tab--disabled" title="Round trips aren't offered yet">Round Way</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="search()" class="tp-search-form">
            <label class="tp-field">
              <span>From</span>
              <select formControlName="fromTerminalId">
                <option value="" disabled>Select terminal</option>
                @for (t of terminals(); track t.id) {
                  <option [value]="t.id">{{ t.name }} — {{ t.city }}</option>
                }
              </select>
            </label>

            <button type="button" class="tp-swap-btn" title="Swap terminals" (click)="swap()">
              ⇄
            </button>

            <label class="tp-field">
              <span>To</span>
              <select formControlName="toTerminalId">
                <option value="" disabled>Select terminal</option>
                @for (t of terminals(); track t.id) {
                  <option [value]="t.id">{{ t.name }} — {{ t.city }}</option>
                }
              </select>
            </label>

            <label class="tp-field">
              <span>Journey Date</span>
              <input type="date" formControlName="date" [min]="today" />
            </label>

            <button tpButton variant="primary" type="submit" class="tp-search-submit" [disabled]="form.invalid || sameTerminalError()">
              Search
            </button>
          </form>

          @if (sameTerminalError()) {
            <p class="tp-error-text">Departure and arrival terminals must be different.</p>
          }
        }
      </tp-card>
    </div>
  `,
  styles: [
    `
      .tp-search-home {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding-top: 0;
      }

      .tp-hero {
        text-align: center;
        background: linear-gradient(180deg, var(--tp-yellow-tint) 0%, transparent 100%);
        border-radius: 0 0 32px 32px;
        padding: 48px 20px 90px;
        position: relative;
        overflow: hidden;
      }

      .tp-hero__deco {
        font-size: 22px;
        letter-spacing: 18px;
        opacity: 0.6;
        margin-bottom: 8px;
      }

      .tp-hero h1 {
        font-size: 34px;
        margin-bottom: 8px;
      }

      .tp-search-card {
        max-width: 900px;
        margin: -60px auto 0;
        width: calc(100% - 32px);
        border-radius: 20px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
        position: relative;
        z-index: 1;
      }

      .tp-trip-tabs {
        display: flex;
        gap: 20px;
        margin-bottom: 16px;
      }

      .tp-trip-tab {
        font-size: 13px;
        font-weight: 700;
        padding-bottom: 6px;
        color: var(--tp-text-muted);
        cursor: default;
      }

      .tp-trip-tab--active {
        color: var(--tp-text);
        border-bottom: 2px solid var(--tp-yellow-dark);
      }

      .tp-trip-tab--disabled {
        opacity: 0.5;
      }

      .tp-search-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto auto;
        gap: 14px;
        align-items: end;
      }

      .tp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
        min-width: 0;
      }

      .tp-field select,
      .tp-field input {
        border: 1px solid var(--tp-border);
        border-radius: 999px;
        padding: 12px 18px;
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
        background: var(--tp-surface);
        width: 100%;
        min-width: 0;
      }

      .tp-field select:focus,
      .tp-field input:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }

      .tp-swap-btn {
        height: 40px;
        width: 40px;
        border-radius: 999px;
        border: 1px solid var(--tp-border);
        background: var(--tp-surface);
        cursor: pointer;
        font-size: 16px;
        color: var(--tp-text-muted);
      }

      .tp-swap-btn:hover {
        color: var(--tp-text);
        border-color: var(--tp-yellow-dark);
      }

      .tp-search-submit {
        border-radius: 999px !important;
        padding-left: 24px !important;
        padding-right: 24px !important;
      }

      .tp-error-text {
        color: var(--tp-danger);
        font-size: 13px;
        margin: 12px 0 0;
      }

      @media (max-width: 760px) {
        .tp-search-form {
          grid-template-columns: 1fr;
        }

        .tp-swap-btn {
          justify-self: center;
        }
      }
    `,
  ],
})
export class SearchHomeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly api = inject(SearchApiService);

  protected readonly terminals = signal<Terminal[]>([]);
  protected readonly loadingTerminals = signal(true);
  protected readonly loadError = signal(false);
  protected readonly today = todayIso();

  protected readonly form = this.fb.nonNullable.group({
    fromTerminalId: ['', Validators.required],
    toTerminalId: ['', Validators.required],
    date: [todayIso(), Validators.required],
  });

  ngOnInit(): void {
    this.api.terminals().subscribe({
      next: (terminals) => {
        this.terminals.set(terminals);
        this.loadingTerminals.set(false);
      },
      error: () => {
        this.loadingTerminals.set(false);
        this.loadError.set(true);
      },
    });
  }

  protected sameTerminalError(): boolean {
    const { fromTerminalId, toTerminalId } = this.form.getRawValue();
    return !!fromTerminalId && !!toTerminalId && fromTerminalId === toTerminalId;
  }

  swap(): void {
    const { fromTerminalId, toTerminalId } = this.form.getRawValue();
    this.form.patchValue({ fromTerminalId: toTerminalId, toTerminalId: fromTerminalId });
  }

  search(): void {
    if (this.form.invalid || this.sameTerminalError()) return;
    const { fromTerminalId, toTerminalId, date } = this.form.getRawValue();
    this.router.navigate(['/search/results'], { queryParams: { fromTerminalId, toTerminalId, date } });
  }
}

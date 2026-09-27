import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Gender, PassengerType, PaymentMethod, SalesCounter, Terminal, Trip, TripSeat, TripSearchResult } from '@ticketportal-mono/models';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent } from '../../../shared/ui';
import { SalesCountersService } from '../services/sales-counters.service';
import { TerminalsService } from '../services/terminals.service';
import { CounterSaleConfirmResult, WalkInBookingService } from '../services/walk-in-booking.service';

type Step = 'counter' | 'search' | 'seats' | 'details' | 'done';

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Card', 'MobileBanking', 'BankTransfer'];

/**
 * Piece 5, screen 2 — the walk-in booking flow. A streamlined version of
 * Piece 2+3's search -> seat select -> book flow, ending in the counter-sale
 * "cash collected in person" confirm instead of the online gateway
 * initiate/confirm round trip.
 *
 * One real backend gap this flow can't paper over: Trip.InventoryMode (the
 * flag that blocks a counter sale on an ExternalApiManaged/Hybrid
 * operator's trip) is resolved and frozen per-trip on the backend but is
 * NOT exposed on either TripResponseDto or TripSearchResultDto — verified
 * directly against DTO/TripDtos.cs. There's no way to warn staff before
 * they try. If BookingsController.Create rejects it, the ErrorInterceptor
 * already surfaces the backend's exact message as a toast; submitBooking()
 * below just leaves the wizard on the seats step so they can pick another
 * trip instead of losing their seat selection.
 */
@Component({
  selector: 'tp-walk-in-booking',
  standalone: true,
  imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent],
  template: `
    <div class="tp-steps">
      @for (s of stepOrder; track s) {
        <span class="tp-step" [class.tp-step--active]="step() === s" [class.tp-step--done]="stepIndex(s) < stepIndex(step())">
          {{ stepLabel(s) }}
        </span>
      }
    </div>

    <tp-card>
      @switch (step()) {
        @case ('counter') {
          <h2>Which counter are you selling from?</h2>
          @if (loadingCounters()) {
            <tp-spinner />
          } @else if (counters().length === 0) {
            <tp-empty-state title="No sales counters set up" message="Create a counter before recording a walk-in sale.">
              <a routerLink="../setup"><button tpButton variant="primary">Go to Counter Setup</button></a>
            </tp-empty-state>
          } @else {
            <label class="tp-field">
              Sales Counter
              <select
                [ngModel]="selectedCounterId()"
                (ngModelChange)="selectedCounterId.set($event)"
                [ngModelOptions]="{ standalone: true }"
              >
                @for (counter of counters(); track counter.id) {
                  <option [value]="counter.id">{{ counter.counterName }} ({{ counter.counterCode }})</option>
                }
              </select>
            </label>
            <button tpButton variant="primary" [disabled]="!selectedCounterId()" (click)="step.set('search')">
              Continue
            </button>
          }
        }

        @case ('search') {
          <h2>Find a trip</h2>
          <form class="tp-search-form" [formGroup]="searchForm" (ngSubmit)="search()">
            <label class="tp-field">
              From
              <select formControlName="fromTerminalId">
                <option value="" disabled>Select terminal</option>
                @for (terminal of terminals(); track terminal.id) {
                  <option [value]="terminal.id">{{ terminal.name }} ({{ terminal.city }})</option>
                }
              </select>
            </label>
            <label class="tp-field">
              To
              <select formControlName="toTerminalId">
                <option value="" disabled>Select terminal</option>
                @for (terminal of terminals(); track terminal.id) {
                  <option [value]="terminal.id">{{ terminal.name }} ({{ terminal.city }})</option>
                }
              </select>
            </label>
            <label class="tp-field">
              Date
              <input type="date" formControlName="date" />
            </label>
            <button tpButton variant="primary" type="submit" [disabled]="searchForm.invalid || searching()">
              {{ searching() ? 'Searching…' : 'Search' }}
            </button>
          </form>

          @if (searching()) {
            <tp-spinner />
          } @else if (searched() && results().length === 0) {
            <tp-empty-state title="No trips found" message="Try a different date or route." />
          } @else if (results().length > 0) {
            <p class="tp-muted">
              Showing {{ results().length }} of {{ rawResultCount() }} result(s) for {{ selectedCounter()?.counterName }} —
              only its own operator's trips can be sold at this counter.
            </p>
            <div class="tp-trip-list">
              @for (trip of results(); track trip.tripId) {
                <div class="tp-trip-row">
                  <div>
                    <strong>{{ trip.busOperatorName }}</strong> · {{ trip.busType }} · {{ trip.tripCode }}
                    <div class="tp-muted">
                      {{ trip.departureTerminalName }} → {{ trip.arrivalTerminalName }} ·
                      {{ trip.departureTimeUtc | date: 'MMM d, h:mm a' }}
                    </div>
                  </div>
                  <div class="tp-trip-row__right">
                    <span>{{ trip.availableSeatCount }} / {{ trip.totalSeatCount }} seats</span>
                    <span class="tp-fare">{{ trip.currency }} {{ trip.lowestAvailableFare ?? '—' }}</span>
                    <button tpButton variant="primary" size="sm" (click)="selectTrip(trip)">Select</button>
                  </div>
                </div>
              }
            </div>
          }
        }

        @case ('seats') {
          @if (loadingTrip()) {
            <tp-spinner />
          } @else if (selectedTrip(); as trip) {
            <div class="tp-toolbar">
              <h2>Select seats — {{ trip.tripCode }}</h2>
              <button tpButton variant="ghost" size="sm" (click)="backToSearch()">← Back to search</button>
            </div>

            <div class="tp-seat-grid">
              @for (seat of trip.tripSeats; track seat.id) {
                <button
                  type="button"
                  class="tp-seat"
                  [class.tp-seat--selected]="isSelected(seat)"
                  [class.tp-seat--disabled]="seat.status !== 'Available' && !isSelected(seat)"
                  [disabled]="seat.status !== 'Available' && !isSelected(seat)"
                  (click)="toggleSeat(seat)"
                >
                  {{ seat.seatNumber }}
                </button>
              }
            </div>

            <div class="tp-seat-summary">
              <span>{{ selectedSeatIds().length }} seat(s) selected — {{ trip.currency }} {{ selectedFareTotal() }}</span>
              <button tpButton variant="primary" [disabled]="selectedSeatIds().length === 0 || holding()" (click)="confirmSeats()">
                {{ holding() ? 'Holding…' : 'Hold Seats' }}
              </button>
            </div>
          }
        }

        @case ('details') {
          @if (hold(); as activeHold) {
            <div class="tp-toolbar">
              <h2>Passenger &amp; payment details</h2>
              <span class="tp-hold-timer" [class.tp-hold-timer--low]="secondsRemaining() <= 30">
                Hold expires in {{ formatCountdown() }}
              </span>
            </div>

            <form class="tp-form" [formGroup]="detailsForm">
              <div class="tp-form-row">
                <label class="tp-field">
                  Contact Name
                  <input type="text" formControlName="contactName" />
                </label>
                <label class="tp-field">
                  Contact Phone
                  <input type="text" formControlName="contactPhone" />
                </label>
                <label class="tp-field">
                  Contact Email
                  <input type="email" formControlName="contactEmail" />
                </label>
              </div>

              <div class="tp-form-row">
                <label class="tp-field">
                  Boarding Point
                  <select formControlName="boardingTerminalId">
                    @for (terminal of terminals(); track terminal.id) {
                      <option [value]="terminal.id">{{ terminal.name }}</option>
                    }
                  </select>
                </label>
                <label class="tp-field">
                  Dropping Point
                  <select formControlName="droppingTerminalId">
                    @for (terminal of terminals(); track terminal.id) {
                      <option [value]="terminal.id">{{ terminal.name }}</option>
                    }
                  </select>
                </label>
                <label class="tp-field">
                  Payment Method
                  <select formControlName="paymentMethod">
                    @for (method of paymentMethods; track method) {
                      <option [value]="method">{{ method }}</option>
                    }
                  </select>
                </label>
              </div>

              <h3>Passengers</h3>
              <div formArrayName="passengers" class="tp-passenger-list">
                @for (group of passengerControls(); track $index) {
                  <div class="tp-passenger-row" [formGroupName]="$index">
                    <span class="tp-passenger-seat">{{ seatLabel($index) }}</span>
                    <input type="text" formControlName="fullName" placeholder="Full name" />
                    <input type="text" formControlName="phone" placeholder="Phone (optional)" />
                    <select formControlName="gender">
                      <option value="Unknown">Unknown</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <select formControlName="passengerType">
                      <option value="Adult">Adult</option>
                      <option value="Child">Child</option>
                      <option value="Senior">Senior</option>
                      <option value="Student">Student</option>
                    </select>
                    <input type="number" formControlName="age" placeholder="Age" min="0" />
                  </div>
                }
              </div>
            </form>

            <div class="tp-toolbar">
              <button tpButton variant="ghost" (click)="backToSeats()">← Back to seats</button>
              <div class="tp-action-group">
                @if (booking() && !confirmResult()) {
                  <button tpButton variant="primary" [disabled]="confirming()" (click)="confirmPayment(booking()!)">
                    {{ confirming() ? 'Confirming…' : 'Retry Payment Confirmation' }}
                  </button>
                } @else {
                  <button
                    tpButton
                    variant="primary"
                    [disabled]="detailsForm.invalid || creatingBooking() || confirming()"
                    (click)="submitBooking()"
                  >
                    {{ creatingBooking() || confirming() ? 'Processing…' : 'Confirm & Collect Payment' }}
                  </button>
                }
              </div>
            </div>
          }
        }

        @case ('done') {
          @if (booking(); as finalBooking) {
            @if (confirmResult(); as result) {
              <div class="tp-done">
                <div class="tp-done__icon tp-icon-badge">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M5 12L10 17L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
                <h2>Sale complete</h2>
                <p class="tp-muted">PNR <strong>{{ finalBooking.pnr }}</strong> — {{ result.ticketIds.length }} ticket(s) issued.</p>
                <p>Total collected: {{ finalBooking.currency }} {{ finalBooking.grandTotal }} ({{ result.payment.method }})</p>
                @if (result.ledgerWarning) {
                  <p class="tp-warning-note">{{ result.ledgerWarning }}</p>
                }
                <div class="tp-done__actions">
                  <a [routerLink]="['../receipt']" [queryParams]="{ ids: result.ticketIds.join(',') }">
                    <button tpButton variant="secondary" type="button">Print Tickets</button>
                  </a>
                  <button tpButton variant="primary" (click)="newSale()">Start Next Sale</button>
                </div>
              </div>
            }
          }
        }
      }
    </tp-card>
  `,
  styles: [
    `
      .tp-steps {
        display: flex;
        gap: var(--tp-space-2);
        margin-bottom: var(--tp-space-4);
        flex-wrap: wrap;
      }

      .tp-step {
        font-size: 12px;
        font-weight: 600;
        color: var(--tp-text-muted);
        padding: var(--tp-space-2) var(--tp-space-3);
        border-radius: 999px;
        background: var(--tp-bg-soft);
        border: 1px solid var(--tp-border);
      }

      .tp-step--active {
        color: var(--tp-text-on-yellow);
        background: var(--tp-yellow);
        border-color: var(--tp-yellow);
      }

      .tp-step--done {
        color: var(--tp-success);
        border-color: var(--tp-success);
      }

      .tp-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--tp-space-4);
        flex-wrap: wrap;
        gap: var(--tp-space-3);
      }

      .tp-toolbar h2 {
        margin: 0;
      }

      .tp-field {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
        margin-bottom: var(--tp-space-4);
      }

      .tp-field select,
      .tp-field input {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-search-form {
        display: flex;
        gap: var(--tp-space-4);
        align-items: flex-end;
        flex-wrap: wrap;
        margin-bottom: var(--tp-space-5);
      }

      .tp-search-form .tp-field {
        margin-bottom: 0;
        min-width: 180px;
      }

      .tp-trip-list {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-3);
      }

      .tp-trip-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--tp-space-4);
        padding: var(--tp-space-4);
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-md);
        flex-wrap: wrap;
      }

      .tp-trip-row__right {
        display: flex;
        align-items: center;
        gap: var(--tp-space-4);
      }

      .tp-fare {
        font-weight: 700;
      }

      .tp-seat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
        gap: var(--tp-space-2);
        margin-bottom: var(--tp-space-5);
      }

      .tp-seat {
        padding: var(--tp-space-3) var(--tp-space-2);
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        background: var(--tp-bg);
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all var(--tp-transition-fast);
      }

      .tp-seat:hover:not(:disabled) {
        border-color: var(--tp-yellow-dark);
      }

      .tp-seat--selected {
        background: var(--tp-yellow);
        border-color: var(--tp-yellow-dark);
      }

      .tp-seat--disabled {
        background: var(--tp-bg-soft);
        color: var(--tp-text-muted);
        cursor: not-allowed;
        text-decoration: line-through;
      }

      .tp-seat-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
      }

      .tp-hold-timer {
        font-weight: 700;
        color: var(--tp-info);
      }

      .tp-hold-timer--low {
        color: var(--tp-danger);
      }

      .tp-form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--tp-space-4);
      }

      .tp-form-row .tp-field {
        margin-bottom: 0;
      }

      .tp-passenger-list {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-3);
        margin: var(--tp-space-3) 0 var(--tp-space-5);
      }

      .tp-passenger-row {
        display: grid;
        grid-template-columns: 70px 2fr 1.2fr 1fr 1fr 80px;
        gap: var(--tp-space-2);
        align-items: center;
      }

      .tp-passenger-row input,
      .tp-passenger-row select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: var(--tp-space-2) var(--tp-space-2);
        font-size: 13px;
        font-family: var(--tp-font-body);
      }

      .tp-passenger-seat {
        font-weight: 700;
        font-size: 13px;
      }

      .tp-action-group {
        display: flex;
        gap: var(--tp-space-3);
      }

      .tp-done {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--tp-space-2);
        padding: var(--tp-space-6) var(--tp-space-4);
      }

      .tp-done__icon {
        width: 60px;
        height: 60px;
        margin: 0 auto var(--tp-space-3);
      }

      .tp-done__actions {
        display: flex;
        gap: var(--tp-space-3);
        margin-top: var(--tp-space-2);
      }

      .tp-warning-note {
        color: #8a5a00;
        background: var(--tp-warning-tint);
        border-radius: var(--tp-radius-sm);
        padding: var(--tp-space-3);
      }
    `,
  ],
})
export class WalkInBookingComponent implements OnInit, OnDestroy {
  private readonly countersService = inject(SalesCountersService);
  private readonly terminalsService = inject(TerminalsService);
  private readonly walkIn = inject(WalkInBookingService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly paymentMethods = PAYMENT_METHODS;
  protected readonly stepOrder: Step[] = ['counter', 'search', 'seats', 'details', 'done'];

  protected readonly step = signal<Step>('counter');
  protected readonly loadingCounters = signal(true);
  protected readonly counters = signal<SalesCounter[]>([]);
  protected readonly selectedCounterId = signal('');
  protected readonly selectedCounter = computed(() => this.counters().find((c) => c.id === this.selectedCounterId()));

  protected readonly terminals = signal<Terminal[]>([]);

  protected readonly searchForm = this.fb.nonNullable.group({
    fromTerminalId: ['', Validators.required],
    toTerminalId: ['', Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
  });
  protected readonly searching = signal(false);
  protected readonly searched = signal(false);
  protected readonly rawResultCount = signal(0);
  protected readonly results = signal<TripSearchResult[]>([]);

  protected readonly loadingTrip = signal(false);
  protected readonly selectedTrip = signal<Trip | null>(null);
  protected readonly selectedSeatIds = signal<string[]>([]);
  protected readonly selectedFareTotal = computed(() => {
    const trip = this.selectedTrip();
    if (!trip) return 0;
    return this.selectedSeatIds().reduce((sum, id) => sum + (trip.tripSeats.find((s) => s.id === id)?.fare ?? 0), 0);
  });

  protected readonly holding = signal(false);
  protected readonly hold = signal<SeatHoldLike | null>(null);
  protected readonly secondsRemaining = signal(0);
  private timerHandle?: ReturnType<typeof setInterval>;

  protected readonly detailsForm: FormGroup = this.fb.group({
    contactName: ['', Validators.required],
    contactPhone: ['', Validators.required],
    contactEmail: [''],
    boardingTerminalId: ['', Validators.required],
    droppingTerminalId: ['', Validators.required],
    paymentMethod: ['Cash', Validators.required],
    passengers: this.fb.array([]),
  });

  protected readonly creatingBooking = signal(false);
  protected readonly confirming = signal(false);
  protected readonly booking = signal<BookingLike | null>(null);
  protected readonly confirmResult = signal<CounterSaleConfirmResult | null>(null);

  ngOnInit(): void {
    this.countersService.list().subscribe({
      next: (counters) => {
        const active = counters.filter((c) => c.isActive);
        this.counters.set(active);
        if (active.length === 1) {
          this.selectedCounterId.set(active[0].id);
        }
        this.loadingCounters.set(false);
      },
      error: () => this.loadingCounters.set(false),
    });
    this.terminalsService.list().subscribe((terminals) => this.terminals.set(terminals));
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  protected stepIndex(step: Step): number {
    return this.stepOrder.indexOf(step);
  }

  protected stepLabel(step: Step): string {
    return { counter: 'Counter', search: 'Find Trip', seats: 'Seats', details: 'Details', done: 'Done' }[step];
  }

  protected search(): void {
    if (this.searchForm.invalid) return;
    this.searching.set(true);
    this.searched.set(false);

    this.walkIn.searchTrips(this.searchForm.getRawValue()).subscribe({
      next: (results) => {
        this.rawResultCount.set(results.length);
        const counterOperatorId = this.selectedCounter()?.busOperatorId;
        this.results.set(counterOperatorId ? results.filter((r) => r.busOperatorId === counterOperatorId) : results);
        this.searching.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.searching.set(false);
        this.searched.set(true);
      },
    });
  }

  protected selectTrip(result: TripSearchResult): void {
    this.loadingTrip.set(true);
    this.step.set('seats');
    this.walkIn.getTrip(result.tripId).subscribe({
      next: (trip) => {
        this.selectedTrip.set(trip);
        this.selectedSeatIds.set([]);
        this.loadingTrip.set(false);
      },
      error: () => {
        this.loadingTrip.set(false);
        this.step.set('search');
      },
    });
  }

  protected isSelected(seat: TripSeat): boolean {
    return this.selectedSeatIds().includes(seat.id);
  }

  protected toggleSeat(seat: TripSeat): void {
    if (seat.status !== 'Available' && !this.isSelected(seat)) return;
    this.selectedSeatIds.update((ids) => (ids.includes(seat.id) ? ids.filter((id) => id !== seat.id) : [...ids, seat.id]));
  }

  protected backToSearch(): void {
    this.selectedTrip.set(null);
    this.selectedSeatIds.set([]);
    this.step.set('search');
  }

  protected confirmSeats(): void {
    const trip = this.selectedTrip();
    if (!trip || this.selectedSeatIds().length === 0) return;

    this.holding.set(true);
    this.walkIn.holdSeats({ tripId: trip.id, tripSeatIds: this.selectedSeatIds() }).subscribe({
      next: (hold) => {
        this.hold.set(hold);
        this.startTimer(hold.secondsRemaining);
        this.buildPassengerForm(trip);
        this.detailsForm.patchValue({
          boardingTerminalId: trip.departureTerminalId,
          droppingTerminalId: trip.arrivalTerminalId,
        });
        this.holding.set(false);
        this.step.set('details');
      },
      error: () => this.holding.set(false),
    });
  }

  protected backToSeats(): void {
    const activeHold = this.hold();
    if (activeHold) {
      this.walkIn.releaseHold(activeHold.id).subscribe();
    }
    this.clearTimer();
    this.hold.set(null);
    this.booking.set(null);
    this.confirmResult.set(null);
    this.step.set('seats');
  }

  protected get passengerArray(): FormArray {
    return this.detailsForm.get('passengers') as FormArray;
  }

  protected passengerControls(): FormGroup[] {
    return this.passengerArray.controls as FormGroup[];
  }

  protected seatLabel(index: number): string {
    const seatId = this.selectedSeatIds()[index];
    const trip = this.selectedTrip();
    return trip?.tripSeats.find((s) => s.id === seatId)?.seatNumber ?? `#${index + 1}`;
  }

  private buildPassengerForm(trip: Trip): void {
    const array = this.fb.array(
      this.selectedSeatIds().map(() =>
        this.fb.group({
          fullName: ['', Validators.required],
          phone: [''],
          gender: ['Unknown', Validators.required],
          passengerType: ['Adult', Validators.required],
          age: [null as number | null],
        }),
      ),
    );
    this.detailsForm.setControl('passengers', array);
    void trip; // kept for signature symmetry / future per-seat fare display
  }

  private startTimer(seconds: number): void {
    this.clearTimer();
    this.secondsRemaining.set(seconds);
    this.timerHandle = setInterval(() => {
      const next = this.secondsRemaining() - 1;
      if (next <= 0) {
        this.clearTimer();
        this.secondsRemaining.set(0);
        this.toast.warning('The seat hold expired. Please reselect seats.');
        this.hold.set(null);
        this.step.set('seats');
        return;
      }
      this.secondsRemaining.set(next);
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  protected formatCountdown(): string {
    const total = this.secondsRemaining();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  protected submitBooking(): void {
    const trip = this.selectedTrip();
    const activeHold = this.hold();
    if (!trip || !activeHold || this.detailsForm.invalid) return;

    this.creatingBooking.set(true);
    const raw = this.detailsForm.getRawValue();

    this.walkIn
      .createBooking({
        tripId: trip.id,
        holdToken: activeHold.holdToken,
        boardingTerminalId: raw.boardingTerminalId,
        droppingTerminalId: raw.droppingTerminalId,
        contactName: raw.contactName,
        contactPhone: raw.contactPhone,
        contactEmail: raw.contactEmail || undefined,
        salesCounterId: this.selectedCounterId(),
        passengers: raw.passengers.map(
          (p: { fullName: string; phone: string; gender: Gender; passengerType: PassengerType; age: number | null }) => ({
            fullName: p.fullName,
            phone: p.phone || undefined,
            gender: p.gender,
            passengerType: p.passengerType,
            age: p.age ?? undefined,
          }),
        ),
      })
      .subscribe({
        next: (booking) => {
          this.creatingBooking.set(false);
          this.booking.set(booking);
          this.confirmPayment(booking, raw.paymentMethod as PaymentMethod);
        },
        error: () => this.creatingBooking.set(false),
      });
  }

  protected confirmPayment(booking: BookingLike, method?: PaymentMethod): void {
    const activeHold = this.hold();
    if (!activeHold) return;

    this.confirming.set(true);
    this.walkIn
      .confirmCounterSale({
        bookingId: booking.id,
        holdToken: activeHold.holdToken,
        method: method ?? (this.detailsForm.getRawValue().paymentMethod as PaymentMethod),
      })
      .subscribe({
        next: (result) => {
          this.confirming.set(false);
          this.confirmResult.set(result);
          this.clearTimer();
          this.toast.success('Payment collected — tickets issued.');
          this.step.set('done');
        },
        error: () => this.confirming.set(false),
      });
  }

  protected newSale(): void {
    this.selectedTrip.set(null);
    this.selectedSeatIds.set([]);
    this.hold.set(null);
    this.booking.set(null);
    this.confirmResult.set(null);
    this.results.set([]);
    this.searched.set(false);
    this.detailsForm.reset({ paymentMethod: 'Cash' });
    this.detailsForm.setControl('passengers', this.fb.array([]));
    this.step.set('search');
  }
}

// Minimal local shapes so this file doesn't need to import the full
// SeatHold/Booking response models just to read the handful of fields the
// wizard actually touches.
interface SeatHoldLike {
  id: string;
  holdToken: string;
  secondsRemaining: number;
}

interface BookingLike {
  id: string;
  pnr: string;
  currency: string;
  grandTotal: number;
}

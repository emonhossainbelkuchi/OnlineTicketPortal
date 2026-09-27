import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Booking, BookingCreateRequest, Gender, PassengerType } from '@ticketportal-mono/models';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpStatusPillComponent } from '../../../../shared/ui';
import { CheckoutStateService } from '../../services/checkout-state.service';

const GENDERS: Gender[] = ['Unknown', 'Male', 'Female', 'Other'];
const PASSENGER_TYPES: PassengerType[] = ['Adult', 'Child', 'Senior', 'Student'];

/**
 * Passenger count is fixed by the hold (checkoutHoldGuard already confirmed one exists) — one
 * form row per SeatHoldItem, in the same order the backend expects (see BookingCreateDto's
 * comment: a count mismatch is rejected outright). Coupon entry deliberately isn't on this
 * screen — CouponRedeemDto requires a real BookingId, which only exists after this step
 * succeeds, so "apply coupon" lives on the payment screen instead (see PaymentComponent).
 */
@Component({
  selector: 'tp-passenger-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TpCardComponent, TpButtonDirective, TpStatusPillComponent],
  template: `
    <div class="tp-page tp-passenger-page">
      <h2>Passenger Details</h2>

      @if (state.hold(); as hold) {
        <div class="tp-hold-banner">
          <tp-status-pill [status]="countdownLabel()" [tone]="hold.secondsRemaining <= 60 ? 'danger' : 'warning'" />
          <span class="tp-muted">left to complete this booking</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <tp-card class="tp-section-card">
          <h3>Contact Information</h3>
          <p class="tp-muted">We'll send booking updates here — this doesn't have to match any one passenger.</p>
          <div formGroupName="contact" class="tp-form-grid">
            <label>
              Full Name
              <input type="text" formControlName="contactName" />
            </label>
            <label>
              Phone
              <input type="text" formControlName="contactPhone" />
            </label>
            <label>
              Email (optional)
              <input type="email" formControlName="contactEmail" />
            </label>
          </div>
        </tp-card>

        <div formArrayName="passengers">
          @for (group of passengers.controls; track $index) {
            <tp-card class="tp-section-card" [formGroupName]="$index">
              <h3>Passenger {{ $index + 1 }} — Seat {{ seatNumberAt($index) }}</h3>
              <div class="tp-form-grid">
                <label>
                  Full Name
                  <input type="text" formControlName="fullName" />
                </label>
                <label>
                  Age
                  <input type="number" min="0" formControlName="age" />
                </label>
                <label>
                  Gender
                  <select formControlName="gender">
                    @for (g of genders; track g) {
                      <option [value]="g">{{ g }}</option>
                    }
                  </select>
                </label>
                <label>
                  Passenger Type
                  <select formControlName="passengerType">
                    @for (t of passengerTypes; track t) {
                      <option [value]="t">{{ t }}</option>
                    }
                  </select>
                </label>
                <label>
                  Phone (optional)
                  <input type="text" formControlName="phone" />
                </label>
                <label>
                  Email (optional)
                  <input type="email" formControlName="email" />
                </label>
                <label>
                  National ID (optional)
                  <input type="text" formControlName="nationalIdNumber" />
                </label>
              </div>
            </tp-card>
          }
        </div>

        <div class="tp-passenger-page__actions">
          <button tpButton variant="secondary" type="button" (click)="back()">Back</button>
          <button tpButton variant="primary" type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Saving…' : 'Continue to Payment' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .tp-passenger-page {
        max-width: 760px;
      }

      .tp-hold-banner {
        display: flex;
        align-items: center;
        gap: var(--tp-space-2);
        margin-bottom: var(--tp-space-5);
        font-size: 13px;
      }

      .tp-section-card {
        margin-bottom: var(--tp-space-4);
      }

      .tp-section-card h3 {
        margin-bottom: var(--tp-space-2);
      }

      .tp-form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--tp-space-4);
        margin-top: var(--tp-space-4);
      }

      label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      input,
      select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
        background: var(--tp-bg);
      }

      input:focus,
      select:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }

      .tp-passenger-page__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--tp-space-3);
        margin-top: var(--tp-space-5);
      }
    `,
  ],
})
export class PassengerDetailsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly state = inject(CheckoutStateService);

  protected readonly genders = GENDERS;
  protected readonly passengerTypes = PASSENGER_TYPES;
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    contact: this.fb.nonNullable.group({
      contactName: ['', Validators.required],
      contactPhone: ['', Validators.required],
      contactEmail: [''],
    }),
    passengers: this.fb.array<ReturnType<typeof this.buildPassengerGroup>>([]),
  });

  get passengers(): FormArray {
    return this.form.controls.passengers;
  }

  ngOnInit(): void {
    const currentUser = this.auth.currentUser();
    if (currentUser) {
      this.form.controls.contact.patchValue({ contactName: currentUser.userName });
    }

    for (let i = 0; i < this.state.holdItems().length; i++) {
      this.passengers.push(this.buildPassengerGroup());
    }
  }

  private buildPassengerGroup() {
    return this.fb.nonNullable.group({
      fullName: ['', Validators.required],
      age: this.fb.control<number | null>(null),
      gender: this.fb.nonNullable.control<Gender>('Unknown'),
      passengerType: this.fb.nonNullable.control<PassengerType>('Adult'),
      phone: [''],
      email: [''],
      nationalIdNumber: [''],
    });
  }

  seatNumberAt(index: number): string {
    const item = this.state.holdItems()[index];
    const seat = this.state.trip()?.tripSeats.find((s) => s.id === item?.tripSeatId);
    return seat?.seatNumber ?? '—';
  }

  countdownLabel(): string {
    const seconds = this.state.hold()?.secondsRemaining ?? 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  back(): void {
    this.router.navigate(['/my-bookings/checkout/start']);
  }

  submit(): void {
    if (this.form.invalid) return;

    const hold = this.state.hold();
    const trip = this.state.trip();
    if (!hold || !trip || !this.state.hasActiveHold()) {
      this.toast.warning('Your seat hold expired. Please select your seats again.');
      this.state.reset();
      this.router.navigate(['/my-bookings/checkout/start']);
      return;
    }

    const { contact, passengers } = this.form.getRawValue();

    const request: BookingCreateRequest = {
      tripId: trip.id,
      holdToken: hold.holdToken,
      // Simplification: boards/drops at the trip's own origin/destination terminal. A picker
      // for intermediate boarding/dropping points (OperatorRouteStopsController) belongs to
      // Piece 2's trip-details screen, which doesn't exist yet — out of scope here.
      boardingTerminalId: trip.departureTerminalId,
      droppingTerminalId: trip.arrivalTerminalId,
      contactName: contact.contactName,
      contactPhone: contact.contactPhone,
      contactEmail: contact.contactEmail || undefined,
      passengers: passengers.map((p) => ({
        fullName: p.fullName,
        age: p.age ?? undefined,
        gender: p.gender,
        passengerType: p.passengerType,
        phone: p.phone || undefined,
        email: p.email || undefined,
        nationalIdNumber: p.nationalIdNumber || undefined,
      })),
    };

    this.submitting.set(true);
    this.api.post<Booking>('bookings', request).subscribe({
      next: (booking) => {
        this.submitting.set(false);
        this.state.setBooking(booking);
        this.router.navigate(['/my-bookings/checkout/payment']);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        // 409 here means the hold expired or was already converted between checkout/start and
        // this submit — the error toast already explains why (ErrorInterceptor), this just
        // gets the customer back to a state where they can actually recover.
        if (err.status === 409) {
          this.state.reset();
          this.router.navigate(['/my-bookings/checkout/start']);
        }
      },
    });
  }
}

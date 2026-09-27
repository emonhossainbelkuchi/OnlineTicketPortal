import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError, Booking, CouponRedeemRequest, CouponUsage, Payment, PaymentGatewayResult, PaymentInitiateRequest, PaymentMethod } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent } from '../../../../shared/ui';
import { CheckoutStateService } from '../../services/checkout-state.service';

interface CheckoutPaymentMethod {
  key: string;
  method: PaymentMethod;
  label: string;
  providerId?: string;
  feeLabel?: string;
}

interface CheckoutPaymentMethodResponse {
  providerId: string;
  providerName: string;
  method: PaymentMethod;
  displayName: string;
  fixedFee: number | null;
  percentageFee: number | null;
}

// A safe fallback keeps checkout usable for older databases that have not yet been seeded with
// PaymentMethodConfiguration rows. A current database replaces this list with the API response.
const FALLBACK_PAYMENT_METHODS: CheckoutPaymentMethod[] = [
  { key: 'Card', method: 'Card', label: 'Credit / Debit Card' },
  { key: 'MobileBanking', method: 'MobileBanking', label: 'Mobile Banking (bKash, Nagad…)' },
  { key: 'BankTransfer', method: 'BankTransfer', label: 'Bank Transfer' },
  { key: 'Wallet', method: 'Wallet', label: 'TicketPortal Wallet' },
];

type PaymentOutcome = 'idle' | 'processing' | 'holdExpired' | 'failed';

/**
 * No real payment gateway is wired in yet — PaymentsController itself documents this
 * (`Confirm` is explicitly "a stand-in for [a gateway] webhook, not something safe to expose
 * in production"). This screen is honest about that in the UI rather than faking a gateway
 * redirect: "Pay" performs initiate immediately followed by confirm, standing in for what
 * would otherwise be a redirect-out/redirect-back round trip once Piece 6 (or a real gateway
 * integration) exists.
 */
@Component({
  selector: 'tp-checkout-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, TpCardComponent, TpButtonDirective, TpEmptyStateComponent],
  template: `
    <div class="tp-page tp-payment-page">
      <h2>Payment</h2>

      @switch (outcome()) {
        @case ('holdExpired') {
          <tp-card>
            <tp-empty-state
              title="Your seat hold expired"
              message="Payment may have been received, but the held seats are no longer available. A refund has automatically been requested — track it from My Bookings › Cancellations."
            >
              <button tpButton variant="primary" (click)="backToMyBookings()">Go to My Bookings</button>
            </tp-empty-state>
          </tp-card>
        }
        @case ('failed') {
          <tp-card>
            <tp-empty-state title="Payment could not be completed" [message]="failureMessage()">
              <button tpButton variant="secondary" (click)="outcome.set('idle')">Try Again</button>
            </tp-empty-state>
          </tp-card>
        }
        @default {
          @if (booking(); as b) {
            <tp-card class="tp-summary-card">
              <h3>Order Summary</h3>
              <dl class="tp-summary-list">
                <div><dt>Subtotal</dt><dd>{{ b.subTotal | number: '1.2-2' }} {{ b.currency }}</dd></div>
                @if (b.discountAmount > 0) {
                  <div><dt>Discount</dt><dd>−{{ b.discountAmount | number: '1.2-2' }} {{ b.currency }}</dd></div>
                }
                <div><dt>Tax</dt><dd>{{ b.taxAmount | number: '1.2-2' }} {{ b.currency }}</dd></div>
                <div><dt>Service Charge</dt><dd>{{ b.serviceChargeAmount | number: '1.2-2' }} {{ b.currency }}</dd></div>
                <div class="tp-summary-list__total"><dt>Total</dt><dd>{{ b.grandTotal | number: '1.2-2' }} {{ b.currency }}</dd></div>
              </dl>

              <div class="tp-coupon-row">
                <input type="text" placeholder="Coupon code" [(ngModel)]="couponCode" [disabled]="applyingCoupon() || couponApplied()" />
                <button tpButton variant="secondary" type="button" [disabled]="!couponCode().trim() || applyingCoupon() || couponApplied()" (click)="applyCoupon(b)">
                  {{ couponApplied() ? 'Applied' : applyingCoupon() ? 'Applying…' : 'Apply' }}
                </button>
              </div>
            </tp-card>

            <tp-card class="tp-method-card">
              <h3>Payment Method</h3>
              <div class="tp-method-options">
                @for (m of methods(); track m.key) {
                  <label class="tp-method-option" [class.tp-method-option--selected]="selectedMethod()?.key === m.key">
                    <input type="radio" name="method" [value]="m.key" [checked]="selectedMethod()?.key === m.key" (change)="selectMethod(m)" />
                    <span>{{ m.label }}</span>
                    @if (m.feeLabel) { <small>{{ m.feeLabel }}</small> }
                  </label>
                }
              </div>
            </tp-card>

            <p class="tp-demo-note">
              Demo checkout — no real payment gateway is connected yet. Clicking "Pay" simulates a successful gateway callback for
              {{ b.grandTotal | number: '1.2-2' }} {{ b.currency }}.
            </p>

            <div class="tp-payment-page__actions">
              <button tpButton variant="secondary" type="button" [disabled]="outcome() === 'processing'" (click)="backToPassengers()">Back</button>
              <button tpButton variant="primary" type="button" [disabled]="outcome() === 'processing' || !selectedMethod()" (click)="pay(b)">
                {{ outcome() === 'processing' ? 'Processing…' : 'Pay ' + (b.grandTotal | number: '1.2-2') + ' ' + b.currency }}
              </button>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [
    `
      .tp-payment-page {
        max-width: 640px;
      }

      .tp-summary-card,
      .tp-method-card {
        margin-bottom: var(--tp-space-4);
      }

      .tp-summary-list {
        margin: var(--tp-space-4) 0;
      }

      .tp-summary-list div {
        display: flex;
        justify-content: space-between;
        padding: var(--tp-space-1) 0;
        font-size: 14px;
      }

      .tp-summary-list dt {
        color: var(--tp-text-muted);
        font-weight: 400;
      }

      .tp-summary-list dd {
        margin: 0;
        font-weight: 600;
      }

      .tp-summary-list__total {
        border-top: 1px solid var(--tp-border);
        margin-top: var(--tp-space-2);
        padding-top: var(--tp-space-3) !important;
        font-size: 16px !important;
      }

      .tp-coupon-row {
        display: flex;
        gap: var(--tp-space-3);
      }

      .tp-coupon-row input {
        flex: 1;
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
      }

      .tp-method-options {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        margin-top: var(--tp-space-3);
      }

      .tp-method-option {
        display: flex;
        align-items: center;
        gap: var(--tp-space-3);
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: var(--tp-space-3);
        font-size: 14px;
        cursor: pointer;
      }

      .tp-method-option--selected {
        border-color: var(--tp-yellow-dark);
        background: var(--tp-yellow-tint);
      }

      .tp-method-option small {
        margin-left: auto;
        color: var(--tp-text-muted);
      }

      .tp-demo-note {
        font-size: 12px;
        color: var(--tp-text-muted);
        font-style: italic;
      }

      .tp-payment-page__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--tp-space-3);
        margin-top: var(--tp-space-4);
      }
    `,
  ],
})
export class PaymentComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly state = inject(CheckoutStateService);

  protected readonly methods = signal<CheckoutPaymentMethod[]>(FALLBACK_PAYMENT_METHODS);
  protected readonly booking = computed(() => this.state.booking());

  protected readonly couponCode = signal('');
  protected readonly applyingCoupon = signal(false);
  protected readonly couponApplied = signal(false);

  protected readonly selectedMethod = signal<CheckoutPaymentMethod | null>(FALLBACK_PAYMENT_METHODS[0]);
  protected readonly outcome = signal<PaymentOutcome>('idle');
  protected readonly failureMessage = signal('Something went wrong while processing payment. Please try again.');

  ngOnInit(): void {
    this.api.get<CheckoutPaymentMethodResponse[]>('payments/methods').subscribe({
      next: (items) => {
        const methods = items.map((item) => ({
          key: `${item.providerId}:${item.method}`,
          method: item.method,
          label: item.displayName || item.providerName,
          providerId: item.providerId,
          feeLabel: this.feeLabel(item),
        }));

        if (methods.length > 0) {
          this.methods.set(methods);
          this.selectedMethod.set(methods[0]);
        }
      },
      // Retain the original hard-coded choices as a backwards-compatible fallback if an older
      // API/database does not expose configured checkout methods yet.
      error: () => undefined,
    });
  }

  protected selectMethod(method: CheckoutPaymentMethod): void {
    this.selectedMethod.set(method);
  }

  applyCoupon(booking: Booking): void {
    const code = this.couponCode().trim();
    if (!code) return;

    this.applyingCoupon.set(true);
    const request: CouponRedeemRequest = { code, bookingId: booking.id };

    this.api.post<CouponUsage>('couponusages/redeem', request).subscribe({
      next: (usage) => {
        // The server works out the real discount from the coupon's own rules — re-fetch the
        // booking rather than trusting any client-side estimate of the new total.
        this.api.get<Booking>(`bookings/${booking.id}`).subscribe({
          next: (fresh) => {
            this.applyingCoupon.set(false);
            this.couponApplied.set(true);
            this.state.setBooking(fresh);
            this.toast.success(`Coupon applied — you saved ${usage.discountApplied.toFixed(2)} ${fresh.currency}.`);
          },
          error: () => this.applyingCoupon.set(false),
        });
      },
      error: () => this.applyingCoupon.set(false),
    });
  }

  pay(booking: Booking): void {
    const hold = this.state.hold();
    const method = this.selectedMethod();
    if (!hold || !method) {
      this.outcome.set('holdExpired');
      return;
    }

    this.outcome.set('processing');

    const initiateRequest: PaymentInitiateRequest = {
      bookingId: booking.id,
      holdToken: hold.holdToken,
      method: method.method,
      paymentProviderId: method.providerId,
    };

    this.api.post<Payment>('payments/initiate', initiateRequest).subscribe({
      next: (payment) => this.confirm(payment, hold.holdToken),
      error: (err: ApiError) => {
        this.outcome.set('failed');
        this.failureMessage.set(err.message || 'Could not start the payment. Please try again.');
      },
    });
  }

  private confirm(payment: Payment, holdToken: string): void {
    // Stands in for the gateway's own transaction id, which would normally come back on the
    // redirect from a real gateway — see the "no real gateway wired in yet" note above.
    const result: PaymentGatewayResult = {
      holdToken,
      gatewayTransactionId: `SIM-${payment.id.slice(0, 8)}-${Date.now()}`,
      gatewayFeeAmount: 0,
    };

    this.api
      .post<{ payment: Payment; bookingStatus: string; ticketIds: string[]; ledgerWarning: string | null }>(
        `payments/${payment.id}/confirm`,
        result,
      )
      .subscribe({
        next: (response) => {
          this.state.setPayment(response.payment);
          const booking = this.state.booking();
          if (booking) {
            this.state.setBooking({ ...booking, status: response.bookingStatus as Booking['status'] });
          }
          this.router.navigate(['/my-bookings/checkout/confirmation', this.state.booking()?.id]);
        },
        error: (err: ApiError) => {
          // Confirm returns 409 specifically for the "paid but seats lost" race — everything
          // else is a generic failure. Both get the error toast automatically; this decides
          // which dedicated screen state to show.
          this.outcome.set(err.status === 409 ? 'holdExpired' : 'failed');
          this.failureMessage.set(err.message || 'Could not confirm the payment. Please try again.');
        },
      });
  }

  backToPassengers(): void {
    this.router.navigate(['/my-bookings/checkout/passengers']);
  }

  backToMyBookings(): void {
    this.state.reset();
    this.router.navigate(['/my-bookings']);
  }

  private feeLabel(method: CheckoutPaymentMethodResponse): string | undefined {
    if (method.percentageFee) return `Fee ${method.percentageFee}%`;
    if (method.fixedFee) return `Fee ${method.fixedFee}`;
    return undefined;
  }
}

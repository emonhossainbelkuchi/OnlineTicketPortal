import { Injectable, computed, signal } from '@angular/core';
import { Booking, Payment, SeatHold, SeatHoldItem, Trip } from '@ticketportal-mono/models';

/**
 * In-memory state for a single checkout attempt (start -> passengers -> payment ->
 * confirmation). Lives for the lifetime of the app (providedIn: 'root'), same as
 * AuthService/ToastService — deliberately NOT persisted to localStorage, since a hold is a
 * short-lived (3-5 min) server-side resource anyway; a hard refresh mid-checkout should send
 * the customer back to checkout/start to re-resolve the hold by token, not resurrect stale
 * client state the server may have already expired.
 *
 * Piece 2's seat map is the normal hand-off point — it navigates to
 * `/my-bookings/checkout/start?holdToken=...` after a successful hold; see that component and
 * CheckoutStartComponent for details.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutStateService {
  readonly hold = signal<SeatHold | null>(null);
  readonly holdItems = signal<SeatHoldItem[]>([]);
  readonly trip = signal<Trip | null>(null);
  readonly operatorName = signal<string | null>(null);
  readonly boardingTerminalName = signal<string | null>(null);
  readonly droppingTerminalName = signal<string | null>(null);

  readonly booking = signal<Booking | null>(null);
  readonly payment = signal<Payment | null>(null);

  readonly hasActiveHold = computed(() => this.hold()?.status === 'Active' && (this.hold()?.secondsRemaining ?? 0) > 0);
  readonly hasBooking = computed(() => this.booking() !== null);

  private tickHandle: ReturnType<typeof setInterval> | null = null;

  startCheckout(params: {
    hold: SeatHold;
    holdItems: SeatHoldItem[];
    trip: Trip;
    operatorName: string;
    boardingTerminalName: string;
    droppingTerminalName: string;
  }): void {
    this.hold.set(params.hold);
    this.holdItems.set(params.holdItems);
    this.trip.set(params.trip);
    this.operatorName.set(params.operatorName);
    this.boardingTerminalName.set(params.boardingTerminalName);
    this.droppingTerminalName.set(params.droppingTerminalName);
    this.booking.set(null);
    this.payment.set(null);
    this.startTicking();
  }

  setBooking(booking: Booking): void {
    this.booking.set(booking);
  }

  setPayment(payment: Payment): void {
    this.payment.set(payment);
  }

  /** Called on cancel/expiry/completion — clears everything so a stale hold can't leak into a new attempt. */
  reset(): void {
    this.stopTicking();
    this.hold.set(null);
    this.holdItems.set([]);
    this.trip.set(null);
    this.operatorName.set(null);
    this.boardingTerminalName.set(null);
    this.droppingTerminalName.set(null);
    this.booking.set(null);
    this.payment.set(null);
  }

  // Runs on the service itself (not any one component) so the countdown keeps ticking
  // correctly across checkout/start -> checkout/passengers -> checkout/payment regardless of
  // which of those is currently mounted — the guideline calls this "core business logic, must
  // be visibly correct, not decorative", so it shouldn't reset every time the route changes.
  // Stops itself once a booking exists (the hold has done its job and been converted) or the
  // countdown reaches zero.
  private startTicking(): void {
    this.stopTicking();
    this.tickHandle = setInterval(() => {
      const current = this.hold();
      if (!current || current.status !== 'Active' || this.booking() !== null) {
        this.stopTicking();
        return;
      }

      const secondsRemaining = Math.max(0, current.secondsRemaining - 1);
      this.hold.set({
        ...current,
        secondsRemaining,
        status: secondsRemaining <= 0 ? 'Expired' : current.status,
      });

      if (secondsRemaining <= 0) {
        this.stopTicking();
      }
    }, 1000);
  }

  private stopTicking(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }
}

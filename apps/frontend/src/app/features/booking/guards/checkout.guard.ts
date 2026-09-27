import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CheckoutStateService } from '../services/checkout-state.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Guards 'checkout/passengers' — you can only be filling in passenger details if
 * CheckoutStartComponent already resolved a hold into CheckoutStateService. A direct/refreshed
 * visit to this URL has no hold to work from, so send them back to start rather than rendering
 * a form for seats that were never actually held.
 */
export const checkoutHoldGuard: CanActivateFn = () => {
  const state = inject(CheckoutStateService);
  const router = inject(Router);

  if (state.hold() !== null) {
    return true;
  }

  return router.createUrlTree(['/my-bookings/checkout/start']);
};

/**
 * Guards 'checkout/payment' — you can only be paying for a booking that Create already
 * returned. Same reasoning as checkoutHoldGuard, one step further down the wizard.
 */
export const checkoutBookingGuard: CanActivateFn = () => {
  const state = inject(CheckoutStateService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (state.booking() !== null) {
    return true;
  }

  toast.info('Start checkout from the beginning to continue to payment.');
  return router.createUrlTree(['/my-bookings/checkout/start']);
};

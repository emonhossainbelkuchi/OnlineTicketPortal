import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

/**
 * My Account's tabs are each their own route (so bookings/wallet/cancellations are all
 * directly linkable and survive a refresh), so this uses Angular Material's router-aware
 * `mat-tab-nav-bar` / `mat-tab-link` rather than TpTabsComponent (which is index-based, for
 * tabs that swap which component renders in place rather than tabs that navigate).
 *
 * Profile is deliberately NOT one of these tabs — it's reached only via the navbar's account
 * dropdown ("My Profile"), not sitting beside Bookings/Wallet/Cancellations. Addresses no
 * longer has its own tab either — it's folded into the Profile page as plain fields (Address
 * Line 1/2, City, District, Country) instead of a separate saved-addresses screen.
 *
 * This replaces a previous hand-rolled `<nav>` that set `overflow-x: auto`
 * without an explicit `overflow-y`. Per the CSS overflow spec, when only one
 * axis is set to something other than `visible`, browsers force the other
 * axis to `auto` too — so that nav could silently pick up its own tiny
 * internal vertical scroll region. `mat-tab-nav-bar` handles genuine overflow
 * itself, with proper pagination arrows instead of a stray native scrollbar,
 * so this whole class of bug goes away.
 */
@Component({
  selector: 'tp-account-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatTabsModule],
  template: `
    <nav mat-tab-nav-bar class="tp-account-nav" aria-label="My Account" [disableRipple]="false">
      <a
        mat-tab-link
        routerLink="/my-bookings"
        routerLinkActive
        #bookingsLink="routerLinkActive"
        [routerLinkActiveOptions]="{ exact: true }"
        [active]="bookingsLink.isActive"
      >
        Bookings
      </a>
      <a mat-tab-link routerLink="/my-bookings/tickets" routerLinkActive #ticketsLink="routerLinkActive" [active]="ticketsLink.isActive">
        Tickets
      </a>
      <a mat-tab-link routerLink="/my-bookings/wallet" routerLinkActive #walletLink="routerLinkActive" [active]="walletLink.isActive">
        Wallet
      </a>
      <a
        mat-tab-link
        routerLink="/my-bookings/cancellations"
        routerLinkActive
        #cancellationsLink="routerLinkActive"
        [active]="cancellationsLink.isActive"
      >
        Cancellations &amp; Refunds
      </a>
      <a mat-tab-link routerLink="/my-bookings/complaints" routerLinkActive #complaintsLink="routerLinkActive" [active]="complaintsLink.isActive">
        Complaints
      </a>
    </nav>
  `,
  styles: [
    `
      .tp-account-nav {
        margin-bottom: var(--tp-space-5);
        border-bottom: 1px solid var(--tp-border);
        --mat-tab-header-label-text-weight: 600;
        --mat-tab-header-label-text-size: 14px;
        --mat-tab-header-label-text-tracking: 0.01em;
      }
    `,
  ],
})
export class AccountNavComponent {}

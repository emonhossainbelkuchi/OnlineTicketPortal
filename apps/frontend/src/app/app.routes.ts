import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * Top-level route map. Each feature area is its own lazy-loaded chunk via
 * loadChildren, so no teammate's code ships in another teammate's bundle.
 * Add new top-level areas here; keep everything under a feature area
 * inside that feature's own *.routes.ts file instead of growing this one.
 */
export const appRoutes: Routes = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Piece 2 — Customer Portal: Search & Discovery (public).
  {
    path: 'search',
    loadChildren: () => import('./features/search/search.routes').then((m) => m.SEARCH_ROUTES),
  },

  // Public bus discovery (browse coaches with upcoming trips; from the teammate's angular-app).
  {
    path: 'buses',
    loadChildren: () => import('./features/browse/browse.routes').then((m) => m.BROWSE_ROUTES),
  },

  // Piece 3 — Customer Portal: Checkout, Payment & My Account (Customer only).
  {
    path: 'my-bookings',
    loadChildren: () => import('./features/booking/booking.routes').then((m) => m.BOOKING_ROUTES),
  },

  // Piece 4 — Operator & Fleet Management Panel (Operator only).
  {
    path: 'operator',
    loadChildren: () => import('./features/operator/operator.routes').then((m) => m.OPERATOR_ROUTES),
  },

  // Piece 5 — Counter & Agent Operations Panel (Staff only).
  {
    path: 'counter',
    loadChildren: () => import('./features/counter/counter.routes').then((m) => m.COUNTER_ROUTES),
  },

  // Piece 6 — Finance & Settlement Panel (Staff only).
  {
    path: 'finance',
    loadChildren: () => import('./features/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
  },

  // Piece 7 — Platform Admin Dashboard lives in apps/admin (React), a
  // SEPARATE app in this same Nx workspace. This route is just a
  // signposted redirect, not the real dashboard.
  {
    path: 'admin',
    loadComponent: () =>
      import('./layout/admin-redirect/admin-redirect.component').then((m) => m.AdminRedirectComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin'] },
    title: 'Admin — TicketPortal',
  },

  // Available to any authenticated user regardless of role (Staff/Operator/Admin need to
  // change their password too) — deliberately NOT under 'my-bookings', which is Customer-only.
  {
    path: 'account/change-password',
    loadComponent: () =>
      import('./features/account/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
    canActivate: [authGuard],
    title: 'Change Password — TicketPortal',
  },

  {
    path: 'not-authorized',
    loadComponent: () => import('./layout/not-authorized/not-authorized.component').then((m) => m.NotAuthorizedComponent),
    title: 'Not Authorized — TicketPortal',
  },

  {
    path: '**',
    loadComponent: () => import('./layout/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Not Found — TicketPortal',
  },
];

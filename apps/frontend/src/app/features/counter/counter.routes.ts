import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { CounterShellComponent } from './counter-shell.component';

/**
 * Piece 5 — Counter & Agent Operations Panel. One guarded shell route
 * (Staff/Operator/Admin — 'Staff' per role.guard.ts's note that Counter
 * doesn't get a role of its own) with nine child screens underneath it:
 *
 *  - dashboard : default landing (Chunk 6) — today's tickets, cash-sales
 *                total, pending cancellations/complaints, one tap into
 *                'New walk-in' — backed by GET 'salescounters/dashboard'
 *  - walk-in   : search -> seat map -> passenger details -> one-click cash
 *                confirm via POST 'payments/counter-sale/confirm' (NOT the
 *                online initiate/confirm pair); "Sale complete" links into
 *                receipt below
 *  - receipt   : printable one-ticket-per-seat receipt (Chunk 6) — reuses
 *                the shared ticket/QR card also used by My Bookings
 *  - setup     : sales counter CRUD (SalesCountersController)
 *  - agents    : agent roster CRUD (AgentsController) — see
 *                agent-bookings.component.ts for the booking-attribution
 *                gap this screen flags rather than papers over
 *  - cancellations : cancellations & refunds desk (CancellationRequestsController
 *                    + RefundsController)
 *  - staff     : HR mini-module — profiles/attendance/salary
 *  - complaints: complaints intake/status board
 *  - boarding  : Chunk 4 task 2 — check a ticket number, then check it in
 *                (POST 'tickets/{ticketNumber}/check-in')
 *
 * RBAC Amendment v3 task 7: each child now also carries the `permissions` a
 * CounterStaff/Supervisor/Operator-Finance account does or doesn't hold (see
 * PermissionMatrix.cs), so someone who can't actually USE a screen gets
 * redirected client-side instead of loading a screen whose every API call
 * then 403s. 'agents' and 'complaints' are deliberately left without an
 * added permission — the fixed RBAC Amendment v3 catalogue has no
 * Agent.* / Complaints.* permission granted to any operator-scoped job role
 * yet (see AUTHORIZATION_DECISIONS.md), so gating them here would incorrectly
 * lock every operator's staff out of screens they currently rely on. This is
 * an acknowledged Chunk 2 gap, not a decision that they're meant to be open.
 */
export const COUNTER_ROUTES: Routes = [
  {
    path: '',
    component: CounterShellComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Staff'] },
    title: 'Counter Desk — TicketPortal',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Counter.Read'] },
        title: 'Dashboard — Counter Desk',
      },
      {
        path: 'walk-in',
        loadComponent: () => import('./walk-in-booking/walk-in-booking.component').then((m) => m.WalkInBookingComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Counter.Sell'] },
        title: 'Walk-in Booking — Counter Desk',
      },
      {
        path: 'receipt',
        loadComponent: () => import('./receipt/counter-receipt.component').then((m) => m.CounterReceiptComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Counter.Sell'] },
        title: 'Print Receipt — Counter Desk',
      },
      {
        path: 'setup',
        loadComponent: () => import('./counter-setup/counter-setup.component').then((m) => m.CounterSetupComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Counter.Configure'] },
        title: 'Counter Setup — Counter Desk',
      },
      {
        path: 'agents',
        loadComponent: () => import('./agent-bookings/agent-bookings.component').then((m) => m.AgentBookingsComponent),
        title: 'Agents — Counter Desk',
      },
      {
        path: 'cancellations',
        loadComponent: () =>
          import('./cancellations-refunds/cancellations-refunds.component').then((m) => m.CancellationsRefundsComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Counter.Cancel'] },
        title: 'Cancellations & Refunds — Counter Desk',
      },
      {
        path: 'staff',
        loadComponent: () => import('./staff-hr/staff-hr.component').then((m) => m.StaffHrComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Staff.Read'] },
        title: 'Staff HR — Counter Desk',
      },
      {
        path: 'complaints',
        loadComponent: () => import('./complaints/complaints.component').then((m) => m.ComplaintsComponent),
        title: 'Complaints — Counter Desk',
      },
      {
        path: 'boarding',
        loadComponent: () => import('./boarding/boarding.component').then((m) => m.BoardingComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Ticket.CheckIn'] },
        title: 'Boarding Desk — Counter Desk',
      },
    ],
  },
];

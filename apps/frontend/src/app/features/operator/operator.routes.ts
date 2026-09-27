import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

/**
 * Piece 4 — Operator & Fleet Management Panel. Every screen sits behind the OperatorShell (tab
 * nav + OperatorContextService resolution — see that component). Reachable by an operator's own
 * "Staff" account (an Operator Manager/BusOwner job role — see PermissionMatrix.cs;
 * 'Operator' is retired as a login role, see AdminController), or by platform "Staff"/"Admin"
 * acting on an operator's behalf.
 *
 * RBAC Amendment v3 task 7: 'fleet'/'network'/'trips'/'crew'/'policies' are all
 * management/write screens, so each carries the matching *.Manage permission. A CounterStaff,
 * Supervisor, or Operator Finance account of this same operator does NOT hold any of these
 * (see PermissionMatrix.OperatorScope) and is now correctly redirected instead of opening a
 * screen whose every write then 403s server-side. 'profile' is left without an added
 * permission — BusOperator/OperatorBranch profile editing has no dedicated permission in the
 * fixed RBAC Amendment v3 catalogue yet (documented gap, see AUTHORIZATION_DECISIONS.md).
 */
export const OPERATOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell/operator-shell.component').then((m) => m.OperatorShellComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Operator', 'Staff', 'Admin'] },
    title: 'Operator Panel — TicketPortal',
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./screens/profile-branches/profile-branches.component').then((m) => m.ProfileBranchesComponent),
        title: 'Operator Profile — TicketPortal',
      },
      {
        path: 'fleet',
        loadComponent: () => import('./screens/fleet/fleet.component').then((m) => m.FleetComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Fleet.Manage'] },
        title: 'Fleet — TicketPortal',
      },
      {
        path: 'network',
        loadComponent: () =>
          import('./screens/network-setup/network-setup.component').then((m) => m.NetworkSetupComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Network.Manage'] },
        title: 'Network Setup — TicketPortal',
      },
      {
        path: 'trips',
        loadComponent: () =>
          import('./screens/trips-scheduling/trips-scheduling.component').then((m) => m.TripsSchedulingComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Trips.Manage'] },
        title: 'Trips & Scheduling — TicketPortal',
      },
      {
        path: 'crew',
        loadComponent: () =>
          import('./screens/crew-assignment/crew-assignment.component').then((m) => m.CrewAssignmentComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Crew.Manage'] },
        title: 'Crew Assignment — TicketPortal',
      },
      {
        path: 'policies',
        loadComponent: () => import('./screens/fare-policy/fare-policy.component').then((m) => m.FarePolicyComponent),
        canActivate: [roleGuard],
        data: { permissions: ['FarePolicy.Manage'] },
        title: 'Fare & Cancellation Policies — TicketPortal',
      },
    ],
  },
];

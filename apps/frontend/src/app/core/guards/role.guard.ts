import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AppRole } from '@ticketportal-mono/models';

/**
 * Restricts a route to one or more roles, and/or one or more fine-grained permissions.
 *
 *   {
 *     path: 'operator',
 *     canActivate: [authGuard, roleGuard],
 *     data: { roles: ['Staff'] },
 *     loadChildren: () => import('./features/operator/operator.routes')...
 *   }
 *
 * The backend only issues 'Admin' | 'Staff' | 'Operator' | 'Customer' as JWT roles (see
 * role.model.ts) — Counter (Piece 5) and Finance (Piece 6) both check for 'Staff', not a
 * role of their own. `data.roles` is still the right tool for "is this a Staff/Admin area
 * at all" — it's synchronous and needs no extra network round trip.
 *
 * RBAC Amendment v3 task 7: `data.roles` alone can't tell a CounterStaff clerk apart from
 * an Operator Manager, or stop a Supervisor from opening the counter-configuration screen —
 * everyone in those examples is equally 'Staff'. For that, set `data: { permissions: [...] }`
 * with one or more of the exact strings from Authorization/Permissions.cs on the backend
 * (e.g. 'Counter.Configure'). ALL listed permissions must be present — this resolves the
 * database-backed capability payload (GET /api/account/me, cached after the first call) and
 * denies by default if it can't be resolved, same fail-closed posture as CurrentActor on the
 * backend. Combine both: `data: { roles: ['Staff'], permissions: ['Counter.Configure'] }`.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = (route.data['roles'] as AppRole[] | undefined) ?? [];
  const requiredPermissions = (route.data['permissions'] as string[] | undefined) ?? [];

  if (requiredRoles.length > 0 && !authService.hasRole(...requiredRoles)) {
    return router.createUrlTree(['/not-authorized']);
  }

  if (requiredPermissions.length === 0) {
    return true;
  }

  return authService.ensureCapabilities().pipe(
    map((info) =>
      info.actorType === 'Admin' || requiredPermissions.every((permission) => info.permissions.includes(permission))
        ? true
        : router.createUrlTree(['/not-authorized']),
    ),
    catchError(() => of(router.createUrlTree(['/not-authorized']))),
  );
};

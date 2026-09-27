import { Routes } from '@angular/router';

/**
 * Public bus discovery - no login needed (the API endpoints are [AllowAnonymous]); logging in is
 * only required later, when seats are held from the seat-map page.
 */
export const BROWSE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./bus-list/bus-list.component').then((m) => m.BusListComponent),
    title: 'Browse Buses — TicketPortal',
  },
  {
    path: ':busId',
    loadComponent: () => import('./bus-detail/bus-detail.component').then((m) => m.BusDetailComponent),
    title: 'Bus Details — TicketPortal',
  },
];

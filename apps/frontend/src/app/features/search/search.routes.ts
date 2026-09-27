import { Routes } from '@angular/router';

/**
 * Piece 2 — Customer Portal: Search & Discovery.
 *
 * Public — "anyone visiting the site can search and see trips" (business plan). The backend
 * endpoints this feature reads from (TerminalsController.GetAll/GetById, TripsController
 * GetAll/GetById/Search, BusOperatorsController.GetById) are all [AllowAnonymous] to match.
 * The actual login requirement kicks in one step later, at SeatHoldsController.Create — see
 * TripSeatMapComponent.holdSeats(), which checks auth before calling it and bounces an
 * anonymous visitor to /auth/login with a returnUrl back to this trip instead.
 */
export const SEARCH_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./home/search-home.component').then((m) => m.SearchHomeComponent),
        title: 'Search Trips — TicketPortal',
      },
      {
        path: 'results',
        loadComponent: () =>
          import('./results/search-results.component').then((m) => m.SearchResultsComponent),
        title: 'Search Results — TicketPortal',
      },
      {
        path: 'trip/:tripId',
        loadComponent: () =>
          import('./trip-detail/trip-seat-map.component').then((m) => m.TripSeatMapComponent),
        title: 'Select Seats — TicketPortal',
      },
      {
        path: 'verify-ticket',
        loadComponent: () =>
          import('./ticket-verify/ticket-verify.component').then((m) => m.TicketVerifyComponent),
        title: 'Verify Ticket — TicketPortal',
      },
    ],
  },
];

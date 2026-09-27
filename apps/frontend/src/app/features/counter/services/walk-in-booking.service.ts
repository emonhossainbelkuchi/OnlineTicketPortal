import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Booking,
  BookingCreateRequest,
  CounterSaleConfirmRequest,
  SeatHold,
  SeatHoldCreateRequest,
  Trip,
  TripSearchQuery,
  TripSearchResult,
} from '@ticketportal-mono/models';

// Shape of the object PaymentsController.ConfirmCounterSale actually
// returns — it's an inline anonymous object on the backend, not one of the
// named *ResponseDto classes, so it's typed here instead of in
// libs/shared/models (nothing else needs this exact shape).
export interface CounterSaleConfirmResult {
  payment: {
    id: string;
    bookingId: string;
    amount: number;
    method: string;
    status: string;
  };
  bookingStatus: string;
  ticketIds: string[];
  ledgerWarning: string | null;
}

/**
 * Wraps the real backend surface behind Piece 5's walk-in booking flow
 * (screen 2): TripsController (search + full seat map), SeatHoldsController
 * (hold seats before booking), BookingsController (create with
 * salesCounterId set), and PaymentsController's counter-sale/confirm — the
 * one-click "cash collected in person" step that replaces the online
 * initiate+confirm round trip.
 */
@Injectable({ providedIn: 'root' })
export class WalkInBookingService {
  private readonly api = inject(ApiService);

  searchTrips(query: TripSearchQuery): Observable<TripSearchResult[]> {
    return this.api.get<TripSearchResult[]>('trips/search', {
      fromTerminalId: query.fromTerminalId,
      toTerminalId: query.toTerminalId,
      date: query.date,
      minAvailableSeats: query.minAvailableSeats,
    });
  }

  // Full trip incl. every TripSeat, for the seat-map step.
  getTrip(tripId: string): Observable<Trip> {
    return this.api.get<Trip>(`trips/${tripId}`);
  }

  holdSeats(request: SeatHoldCreateRequest): Observable<SeatHold> {
    return this.api.post<SeatHold>('seatholds', request);
  }

  getHoldByToken(holdToken: string): Observable<SeatHold> {
    return this.api.get<SeatHold>(`seatholds/by-token/${holdToken}`);
  }

  // Frees the held seats immediately instead of making the next walk-in
  // customer wait out the full hold window — call this when staff cancels
  // or backs out of an in-progress sale.
  releaseHold(id: string): Observable<void> {
    return this.api.post<void>(`seatholds/${id}/release`, {});
  }

  createBooking(request: BookingCreateRequest): Observable<Booking> {
    return this.api.post<Booking>('bookings', request);
  }

  // The counter-sale "mark as paid in cash" step — NOT the online
  // initiate/confirm pair. Staff/Operator/Admin only, and only valid
  // against a booking created with salesCounterId set (see
  // PaymentsController.ConfirmCounterSale).
  confirmCounterSale(request: CounterSaleConfirmRequest): Observable<CounterSaleConfirmResult> {
    return this.api.post<CounterSaleConfirmResult>('payments/counter-sale/confirm', request);
  }
}

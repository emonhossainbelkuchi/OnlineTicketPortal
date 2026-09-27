import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { BusOperator, Terminal, Trip } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';

export interface TripDisplayContext {
  trip: Trip;
  operatorName: string;
  boardingTerminalName: string;
  droppingTerminalName: string;
}

/**
 * A Booking/Trip only carries ids (tripId, busOperatorId, departure/arrivalTerminalId) — this
 * resolves them into the human-readable names the checkout summary, e-ticket, and booking
 * history/detail screens all need to show. Three read-only lookups (Trip, BusOperator,
 * Terminal x2) that don't belong to any single piece — Piece 2 owns picking a terminal, Piece
 * 4 owns editing an operator's profile, but reading either by id for display purposes is fair
 * game for whoever needs it, same as BusOperator being marked "read-only for display" in the
 * Piece 2 backend-surface note.
 */
@Injectable({ providedIn: 'root' })
export class TripDisplayService {
  private readonly api = inject(ApiService);

  loadContext(tripId: string): Observable<TripDisplayContext> {
    return this.api.get<Trip>(`trips/${tripId}`).pipe(
      switchMap((trip) =>
        forkJoin({
          trip: of(trip),
          operator: this.api.get<BusOperator>(`busoperators/${trip.busOperatorId}`),
          boarding: this.api.get<Terminal>(`terminals/${trip.departureTerminalId}`),
          dropping: this.api.get<Terminal>(`terminals/${trip.arrivalTerminalId}`),
        }),
      ),
      map(({ trip, operator, boarding, dropping }) => ({
        trip,
        operatorName: operator.name,
        boardingTerminalName: boarding.name,
        droppingTerminalName: dropping.name,
      })),
    );
  }
}

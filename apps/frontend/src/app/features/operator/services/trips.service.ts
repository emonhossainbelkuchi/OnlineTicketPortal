import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Schedule,
  ScheduleCreateRequest,
  ScheduleUpdateRequest,
  Trip,
  TripCancelPreview,
  TripCancelRequest,
  TripCancelResult,
  TripCreateRequest,
  TripManifest,
  TripStatusHistory,
  TripUpdateRequest,
} from '@ticketportal-mono/models';

/** Screen 4 (Trips & Scheduling). See TripsController + SchedulesController + TripStatusHistoriesController. */
@Injectable({ providedIn: 'root' })
export class TripsService {
  private readonly api = inject(ApiService);

  /** Trips.GetAll is unscoped — always returns every operator's trips — filter client-side. */
  listTrips(busOperatorId: string): Observable<Trip[]> {
    return this.api.get<Trip[]>('trips').pipe(map((trips) => trips.filter((t) => t.busOperatorId === busOperatorId)));
  }

  getTrip(id: string): Observable<Trip> {
    return this.api.get<Trip>(`trips/${id}`);
  }

  createTrip(dto: TripCreateRequest): Observable<Trip> {
    return this.api.post<Trip>('trips', dto);
  }

  /** Also used for pure status-change actions (delay/depart/arrive) — build the payload from the
   * currently-loaded Trip (tripSeats included unchanged) with just status/delayReason edited;
   * the backend logs a TripStatusHistory row automatically on any status change.
   *
   * Chunk 5: NOT for cancelling — the backend rejects status: 'Cancelled' here with a 400
   * pointing at cancelTrip() below. Cancelling a trip has real side effects (refunding every
   * Confirmed booking, releasing every active seat hold) that don't belong on a plain field
   * edit. Every other status value must also be a legal move on the backend's
   * TripStatusTransitionRules table or the PUT is rejected. */
  updateTrip(id: string, dto: TripUpdateRequest): Observable<Trip> {
    return this.api.put<Trip>(`trips/${id}`, dto);
  }

  deleteTrip(id: string): Observable<void> {
    return this.api.delete<void>(`trips/${id}`);
  }

  uploadTripCoverImage(id: string, file: File): Observable<{ imageUrl: string }> {
    return this.api.postForm<{ imageUrl: string }>(`trips/${id}/images`, file);
  }

  /** Read-only, no side effects — call before cancelTrip() to show the operator "N bookings will
   * be refunded, $X total" in the confirmation dialog. */
  previewCancelTrip(id: string): Observable<TripCancelPreview> {
    return this.api.get<TripCancelPreview>(`trips/${id}/cancel-preview`);
  }

  /** The ONLY way to cancel a trip — flips Trip.Status, releases every active seat hold, and
   * refunds every Confirmed/PartiallyCancelled booking on the trip (full amount, no
   * cancellation fee — the operator called it off, not the customer). See
   * TripCancellationService on the backend. */
  cancelTrip(id: string, dto: TripCancelRequest): Observable<{ message: string; result: TripCancelResult }> {
    return this.api.post<{ message: string; result: TripCancelResult }>(`trips/${id}/cancel`, dto);
  }

  /** Every ticket on the trip (including cancelled/refunded ones, with their real status) for
   * the driver/conductor's boarding list. */
  getManifest(id: string): Observable<TripManifest> {
    return this.api.get<TripManifest>(`trips/${id}/manifest`);
  }

  /** Read-only, auto-scoped server-side — filter client-side to one trip for its timeline. */
  listStatusHistory(tripId: string): Observable<TripStatusHistory[]> {
    return this.api.get<TripStatusHistory[]>('tripstatushistories').pipe(map((h) => h.filter((x) => x.tripId === tripId)));
  }

  listSchedules(busOperatorId: string): Observable<Schedule[]> {
    return this.api
      .get<Schedule[]>('schedules')
      .pipe(map((schedules) => schedules.filter((s) => s.busOperatorId === busOperatorId)));
  }

  createSchedule(dto: ScheduleCreateRequest): Observable<Schedule> {
    return this.api.post<Schedule>('schedules', dto);
  }

  updateSchedule(id: string, dto: ScheduleUpdateRequest): Observable<Schedule> {
    return this.api.put<Schedule>(`schedules/${id}`, dto);
  }

  deleteSchedule(id: string): Observable<void> {
    return this.api.delete<void>(`schedules/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Booking } from '@ticketportal-mono/models';

/**
 * GET /api/bookings — already scoped server-side to the caller's own
 * operator for Staff/Operator (BookingsController.GetAll). Used to resolve
 * a bare bookingId into something a staff member can actually recognize
 * (PNR, contact name) on the cancellations/refunds desk and the complaints
 * screen — there's no dedicated "lookup one booking by id" list endpoint,
 * so this fetches the whole in-scope list once and the caller indexes it.
 */
@Injectable({ providedIn: 'root' })
export class BookingsLookupService {
  private readonly api = inject(ApiService);

  list(): Observable<Booking[]> {
    return this.api.get<Booking[]>('bookings');
  }
}

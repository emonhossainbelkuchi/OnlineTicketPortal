import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { SalesCounter, SalesCounterRequest } from '@ticketportal-mono/models';

/**
 * Wraps SalesCountersController (Piece 5, screen 1 — Counter setup).
 * GetAll is already scoped server-side to the caller's own operator for
 * Staff/Operator; a platform-wide Admin/Staff sees every counter.
 */
@Injectable({ providedIn: 'root' })
export class SalesCountersService {
  private readonly api = inject(ApiService);

  list(): Observable<SalesCounter[]> {
    return this.api.get<SalesCounter[]>('salescounters');
  }

  create(request: SalesCounterRequest): Observable<SalesCounter> {
    return this.api.post<SalesCounter>('salescounters', request);
  }

  update(id: string, request: SalesCounterRequest & { rowVersion: string }): Observable<SalesCounter> {
    return this.api.put<SalesCounter>(`salescounters/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`salescounters/${id}`);
  }
}

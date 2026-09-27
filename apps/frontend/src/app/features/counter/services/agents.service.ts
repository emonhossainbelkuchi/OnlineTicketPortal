import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Agent, AgentCreateRequest, AgentUpdateRequest } from '@ticketportal-mono/models';

/**
 * Wraps AgentsController (Piece 5, screen 3 — Agent roster).
 *
 * NOTE: this is the agent DIRECTORY only. There is currently no way to
 * attribute an actual booking to one of these agents — Booking.AgentId
 * exists on the backend model but BookingCreateDto never exposes it and
 * BookingsController never sets it (verified directly against the DTO and
 * controller source). Agent-referred walk-in sales go through the same
 * counter-sale flow as any other walk-in (see walk-in-booking.component.ts)
 * until that gap is closed on the backend.
 */
@Injectable({ providedIn: 'root' })
export class AgentsService {
  private readonly api = inject(ApiService);

  list(): Observable<Agent[]> {
    return this.api.get<Agent[]>('agents');
  }

  create(request: AgentCreateRequest): Observable<Agent> {
    return this.api.post<Agent>('agents', request);
  }

  update(id: string, request: AgentUpdateRequest): Observable<Agent> {
    return this.api.put<Agent>(`agents/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`agents/${id}`);
  }
}

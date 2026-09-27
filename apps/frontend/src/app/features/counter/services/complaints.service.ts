import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Complaint, ComplaintCreateRequest, ComplaintStatusUpdateRequest } from '@ticketportal-mono/models';

/**
 * Wraps ComplaintsController (Piece 5, screen 6). GetAll returns EVERY
 * complaint platform-wide for any Staff/Operator/Admin caller — there's no
 * per-operator scoping on this controller (verified against the source),
 * so the intake screen does its own client-side text filter rather than
 * relying on a server-side scope.
 */
@Injectable({ providedIn: 'root' })
export class ComplaintsService {
  private readonly api = inject(ApiService);

  list(): Observable<Complaint[]> {
    return this.api.get<Complaint[]>('complaints');
  }

  // See ComplaintCreateRequest's doc comment — this always files under the
  // logged-in staff account, not a chosen walk-in customer.
  create(request: ComplaintCreateRequest): Observable<Complaint> {
    return this.api.post<Complaint>('complaints', request);
  }

  updateStatus(id: string, request: ComplaintStatusUpdateRequest): Observable<Complaint> {
    return this.api.post<Complaint>(`complaints/${id}/status`, request);
  }
}

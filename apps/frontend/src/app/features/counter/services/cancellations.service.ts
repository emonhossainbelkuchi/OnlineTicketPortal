import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CancellationApproveRequest, CancellationRejectRequest, CancellationRequest } from '@ticketportal-mono/models';

/**
 * Wraps CancellationRequestsController (Piece 5, screen 4). No generic
 * PUT/DELETE on the backend by design — a request only ever moves
 * Requested -> Approved/Rejected -> Completed through these actions.
 */
@Injectable({ providedIn: 'root' })
export class CancellationsService {
  private readonly api = inject(ApiService);

  list(): Observable<CancellationRequest[]> {
    return this.api.get<CancellationRequest[]>('cancellationrequests');
  }

  approve(id: string, request: CancellationApproveRequest): Observable<CancellationRequest> {
    return this.api.post<CancellationRequest>(`cancellationrequests/${id}/approve`, request);
  }

  reject(id: string, request: CancellationRejectRequest): Observable<void> {
    return this.api.post<void>(`cancellationrequests/${id}/reject`, request);
  }

  // Only succeeds once the linked Refund has actually reached Succeeded
  // through RefundsService.process() below — the backend enforces this,
  // not the UI.
  complete(id: string): Observable<CancellationRequest> {
    return this.api.post<CancellationRequest>(`cancellationrequests/${id}/complete`, {});
  }
}

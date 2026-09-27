import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Refund, RefundApproveRequest, RefundManualPayoutRequest, RefundRejectRequest } from '@ticketportal-mono/models';

/**
 * Wraps RefundsController (Piece 5, screen 4). No generic POST/PUT/DELETE —
 * a Refund is only ever created automatically elsewhere in the backend and
 * only ever moves Requested -> Approved -> Processing -> Succeeded (or
 * Rejected), with guest checkouts making one extra stop at
 * PendingManualPayout after Process.
 */
@Injectable({ providedIn: 'root' })
export class RefundsService {
  private readonly api = inject(ApiService);

  list(): Observable<Refund[]> {
    return this.api.get<Refund[]>('refunds');
  }

  approve(id: string, request: RefundApproveRequest): Observable<void> {
    return this.api.post<void>(`refunds/${id}/approve`, request);
  }

  reject(id: string, request: RefundRejectRequest): Observable<void> {
    return this.api.post<void>(`refunds/${id}/reject`, request);
  }

  // Approved -> actually moves money (ledger + wallet credit).
  process(id: string): Observable<Refund> {
    return this.api.post<Refund>(`refunds/${id}/process`, {});
  }

  // Closes out a guest refund sitting at PendingManualPayout. Platform
  // Admin/Staff only — the backend checks this itself regardless of what
  // the UI shows.
  manualPayout(id: string, request: RefundManualPayoutRequest): Observable<Refund> {
    return this.api.post<Refund>(`refunds/${id}/manual-payout`, request);
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CounterDashboard } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';

// GET /api/salescounters/dashboard — see SalesCountersController.GetDashboard. Backs the
// counter desk's default landing screen (counter.routes.ts): today's tickets, cash-sales
// total, and pending cancellations/complaints, scoped server-side to whichever counter(s)
// this caller can actually use (see that endpoint's own RBAC comment).
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  // date: an optional yyyy-MM-dd string (Bangladesh local calendar day). Omit it to get
  // today's figures — the backend resolves "today" in Asia/Dhaka, not the browser's own
  // time zone, so a clerk's desk and a manager checking in from abroad see the same day.
  getDashboard(date?: string): Observable<CounterDashboard> {
    return this.api.get<CounterDashboard>('salescounters/dashboard', { date });
  }
}

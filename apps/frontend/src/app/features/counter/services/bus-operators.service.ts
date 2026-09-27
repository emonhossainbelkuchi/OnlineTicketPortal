import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { BusOperator } from '@ticketportal-mono/models';

/**
 * GET /api/busoperators — open to any logged-in user (BusOperatorsController).
 * Piece 5 only needs the read side: a platform-wide Admin/Staff caller (one
 * with no operator scope of their own) has to pick WHICH operator a new
 * sales counter/agent belongs to; an operator-scoped caller never sees this
 * picker at all (the backend ignores/overrides BusOperatorId for them).
 */
@Injectable({ providedIn: 'root' })
export class BusOperatorsService {
  private readonly api = inject(ApiService);

  list(): Observable<BusOperator[]> {
    return this.api.get<BusOperator[]>('busoperators');
  }

  getById(id: string): Observable<BusOperator> {
    return this.api.get<BusOperator>(`busoperators/${id}`);
  }
}

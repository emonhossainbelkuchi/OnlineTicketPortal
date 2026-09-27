import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  OperatorRouteStop,
  OperatorRouteStopCreateRequest,
  OperatorRouteStopUpdateRequest,
  RouteStop,
  Terminal,
} from '@ticketportal-mono/models';

/**
 * Screen 3 (Network Setup). Terminals/BusRoutes/RouteStops are Admin-only to write
 * (TerminalsController/BusRoutesController/RouteStopsController) so only reads are exposed here
 * — shown as reference/context while an operator picks a BusRoute and lays out their own stops.
 * BusRoutes reads live on BusOperatorProfileService (shared with Screen 1's route picker).
 * OperatorRouteStops (this operator's own boarding/dropping points) ARE operator-writable.
 */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  private readonly api = inject(ApiService);

  listTerminals(): Observable<Terminal[]> {
    return this.api.get<Terminal[]>('terminals');
  }

  listRouteStops(busRouteId: string): Observable<RouteStop[]> {
    return this.api.get<RouteStop[]>('routestops').pipe(map((stops) => stops.filter((s) => s.busRouteId === busRouteId)));
  }

  /** GetAll is auto-scoped for an Operator-scoped caller (join through OperatorRoute ->
   * BusOperatorId) but not for platform Staff/Admin — filter client-side against the set of
   * OperatorRouteIds that belong to the active operator (pass in from BusOperator.operatorRoutes). */
  listOperatorRouteStops(operatorRouteIds: string[]): Observable<OperatorRouteStop[]> {
    return this.api
      .get<OperatorRouteStop[]>('operatorroutestops')
      .pipe(map((stops) => stops.filter((s) => operatorRouteIds.includes(s.operatorRouteId))));
  }

  createOperatorRouteStop(dto: OperatorRouteStopCreateRequest): Observable<OperatorRouteStop> {
    return this.api.post<OperatorRouteStop>('operatorroutestops', dto);
  }

  updateOperatorRouteStop(id: string, dto: OperatorRouteStopUpdateRequest): Observable<OperatorRouteStop> {
    return this.api.put<OperatorRouteStop>(`operatorroutestops/${id}`, dto);
  }

  deleteOperatorRouteStop(id: string): Observable<void> {
    return this.api.delete<void>(`operatorroutestops/${id}`);
  }
}

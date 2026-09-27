import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  BusOperator,
  BusOperatorUpdateRequest,
  BusRoute,
  OperatorBranch,
  OperatorBranchCreateRequest,
  OperatorBranchUpdateRequest,
  OperatorRouteUpdateRequest,
} from '@ticketportal-mono/models';

/** Screen 1 (Operator Profile & Branches). See BusOperatorsController + OperatorBranchesController. */
@Injectable({ providedIn: 'root' })
export class BusOperatorProfileService {
  private readonly api = inject(ApiService);

  getOperator(id: string): Observable<BusOperator> {
    return this.api.get<BusOperator>(`busoperators/${id}`);
  }

  updateOperator(id: string, dto: BusOperatorUpdateRequest): Observable<BusOperator> {
    return this.api.put<BusOperator>(`busoperators/${id}`, dto);
  }

  uploadLogo(id: string, file: File): Observable<{ imageUrl: string }> {
    return this.api.postForm<{ imageUrl: string }>(`busoperators/${id}/images`, file);
  }

  /** Reference data for the OperatorRoute picker (Screen 3 also uses this). Admin-only writes,
   * so this is read-only here — BusRoutesController.GetAll is open to any authenticated user. */
  listBusRoutes(): Observable<BusRoute[]> {
    return this.api.get<BusRoute[]>('busroutes');
  }

  /** GetAll is auto-scoped for an Operator-scoped caller, but NOT for platform Staff/Admin
   * (who see every operator's branches) — always filter client-side against the active operator
   * so both cases end up correct. */
  listBranches(busOperatorId: string): Observable<OperatorBranch[]> {
    return this.api
      .get<OperatorBranch[]>('operatorbranches')
      .pipe(map((branches) => branches.filter((b) => b.busOperatorId === busOperatorId)));
  }

  createBranch(dto: OperatorBranchCreateRequest): Observable<OperatorBranch> {
    return this.api.post<OperatorBranch>('operatorbranches', dto);
  }

  updateBranch(id: string, dto: OperatorBranchUpdateRequest): Observable<OperatorBranch> {
    return this.api.put<OperatorBranch>(`operatorbranches/${id}`, dto);
  }

  deleteBranch(id: string): Observable<void> {
    return this.api.delete<void>(`operatorbranches/${id}`);
  }

  /**
   * PUT /api/busoperators/{id} always requires the whole BusOperatorUpdateRequest, including
   * scalar company fields the caller may not be touching — this builds that base from the
   * currently-loaded BusOperator so a screen only has to supply what it's actually changing
   * (e.g. just `operatorRoutes`, from the Network Setup screen). Company-info edits (Screen 1)
   * build their own request directly instead, since every scalar field is exactly what that
   * screen's form controls.
   */
  buildUpdateRequestFrom(op: BusOperator, operatorRoutes: OperatorRouteUpdateRequest[]): BusOperatorUpdateRequest {
    return {
      name: op.name,
      legalName: op.legalName,
      registrationNumber: op.registrationNumber,
      contactPhone: op.contactPhone,
      email: op.email,
      addressLine: op.addressLine,
      city: op.city,
      district: op.district,
      country: op.country,
      foundedYear: op.foundedYear,
      registeredOnUtc: op.registeredOnUtc,
      inventoryMode: op.inventoryMode,
      isActive: op.isActive,
      rowVersion: op.rowVersion,
      operatorRoutes,
    };
  }
}

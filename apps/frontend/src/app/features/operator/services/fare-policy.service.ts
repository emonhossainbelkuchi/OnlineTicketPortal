import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  CancellationPolicy,
  CancellationPolicyCreateRequest,
  CancellationPolicyUpdateRequest,
  FareRule,
  FareRuleCreateRequest,
  FareRuleUpdateRequest,
} from '@ticketportal-mono/models';

/** Screen 6 (Fare & Cancellation Policy Config). See FareRulesController + CancellationPoliciesController. */
@Injectable({ providedIn: 'root' })
export class FarePolicyService {
  private readonly api = inject(ApiService);

  /** GetAll is auto-scoped for an Operator-scoped caller but not for platform Staff/Admin —
   * filter client-side. Deliberately excludes null (platform-wide default) rules: those aren't
   * this operator's own to edit, and CanManagePolicyOperatorAsync-equivalent scoping on
   * FareRulesController never lets a scoped caller write one anyway. */
  listFareRules(busOperatorId: string): Observable<FareRule[]> {
    return this.api.get<FareRule[]>('farerules').pipe(map((rules) => rules.filter((r) => r.busOperatorId === busOperatorId)));
  }

  createFareRule(dto: FareRuleCreateRequest): Observable<FareRule> {
    return this.api.post<FareRule>('farerules', dto);
  }

  updateFareRule(id: string, dto: FareRuleUpdateRequest): Observable<FareRule> {
    return this.api.put<FareRule>(`farerules/${id}`, dto);
  }

  deleteFareRule(id: string): Observable<void> {
    return this.api.delete<void>(`farerules/${id}`);
  }

  /** Same platform-wide-null exclusion as listFareRules — this operator's own policies only. */
  listCancellationPolicies(busOperatorId: string): Observable<CancellationPolicy[]> {
    return this.api
      .get<CancellationPolicy[]>('cancellationpolicies')
      .pipe(map((policies) => policies.filter((p) => p.busOperatorId === busOperatorId)));
  }

  createCancellationPolicy(dto: CancellationPolicyCreateRequest): Observable<CancellationPolicy> {
    return this.api.post<CancellationPolicy>('cancellationpolicies', dto);
  }

  updateCancellationPolicy(id: string, dto: CancellationPolicyUpdateRequest): Observable<CancellationPolicy> {
    return this.api.put<CancellationPolicy>(`cancellationpolicies/${id}`, dto);
  }

  deleteCancellationPolicy(id: string): Observable<void> {
    return this.api.delete<void>(`cancellationpolicies/${id}`);
  }
}

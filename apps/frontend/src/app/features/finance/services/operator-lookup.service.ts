import { Injectable, inject, signal } from '@angular/core';
import { BusOperator } from '@ticketportal-mono/models';
import { FinanceApiService } from './finance-api.service';

/**
 * GET /api/BusOperators is open to any authenticated user (see
 * BusOperatorsController.GetAll — no role check) and every Piece 6 screen
 * needs the same "which operator" picker plus id->name lookups for tables,
 * so this fetches it once and shares it, instead of every component
 * re-requesting the full operator list on its own.
 */
@Injectable({ providedIn: 'root' })
export class OperatorLookupService {
  private readonly financeApi = inject(FinanceApiService);

  private readonly _operators = signal<BusOperator[]>([]);
  readonly operators = this._operators.asReadonly();

  private requested = false;

  /** Call from a component's constructor/ngOnInit — safe to call repeatedly, only fetches once. */
  ensureLoaded(): void {
    if (this.requested) return;
    this.requested = true;
    this.financeApi.listOperators().subscribe({
      next: (operators) => this._operators.set(operators),
      // Let the request be retried next time a screen asks — a transient
      // failure here shouldn't leave every Piece 6 screen without a picker
      // for the rest of the session.
      error: () => {
        this.requested = false;
      },
    });
  }

  nameFor(busOperatorId: string | null | undefined): string {
    if (!busOperatorId) return '—';
    return this._operators().find((o) => o.id === busOperatorId)?.name ?? busOperatorId;
  }
}

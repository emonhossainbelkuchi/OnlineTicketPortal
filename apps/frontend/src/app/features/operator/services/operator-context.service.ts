import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { BusOperator, StaffProfile } from '@ticketportal-mono/models';

/**
 * Every Piece 4 screen needs to know "which BusOperator am I managing right now" before it can
 * load or save anything — but nothing in AuthService/CurrentUser carries that id directly (the
 * JWT only has roles, see role.model.ts). GET /api/staffprofiles IS auto-scoped server-side
 * though (StaffProfilesController.GetAll — an operator's own Operator/Staff account only ever
 * gets their own operator's staff back), so resolving it means: fetch that list, find the row
 * whose userId matches the current session, and read its busOperatorId.
 *
 * Two real cases fall out of that:
 *  - A normal operator-scoped account (StaffProfile.BusOperatorId is set) — locked to that one
 *    BusOperator, no picker shown.
 *  - Platform Staff/Admin acting "on behalf of" an operator (BusOperatorId is null, or no
 *    StaffProfile row at all for an Admin) — sees every BusOperator and must pick one via
 *    `setActiveOperatorId` before any screen loads real data. See OperatorPickerComponent.
 *
 * Call `ensureLoaded()` from every screen before reading `busOperatorId`/`activeOperator` — it's
 * idempotent (only fetches once per session) and safe to call from multiple screens at once.
 */
@Injectable({ providedIn: 'root' })
export class OperatorContextService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly _isPlatformScope = signal(false);
  private readonly _availableOperators = signal<BusOperator[]>([]);
  private readonly _activeOperatorId = signal<string | null>(null);
  private readonly _activeOperator = signal<BusOperator | null>(null);
  private readonly _loading = signal(true);
  private readonly _initError = signal<string | null>(null);

  /** True for platform Admin/Staff, who manage every operator and must pick one to act as. */
  readonly isPlatformScope = this._isPlatformScope.asReadonly();
  /** Only populated when isPlatformScope() is true — the full list to pick from. */
  readonly availableOperators = this._availableOperators.asReadonly();
  readonly activeOperatorId = this._activeOperatorId.asReadonly();
  readonly activeOperator = this._activeOperator.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly initError = this._initError.asReadonly();
  /** True once we have a concrete operator to act as — screens gate their own data loads on this. */
  readonly ready = computed(() => !this._loading() && this._activeOperatorId() !== null);
  /** Convenience for write screens: the active operator's own ERP is the source of truth for
   * seat/trip inventory. Per the frontend guideline (Section 6 note) this should make several
   * write actions read-only in the UI — it's a UI-level guard only, the backend itself doesn't
   * enforce it, so don't treat a false value here as a security boundary. */
  readonly isExternallyManaged = computed(() => this._activeOperator()?.inventoryMode === 'ExternalApiManaged');

  private init$?: Observable<void>;

  /** Idempotent — safe to call from every screen; only does real work once per session. */
  ensureLoaded(): Observable<void> {
    if (!this.init$) {
      this.init$ = this.resolve().pipe(shareReplay(1));
    }
    return this.init$;
  }

  /** Platform Admin/Staff only — switch which operator every screen acts against. */
  setActiveOperatorId(id: string): void {
    const found = this._availableOperators().find((o) => o.id === id) ?? null;
    this._activeOperatorId.set(id);
    this._activeOperator.set(found);
  }

  /** Call after saving BusOperator profile edits so `activeOperator()` reflects the new data. */
  refreshActiveOperator(): Observable<BusOperator | null> {
    const id = this._activeOperatorId();
    if (!id) return of(null);
    return this.api.get<BusOperator>(`busoperators/${id}`).pipe(tap((op) => this._activeOperator.set(op)));
  }

  private resolve(): Observable<void> {
    this._loading.set(true);
    this._initError.set(null);

    return this.api.get<StaffProfile[]>('staffprofiles').pipe(
      map((profiles) => {
        const userId = this.auth.currentUser()?.userId;
        return profiles.find((p) => p.userId === userId)?.busOperatorId ?? null;
      }),
      switchMap((busOperatorId) => {
        if (busOperatorId) {
          this._isPlatformScope.set(false);
          this._activeOperatorId.set(busOperatorId);
          return this.api.get<BusOperator>(`busoperators/${busOperatorId}`).pipe(
            tap((op) => this._activeOperator.set(op)),
            map(() => void 0),
          );
        }

        this._isPlatformScope.set(true);
        return this.api.get<BusOperator[]>('busoperators').pipe(
          tap((ops) => this._availableOperators.set(ops)),
          map(() => void 0),
        );
      }),
      tap(() => this._loading.set(false)),
      catchError((err) => {
        this._initError.set('Could not resolve which operator you manage.');
        this._loading.set(false);
        return throwError(() => err);
      }),
    );
  }
}

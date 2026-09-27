import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TpCardComponent, TpSpinnerComponent } from '../../../shared/ui';
import { OperatorContextService } from '../services/operator-context.service';

/**
 * Wraps every Piece 4 screen. Resolves OperatorContextService once (see that service's
 * doc-comment for the two ways "which operator am I" gets resolved) before rendering any child
 * route, and — for platform Staff/Admin only — shows an operator picker so the rest of the panel
 * has a concrete BusOperator to act against.
 */
@Component({
  selector: 'tp-operator-shell',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet, TpCardComponent, TpSpinnerComponent],
  template: `
    <div class="tp-page tp-operator-shell">
      @if (ctx.loading()) {
        <div class="tp-operator-shell__loading">
          <tp-spinner size="lg" />
          <p class="tp-muted">Loading your operator workspace…</p>
        </div>
      } @else if (ctx.initError()) {
        <tp-card>
          <p>{{ ctx.initError() }}</p>
        </tp-card>
      } @else {
        @if (ctx.isPlatformScope()) {
          <tp-card class="tp-operator-shell__picker">
            <label class="tp-operator-shell__picker-label">
              Acting as operator
              <select
                [ngModel]="ctx.activeOperatorId()"
                (ngModelChange)="ctx.setActiveOperatorId($event)"
                name="operatorPicker"
              >
                @if (!ctx.activeOperatorId()) {
                  <option [ngValue]="null" disabled>Select an operator…</option>
                }
                @for (op of ctx.availableOperators(); track op.id) {
                  <option [ngValue]="op.id">{{ op.name }}</option>
                }
              </select>
            </label>
            <p class="tp-muted tp-operator-shell__picker-hint">
              You're signed in as platform staff — pick which bus operator's back-office you're managing.
            </p>
          </tp-card>
        }

        @if (ctx.ready()) {
          @if (ctx.isExternallyManaged()) {
            <div class="tp-operator-shell__banner">
              This operator runs their own ERP (ExternalApiManaged). Seat/trip-inventory writes here are for
              reference only — treat their own system as the source of truth.
            </div>
          }

          <nav class="tp-tabs" role="tablist">
            <a class="tp-tab" routerLink="profile" routerLinkActive="tp-tab--active">Profile &amp; Branches</a>
            <a class="tp-tab" routerLink="fleet" routerLinkActive="tp-tab--active">Fleet</a>
            <a class="tp-tab" routerLink="network" routerLinkActive="tp-tab--active">Network Setup</a>
            <a class="tp-tab" routerLink="trips" routerLinkActive="tp-tab--active">Trips &amp; Scheduling</a>
            <a class="tp-tab" routerLink="crew" routerLinkActive="tp-tab--active">Crew</a>
            <a class="tp-tab" routerLink="policies" routerLinkActive="tp-tab--active">Fare &amp; Policies</a>
          </nav>

          <router-outlet />
        } @else {
          <tp-card>
            <p class="tp-muted">Pick an operator above to get started.</p>
          </tp-card>
        }
      }
    </div>
  `,
  styles: [
    `
      .tp-operator-shell__loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--tp-space-3);
        padding: var(--tp-space-8) 0;
      }

      .tp-operator-shell__picker {
        margin-bottom: var(--tp-space-4);
      }

      .tp-operator-shell__picker-label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
        max-width: 320px;
      }

      .tp-operator-shell__picker-label select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 8px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-operator-shell__picker-hint {
        margin: 0;
      }

      .tp-operator-shell__banner {
        background: var(--tp-yellow-tint);
        border: 1px solid var(--tp-yellow-dark);
        border-radius: var(--tp-radius-md);
        padding: var(--tp-space-3) var(--tp-space-4);
        font-size: 13px;
        margin-bottom: var(--tp-space-4);
      }

      .tp-tabs {
        display: flex;
        gap: var(--tp-space-2);
        border-bottom: 1px solid var(--tp-border);
        margin-bottom: var(--tp-space-5);
        flex-wrap: wrap;
      }

      .tp-tab {
        border: none;
        background: transparent;
        padding: var(--tp-space-3) var(--tp-space-2);
        font-family: var(--tp-font-body);
        font-weight: 600;
        font-size: 14px;
        color: var(--tp-text-muted);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: color var(--tp-transition-fast), border-color var(--tp-transition-fast);
      }

      .tp-tab:hover {
        color: var(--tp-text);
      }

      .tp-tab--active {
        color: var(--tp-text);
        border-bottom-color: var(--tp-yellow-dark);
      }
    `,
  ],
})
export class OperatorShellComponent implements OnInit {
  protected readonly ctx = inject(OperatorContextService);

  ngOnInit(): void {
    this.ctx.ensureLoaded().subscribe();
  }
}

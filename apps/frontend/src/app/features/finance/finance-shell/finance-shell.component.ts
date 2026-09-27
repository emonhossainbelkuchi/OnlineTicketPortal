import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Piece 6 — Finance & Settlement Panel shell. Mounted once at 'finance/**',
 * renders the sub-nav across the seven screens and hosts <router-outlet> for
 * whichever one is active — same shape as the top-level ShellComponent, one
 * level down.
 *
 * Per the Frontend Guideline's design note for this piece: dense with
 * numbers, so this stays deliberately neutral (white/border, no yellow fill)
 * — individual screens reserve yellow for primary actions and key totals.
 *
 * RBAC Amendment v3 / Chunk 7 task 1: every link is now conditioned on the
 * actual capability payload rather than shown unconditionally to any Staff
 * account — a CounterStaff clerk with no finance permission at all
 * previously saw (and could click into) every one of these, only to be
 * bounced server-side or shown an empty list. ensureCapabilities() is
 * called eagerly here since this shell's own route only checks `roles:
 * ['Staff']` (no `permissions`), so role.guard.ts wouldn't otherwise have
 * triggered the GET /api/account/me load before this template renders.
 */
@Component({
  selector: 'tp-finance-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="tp-page">
      <div class="tp-finance__header">
        <h2>Finance &amp; Settlement</h2>
        <p class="tp-muted">Commission, invoices, payouts, settlements, ledgers, wallets &amp; currencies.</p>
      </div>

      <nav class="tp-finance__nav">
        @if (authService.hasPermission('Finance.Configure')) {
          <a routerLink="commissions" routerLinkActive="tp-finance__nav-link--active" class="tp-finance__nav-link">
            Commission Rules
          </a>
        }
        @if (authService.hasPermission('Finance.ReadPlatform') || authService.hasPermission('Finance.ReadOwnOperator')) {
          <a routerLink="wallets" routerLinkActive="tp-finance__nav-link--active" class="tp-finance__nav-link">
            Wallets &amp; Ledger
          </a>
          <a routerLink="settlements" routerLinkActive="tp-finance__nav-link--active" class="tp-finance__nav-link">
            Settlements
          </a>
          <a routerLink="invoices" routerLinkActive="tp-finance__nav-link--active" class="tp-finance__nav-link">
            Invoices
          </a>
          <a routerLink="payouts" routerLinkActive="tp-finance__nav-link--active" class="tp-finance__nav-link">
            Payouts
          </a>
        }
        @if (authService.hasPermission('Finance.Configure')) {
          <a routerLink="config" routerLinkActive="tp-finance__nav-link--active" class="tp-finance__nav-link">
            System Config
          </a>
        }
        @if (authService.hasPermission('Finance.Reconcile')) {
          <a routerLink="reconciliation" routerLinkActive="tp-finance__nav-link--active" class="tp-finance__nav-link">
            Reconciliation
          </a>
        }
      </nav>

      <div class="tp-finance__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .tp-finance__header {
        margin-bottom: var(--tp-space-5);
      }

      .tp-finance__header h2 {
        margin-bottom: var(--tp-space-1);
      }

      .tp-finance__nav {
        display: flex;
        flex-wrap: wrap;
        gap: var(--tp-space-2);
        border-bottom: 1px solid var(--tp-border);
        margin-bottom: var(--tp-space-5);
        padding-bottom: var(--tp-space-3);
      }

      .tp-finance__nav-link {
        font-size: 14px;
        font-weight: 600;
        color: var(--tp-text-muted);
        padding: var(--tp-space-2) var(--tp-space-3);
        border-radius: var(--tp-radius-sm);
        border: 1px solid transparent;
        transition: color var(--tp-transition-fast), border-color var(--tp-transition-fast), background var(--tp-transition-fast);
      }

      .tp-finance__nav-link:hover {
        color: var(--tp-text);
        background: var(--tp-bg-soft);
      }

      .tp-finance__nav-link--active {
        color: var(--tp-text);
        border-color: var(--tp-yellow-dark);
        background: var(--tp-yellow-tint);
      }

      .tp-finance__content {
        display: block;
      }
    `,
  ],
})
export class FinanceShellComponent {
  protected readonly authService = inject(AuthService);

  constructor() {
    // Cached after the first call — safe to call every time this shell mounts.
    this.authService.ensureCapabilities().subscribe();
  }
}

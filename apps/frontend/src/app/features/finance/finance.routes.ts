import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

/**
 * Piece 6 — Finance & Settlement Panel. Guard matches Counter's (Piece 5):
 * only 'Staff' is checked here, same convention noted in role.guard.ts —
 * Admin uses the separate React admin app and Operator has its own Angular
 * panel (Piece 4), so in practice only Staff reaches this module.
 *
 * RBAC Amendment v3 task 7: 'commissions' and 'config' are gated on
 * Finance.Configure, which PermissionMatrix.cs grants to nobody but Admin
 * (both Platform Finance and Operator Finance are explicitly read-only on
 * commission/tax/provider rules per the matrix) — so both Platform and
 * Operator Finance staff are correctly turned away from those two screens
 * now, where previously any Staff account could open them. The read-only
 * screens (wallets/settlements/invoices/payouts) are deliberately left
 * without an added permission: whether a session can read is
 * Finance.ReadPlatform OR Finance.ReadOwnOperator depending on whether it's
 * platform- or operator-scoped, and this guard only expresses "must hold
 * ALL listed permissions" — it can't express that OR cleanly. The actual
 * security boundary for those screens is enforced server-side by whichever
 * finance controller backs them (Chunk 7's job per RBAC Amendment v3's
 * chunk-ownership table — done: see CommissionRulesController etc. and the
 * six settlement/invoice/payout/wallet controllers), not by this route guard.
 *
 * 'reconciliation' (Chunk 7 task 4) IS gated here, on Finance.Reconcile —
 * unlike the OR case above, that permission maps to exactly one role
 * (Platform Finance/Admin), so a plain "must hold this permission" guard
 * expresses it correctly.
 */
export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./finance-shell/finance-shell.component').then((m) => m.FinanceShellComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Staff'] },
    children: [
      { path: '', redirectTo: 'commissions', pathMatch: 'full' },
      {
        path: 'commissions',
        loadComponent: () => import('./commission-rules/commission-rules.component').then((m) => m.CommissionRulesComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Finance.Configure'] },
        title: 'Commission Rules — Finance',
      },
      {
        path: 'wallets',
        loadComponent: () => import('./wallets-ledger/wallets-ledger.component').then((m) => m.WalletsLedgerComponent),
        title: 'Wallets & Ledger — Finance',
      },
      {
        path: 'settlements',
        loadComponent: () => import('./settlements/settlements.component').then((m) => m.SettlementsComponent),
        title: 'Settlements — Finance',
      },
      {
        path: 'settlements/:id',
        loadComponent: () =>
          import('./settlements/settlement-detail.component').then((m) => m.SettlementDetailComponent),
        title: 'Settlement — Finance',
      },
      {
        path: 'invoices',
        loadComponent: () => import('./invoices-payouts/invoices.component').then((m) => m.InvoicesComponent),
        title: 'Invoices — Finance',
      },
      {
        path: 'payouts',
        loadComponent: () => import('./invoices-payouts/payouts.component').then((m) => m.PayoutsComponent),
        title: 'Payouts — Finance',
      },
      {
        path: 'config',
        loadComponent: () => import('./system-config/system-config.component').then((m) => m.SystemConfigComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Finance.Configure'] },
        title: 'System Config — Finance',
      },
      {
        path: 'reconciliation',
        loadComponent: () =>
          import('./reconciliation/reconciliation.component').then((m) => m.ReconciliationComponent),
        canActivate: [roleGuard],
        data: { permissions: ['Finance.Reconcile'] },
        title: 'Reconciliation — Finance',
      },
    ],
  },
];

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LedgerGap } from '@ticketportal-mono/models';
import {
  TpButtonDirective,
  TpCardComponent,
  TpModalComponent,
  TpSpinnerComponent,
  TpTableColumn,
  TpTableComponent,
} from '../../../shared/ui';
import { ToastService } from '../../../core/services/toast.service';
import { FinanceApiService } from '../services/finance-api.service';
import { OperatorLookupService } from '../services/operator-lookup.service';
import { OperatorFilterComponent } from '../shared/operator-filter.component';
import { formatDate, formatMoney } from '../shared/money.util';

interface LedgerGapRow {
  [key: string]: unknown;
  bookingId: string;
  pnr: string;
  operatorName: string;
  saleChannel: string;
  amountDisplay: string;
  confirmedAt: string;
  reason: string;
}

/**
 * RBAC Amendment v3 / Chunk 7 task 4 ("Missing-rule visibility") — the "confirmed bookings with
 * no ledger rows" list. A gap here means a booking that really was paid/confirmed but whose
 * commission-ledger entry never got written (see FinanceReconciliationService for the full
 * rationale) — left alone, it makes every settlement that should include it silently understate
 * what the operator is owed (or owes us). Finance.Reconcile only — see finance.routes.ts.
 */
@Component({
  selector: 'tp-reconciliation',
  standalone: true,
  imports: [
    CommonModule,
    TpCardComponent,
    TpTableComponent,
    TpButtonDirective,
    TpModalComponent,
    TpSpinnerComponent,
    OperatorFilterComponent,
  ],
  template: `
    <tp-card>
      <div class="tp-panel-toolbar">
        <div>
          <h3>Ledger Reconciliation</h3>
          <p class="tp-muted">
            Confirmed bookings whose commission ledger entry never got posted — usually because no
            commission rule was configured yet at the time. Re-posting is safe: it never creates a
            second entry for a booking that already has one.
          </p>
        </div>
      </div>

      <div class="tp-panel-filter">
        <tp-operator-filter [value]="operatorFilter()" (valueChange)="onOperatorFilterChange($event)" />
      </div>

      @if (loading()) {
        <div class="tp-panel-loading"><tp-spinner /></div>
      } @else {
        <tp-table
          [columns]="columns"
          [rows]="rows()"
          emptyTitle="No gaps found"
          emptyMessage="Every confirmed booking in scope has a matching ledger entry."
        >
          <ng-template #rowActions let-row>
            <button tpButton variant="ghost" size="sm" (click)="openRepost(row)">Re-post</button>
          </ng-template>
        </tp-table>
      }
    </tp-card>

    <tp-modal [open]="!!repostTarget()" title="Re-post Ledger Entry" (closed)="repostTarget.set(null)">
      <p>
        Post the missing commission ledger entry for booking <strong>{{ repostTarget()?.pnr }}</strong>
        ({{ repostTarget()?.amountDisplay }})?
      </p>
      <p class="tp-muted">
        This resolves the active commission rule for {{ repostTarget()?.operatorName }} right now and
        posts exactly the entry the original confirmation would have posted. It fails safely (with no
        change) if no active rule exists yet, or if an entry already exists.
      </p>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="repostTarget.set(null)">Cancel</button>
        <button tpButton variant="primary" [disabled]="submitting()" (click)="submitRepost()">
          {{ submitting() ? 'Posting…' : 'Re-post' }}
        </button>
      </div>
    </tp-modal>
  `,
  styles: [
    `
      .tp-panel-toolbar {
        margin-bottom: var(--tp-space-4);
      }

      .tp-panel-toolbar h3 {
        margin-bottom: var(--tp-space-1);
      }

      .tp-panel-filter {
        margin-bottom: var(--tp-space-4);
      }

      .tp-panel-loading {
        display: flex;
        justify-content: center;
        padding: var(--tp-space-7) 0;
      }

      .tp-muted {
        color: var(--tp-text-muted);
        font-size: 13px;
      }
    `,
  ],
})
export class ReconciliationComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  protected readonly operatorLookup = inject(OperatorLookupService);
  private readonly toast = inject(ToastService);

  protected readonly columns: TpTableColumn[] = [
    { key: 'pnr', label: 'PNR' },
    { key: 'operatorName', label: 'Operator' },
    { key: 'saleChannel', label: 'Channel' },
    { key: 'amountDisplay', label: 'Amount', align: 'right' },
    { key: 'confirmedAt', label: 'Confirmed' },
    { key: 'reason', label: 'Reason' },
  ];

  private readonly gaps = signal<LedgerGap[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly operatorFilter = signal<string | null>(null);
  protected readonly repostTarget = signal<LedgerGapRow | null>(null);

  protected readonly rows = computed<LedgerGapRow[]>(() =>
    this.gaps().map((gap) => ({
      bookingId: gap.bookingId,
      pnr: gap.pnr,
      operatorName: this.operatorLookup.nameFor(gap.busOperatorId),
      saleChannel: gap.saleChannel,
      amountDisplay: formatMoney(gap.grandTotal, gap.currency),
      confirmedAt: formatDate(gap.confirmedAtUtc),
      reason: gap.reason,
    })),
  );

  ngOnInit(): void {
    this.operatorLookup.ensureLoaded();
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.financeApi.listLedgerGaps(this.operatorFilter()).subscribe({
      next: (gaps) => {
        this.gaps.set(gaps);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onOperatorFilterChange(operatorId: string | null): void {
    this.operatorFilter.set(operatorId);
    this.load();
  }

  openRepost(row: LedgerGapRow): void {
    this.repostTarget.set(row);
  }

  submitRepost(): void {
    const target = this.repostTarget();
    if (!target) return;

    this.submitting.set(true);
    this.financeApi.repostLedgerGap(target.bookingId).subscribe({
      next: () => {
        this.toast.success(`Ledger entry posted for booking ${target.pnr}.`);
        this.submitting.set(false);
        this.repostTarget.set(null);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorSettlementDetail } from '@ticketportal-mono/models';
import {
  TpButtonDirective,
  TpCardComponent,
  TpModalComponent,
  TpSpinnerComponent,
  TpStatusPillComponent,
  TpTableColumn,
  TpTableComponent,
} from '../../../shared/ui';
import { ToastService } from '../../../core/services/toast.service';
import { FinanceApiService } from '../services/finance-api.service';
import { OperatorLookupService } from '../services/operator-lookup.service';
import { formatDate, formatMoney } from '../shared/money.util';

interface SettlementItemRow {
  [key: string]: unknown;
  itemType: string;
  saleChannel: string;
  ticketFareDisplay: string;
  platformChargeDisplay: string;
  gatewayChargeDisplay: string;
  refundDisplay: string;
  netAmountDisplay: string;
}

/**
 * Screen 3b — one settlement's full breakdown. Every item row was written
 * by SettlementGenerationService alongside the parent settlement (read-only,
 * see finance.model.ts) — this page never edits a line item, only approves
 * the settlement as a whole.
 *
 * RBAC Amendment v3 / Chunk 7 task 6 ("Plain-language settlement summary"):
 * the breakdown grid below is accurate but assumes the reader already knows
 * what "Direction" and a signed "Net Amount" mean. summaryText() turns the
 * same numbers into one sentence — who owes whom, how much, over how many
 * transactions — using the exact sign convention SettlementGenerationService
 * writes (positive netAmount => PlatformPaysOperator, negative =>
 * OperatorPaysPlatform, zero => NetZero).
 */
@Component({
  selector: 'tp-settlement-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TpCardComponent,
    TpTableComponent,
    TpButtonDirective,
    TpModalComponent,
    TpSpinnerComponent,
    TpStatusPillComponent,
  ],
  template: `
    <a routerLink="/finance/settlements" class="tp-back-link">&larr; Back to Settlements</a>

    @if (loading()) {
      <tp-card>
        <div class="tp-panel-loading"><tp-spinner /></div>
      </tp-card>
    } @else if (settlement(); as s) {
      <tp-card>
        <div class="tp-panel-toolbar">
          <div>
            <h3>{{ s.settlementNo }}</h3>
            <p class="tp-muted">{{ operatorLookup.nameFor(s.busOperatorId) }} · {{ formatDate(s.fromDate) }} – {{ formatDate(s.toDate) }}</p>
          </div>
          <div class="tp-panel-toolbar__actions">
            <tp-status-pill [status]="s.status" />
            @if (s.status === 'Draft') {
              <button tpButton variant="primary" (click)="openApprove()">Approve</button>
            }
          </div>
        </div>

        <p class="tp-settlement-summary">{{ summaryText() }}</p>

        <dl class="tp-settlement-breakdown">
          <div><dt>Direction</dt><dd>{{ s.direction }}</dd></div>
          <div><dt>Online Gross</dt><dd>{{ formatMoney(s.onlineGrossAmount) }}</dd></div>
          <div><dt>Offline (Counter) Gross</dt><dd>{{ formatMoney(s.offlineGrossAmount) }}</dd></div>
          <div><dt>Platform Charge</dt><dd>{{ formatMoney(s.platformCharge) }}</dd></div>
          <div><dt>Gateway Charge</dt><dd>{{ formatMoney(s.gatewayCharge) }}</dd></div>
          <div><dt>Refunds</dt><dd>{{ formatMoney(s.refundAmount) }}</dd></div>
          <div class="tp-settlement-breakdown__net"><dt>Net Amount</dt><dd>{{ formatMoney(s.netAmount) }}</dd></div>
          @if (s.remarks) {
            <div class="tp-settlement-breakdown__remarks"><dt>Remarks</dt><dd>{{ s.remarks }}</dd></div>
          }
        </dl>
      </tp-card>

      <tp-card>
        <h4>Line Items</h4>
        <tp-table [columns]="itemColumns" [rows]="itemRows()" emptyTitle="No line items" />
      </tp-card>
    }

    <tp-modal [open]="showApprove()" title="Approve Settlement" (closed)="showApprove.set(false)">
      <p>Approve this settlement? This locks the figures in and makes it eligible for invoicing/payout.</p>
      <label class="tp-finance-form__standalone-label">
        Remarks (optional)
        <textarea [formControl]="approveRemarks" rows="2"></textarea>
      </label>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="showApprove.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="submitting()" (click)="submitApprove()">
          {{ submitting() ? 'Approving…' : 'Approve' }}
        </button>
      </div>
    </tp-modal>
  `,
  styles: [
    `
      .tp-back-link {
        display: inline-block;
        margin-bottom: var(--tp-space-4);
        font-size: 14px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-back-link:hover {
        color: var(--tp-text);
      }

      .tp-panel-loading {
        display: flex;
        justify-content: center;
        padding: var(--tp-space-7) 0;
      }

      .tp-panel-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--tp-space-4);
        margin-bottom: var(--tp-space-5);
      }

      .tp-panel-toolbar h3 {
        margin-bottom: var(--tp-space-1);
      }

      .tp-panel-toolbar__actions {
        display: flex;
        align-items: center;
        gap: var(--tp-space-3);
      }

      .tp-settlement-summary {
        font-size: 15px;
        color: var(--tp-text);
        background: var(--tp-bg-soft);
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: var(--tp-space-3) var(--tp-space-4);
        margin-bottom: var(--tp-space-5);
      }

      h4 {
        margin-bottom: var(--tp-space-4);
      }

      .tp-settlement-breakdown {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--tp-space-4);
      }

      .tp-settlement-breakdown div {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: var(--tp-space-3) var(--tp-space-4);
      }

      .tp-settlement-breakdown dt {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--tp-text-muted);
        margin-bottom: var(--tp-space-1);
      }

      .tp-settlement-breakdown dd {
        font-size: 16px;
        font-weight: 700;
        color: var(--tp-text);
      }

      .tp-settlement-breakdown__net {
        border-color: var(--tp-yellow-dark) !important;
        background: var(--tp-yellow-tint);
      }

      .tp-settlement-breakdown__remarks {
        grid-column: 1 / -1;
      }

      .tp-finance-form__standalone-label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
        margin-top: var(--tp-space-3);
      }

      .tp-finance-form__standalone-label textarea {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
        resize: vertical;
      }
    `,
  ],
})
export class SettlementDetailComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  protected readonly operatorLookup = inject(OperatorLookupService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;

  protected readonly itemColumns: TpTableColumn[] = [
    { key: 'itemType', label: 'Type' },
    { key: 'saleChannel', label: 'Channel' },
    { key: 'ticketFareDisplay', label: 'Ticket Fare', align: 'right' },
    { key: 'platformChargeDisplay', label: 'Platform Charge', align: 'right' },
    { key: 'gatewayChargeDisplay', label: 'Gateway Charge', align: 'right' },
    { key: 'refundDisplay', label: 'Refund', align: 'right' },
    { key: 'netAmountDisplay', label: 'Net Amount', align: 'right' },
  ];

  protected readonly settlement = signal<OperatorSettlementDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly showApprove = signal(false);
  protected readonly approveRemarks = this.fb.nonNullable.control('');

  protected readonly itemRows = computed<SettlementItemRow[]>(() =>
    (this.settlement()?.items ?? []).map((item) => ({
      itemType: item.itemType,
      saleChannel: item.saleChannel,
      ticketFareDisplay: formatMoney(item.ticketFare),
      platformChargeDisplay: formatMoney(item.platformCharge),
      gatewayChargeDisplay: formatMoney(item.gatewayCharge),
      refundDisplay: formatMoney(item.refundAmount),
      netAmountDisplay: formatMoney(item.netAmount),
    })),
  );

  // RBAC Amendment v3 / Chunk 7 task 6. netAmount is signed (see
  // SettlementGenerationService) — direction already says who owes whom in
  // words, so the amount here is always shown unsigned.
  protected readonly summaryText = computed<string>(() => {
    const s = this.settlement();
    if (!s) return '';

    const operatorName = this.operatorLookup.nameFor(s.busOperatorId);
    const period = `${formatDate(s.fromDate)} – ${formatDate(s.toDate)}`;
    const count = s.items.length;
    const txnWord = count === 1 ? 'transaction' : 'transactions';
    const amount = formatMoney(Math.abs(s.netAmount));

    switch (s.direction) {
      case 'PlatformPaysOperator':
        return `For ${period} (${count} ${txnWord}), TicketPortal owes ${operatorName} ${amount}.`;
      case 'OperatorPaysPlatform':
        return `For ${period} (${count} ${txnWord}), ${operatorName} owes TicketPortal ${amount}.`;
      default:
        return `For ${period} (${count} ${txnWord}), nothing is owed either way — this settlement nets to zero.`;
    }
  });

  ngOnInit(): void {
    this.operatorLookup.ensureLoaded();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.financeApi.getSettlement(id).subscribe({
      next: (settlement) => {
        this.settlement.set(settlement);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openApprove(): void {
    this.approveRemarks.setValue('');
    this.showApprove.set(true);
  }

  submitApprove(): void {
    const s = this.settlement();
    if (!s) return;

    this.submitting.set(true);
    this.financeApi.approveSettlement(s.id, { remarks: this.approveRemarks.value || null }).subscribe({
      next: () => {
        this.toast.success(`Settlement ${s.settlementNo} approved.`);
        this.submitting.set(false);
        this.showApprove.set(false);
        this.load(s.id);
      },
      error: () => this.submitting.set(false),
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OperatorSettlement } from '@ticketportal-mono/models';
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
import { OperatorFilterComponent } from '../shared/operator-filter.component';
import { formatDate, formatMoney } from '../shared/money.util';

interface SettlementRow {
  [key: string]: unknown;
  id: string;
  settlementNo: string;
  operatorName: string;
  period: string;
  direction: string;
  status: string;
  netAmountDisplay: string;
  canApprove: boolean;
}

/**
 * Screen 3a — the reconciliation engine's output list. Every field on a
 * settlement is computed server-side by SettlementGenerationService from
 * real PlatformLedger rows (see finance.model.ts) — Generate only ever takes
 * an operator + date range, never the money figures themselves. Approve is
 * platform-staff/Admin only regardless of which operator it's for.
 */
@Component({
  selector: 'tp-settlements',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TpCardComponent,
    TpTableComponent,
    TpButtonDirective,
    TpModalComponent,
    TpSpinnerComponent,
    TpStatusPillComponent,
    OperatorFilterComponent,
  ],
  template: `
    <tp-card>
      <div class="tp-panel-toolbar">
        <div>
          <h3>Settlements</h3>
          <p class="tp-muted">Net reconciliation between the platform and each operator for a date range.</p>
        </div>
        <button tpButton variant="primary" (click)="openGenerate()">+ Generate Settlement</button>
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
          emptyTitle="No settlements yet"
          emptyMessage="Generate one for an operator and date range to reconcile online and counter sales."
        >
          <ng-template #rowActions let-row>
            <tp-status-pill [status]="row.status" />
            <button tpButton variant="ghost" size="sm" (click)="view(row.id)">View</button>
            @if (row.canApprove) {
              <button tpButton variant="ghost" size="sm" (click)="openApprove(row)">Approve</button>
            }
          </ng-template>
        </tp-table>
      }
    </tp-card>

    <tp-modal [open]="showGenerate()" title="Generate Settlement" (closed)="showGenerate.set(false)">
      <form [formGroup]="generateForm" (ngSubmit)="submitGenerate()" class="tp-finance-form">
        <label>
          Bus Operator
          <select formControlName="busOperatorId">
            <option value="" disabled>Select an operator…</option>
            @for (op of operatorLookup.operators(); track op.id) {
              <option [value]="op.id">{{ op.name }}</option>
            }
          </select>
        </label>

        <div class="tp-finance-form__row">
          <label>
            From Date
            <input type="date" formControlName="fromDate" />
          </label>
          <label>
            To Date
            <input type="date" formControlName="toDate" />
          </label>
        </div>

        <label>
          Remarks (optional)
          <textarea formControlName="remarks" rows="2"></textarea>
        </label>
      </form>

      <div modal-footer>
        <button tpButton variant="secondary" (click)="showGenerate.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="generateForm.invalid || submitting()" (click)="submitGenerate()">
          {{ submitting() ? 'Generating…' : 'Generate' }}
        </button>
      </div>
    </tp-modal>

    <tp-modal [open]="!!approveTarget()" title="Approve Settlement" (closed)="approveTarget.set(null)">
      <p>
        Approve settlement <strong>{{ approveTarget()?.settlementNo }}</strong>? This locks the figures in and makes
        it eligible for invoicing/payout.
      </p>
      <label class="tp-finance-form__standalone-label">
        Remarks (optional)
        <textarea [formControl]="approveRemarks" rows="2"></textarea>
      </label>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="approveTarget.set(null)">Cancel</button>
        <button tpButton variant="primary" [disabled]="submitting()" (click)="submitApprove()">
          {{ submitting() ? 'Approving…' : 'Approve' }}
        </button>
      </div>
    </tp-modal>
  `,
  styles: [
    `
      .tp-panel-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--tp-space-4);
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

      .tp-finance-form {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-4);
      }

      .tp-finance-form__row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--tp-space-4);
      }

      .tp-finance-form label,
      .tp-finance-form__standalone-label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-finance-form__standalone-label {
        margin-top: var(--tp-space-4);
      }

      .tp-finance-form input,
      .tp-finance-form select,
      .tp-finance-form textarea,
      .tp-finance-form__standalone-label textarea {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
        resize: vertical;
      }

      .tp-finance-form input:focus,
      .tp-finance-form select:focus,
      .tp-finance-form textarea:focus,
      .tp-finance-form__standalone-label textarea:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }
    `,
  ],
})
export class SettlementsComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  protected readonly operatorLookup = inject(OperatorLookupService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly columns: TpTableColumn[] = [
    { key: 'settlementNo', label: 'Settlement No.' },
    { key: 'operatorName', label: 'Operator' },
    { key: 'period', label: 'Period' },
    { key: 'direction', label: 'Direction' },
    { key: 'netAmountDisplay', label: 'Net Amount', align: 'right' },
  ];

  private readonly settlements = signal<OperatorSettlement[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly showGenerate = signal(false);
  protected readonly operatorFilter = signal<string | null>(null);
  protected readonly approveTarget = signal<OperatorSettlement | null>(null);
  protected readonly approveRemarks = this.fb.nonNullable.control('');

  protected readonly rows = computed<SettlementRow[]>(() =>
    this.settlements().map((settlement) => ({
      id: settlement.id,
      settlementNo: settlement.settlementNo,
      operatorName: this.operatorLookup.nameFor(settlement.busOperatorId),
      period: `${formatDate(settlement.fromDate)} – ${formatDate(settlement.toDate)}`,
      direction: settlement.direction,
      status: settlement.status,
      netAmountDisplay: formatMoney(settlement.netAmount),
      canApprove: settlement.status === 'Draft',
    })),
  );

  protected readonly generateForm = this.fb.nonNullable.group({
    busOperatorId: ['', Validators.required],
    fromDate: ['', Validators.required],
    toDate: ['', Validators.required],
    remarks: [''],
  });

  ngOnInit(): void {
    this.operatorLookup.ensureLoaded();
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.financeApi.listSettlements(this.operatorFilter()).subscribe({
      next: (settlements) => {
        this.settlements.set(settlements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onOperatorFilterChange(operatorId: string | null): void {
    this.operatorFilter.set(operatorId);
    this.load();
  }

  view(id: string): void {
    this.router.navigate(['/finance/settlements', id]);
  }

  openGenerate(): void {
    this.generateForm.reset({ busOperatorId: '', fromDate: '', toDate: '', remarks: '' });
    this.showGenerate.set(true);
  }

  submitGenerate(): void {
    if (this.generateForm.invalid) return;
    const raw = this.generateForm.getRawValue();

    this.submitting.set(true);
    this.financeApi
      .generateSettlement({
        busOperatorId: raw.busOperatorId,
        fromDate: raw.fromDate,
        toDate: raw.toDate,
        remarks: raw.remarks || null,
      })
      .subscribe({
        next: (settlement) => {
          this.toast.success(`Settlement ${settlement.settlementNo} generated.`);
          this.submitting.set(false);
          this.showGenerate.set(false);
          this.router.navigate(['/finance/settlements', settlement.id]);
        },
        error: () => this.submitting.set(false),
      });
  }

  openApprove(row: SettlementRow): void {
    const settlement = this.settlements().find((s) => s.id === row.id) ?? null;
    this.approveRemarks.setValue('');
    this.approveTarget.set(settlement);
  }

  submitApprove(): void {
    const target = this.approveTarget();
    if (!target) return;

    this.submitting.set(true);
    this.financeApi.approveSettlement(target.id, { remarks: this.approveRemarks.value || null }).subscribe({
      next: () => {
        this.toast.success(`Settlement ${target.settlementNo} approved.`);
        this.submitting.set(false);
        this.approveTarget.set(null);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}

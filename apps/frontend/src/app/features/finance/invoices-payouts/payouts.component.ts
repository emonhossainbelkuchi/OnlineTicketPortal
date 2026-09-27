import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OperatorPayout, OperatorSettlement } from '@ticketportal-mono/models';
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

interface PayoutRow {
  [key: string]: unknown;
  id: string;
  payoutNo: string;
  operatorName: string;
  amountDisplay: string;
  status: string;
  paidAt: string;
  notes: string;
  canProcess: boolean;
  canReleaseOrComplete: boolean;
}

/**
 * Screen 6 — money actually leaving the platform's account to an operator.
 * Create reserves the amount from the operator's AvailablePayoutBalance
 * immediately (PayoutProcessingService.CreateAsync); Process/Complete/Fail/
 * Cancel are platform-staff/Admin only — see OperatorPayoutsController's
 * class comment for why the operator being paid never confirms their own
 * payout. Pending AND Processing can both go straight to Complete/Fail/
 * Cancel (PayoutProcessingService) — Process is just the "I've started the
 * transfer" checkpoint in between, not a required step.
 */
@Component({
  selector: 'tp-payouts',
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
          <h3>Payouts</h3>
          <p class="tp-muted">Money paid out from the platform to an operator, against their available balance.</p>
        </div>
        <button tpButton variant="primary" (click)="openCreate()">+ New Payout</button>
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
          emptyTitle="No payouts yet"
          emptyMessage="Create one against an operator's available payout balance."
        >
          <ng-template #rowActions let-row>
            <tp-status-pill [status]="row.status" />
            @if (row.canProcess) {
              <button tpButton variant="ghost" size="sm" (click)="process(row.id)">Process</button>
            }
            @if (row.canReleaseOrComplete) {
              <button tpButton variant="ghost" size="sm" (click)="openComplete(row)">Complete</button>
              <button tpButton variant="ghost" size="sm" (click)="openRelease(row, 'fail')">Fail</button>
              <button tpButton variant="ghost" size="sm" (click)="openRelease(row, 'cancel')">Cancel</button>
            }
          </ng-template>
        </tp-table>
      }
    </tp-card>

    <tp-modal [open]="showCreate()" title="New Payout" (closed)="showCreate.set(false)">
      <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="tp-finance-form">
        <label>
          Bus Operator
          <select formControlName="busOperatorId">
            <option value="" disabled>Select an operator…</option>
            @for (op of operatorLookup.operators(); track op.id) {
              <option [value]="op.id">{{ op.name }}</option>
            }
          </select>
        </label>

        <label>
          Link to Settlement (optional)
          <select formControlName="operatorSettlementId">
            <option value="">(none)</option>
            @for (settlement of settlementsForOperator(createForm.controls.busOperatorId.value); track settlement.id) {
              <option [value]="settlement.id">{{ settlement.settlementNo }} — {{ formatMoney(settlement.netAmount) }}</option>
            }
          </select>
        </label>

        <div class="tp-finance-form__row">
          <label>
            Amount
            <input type="number" step="0.01" min="0.01" formControlName="amount" />
          </label>
          <label>
            Currency
            <input type="text" maxlength="3" formControlName="currency" style="text-transform: uppercase" />
          </label>
        </div>

        <label>
          Notes (optional)
          <textarea formControlName="notes" rows="2"></textarea>
        </label>
      </form>

      <div modal-footer>
        <button tpButton variant="secondary" (click)="showCreate.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="createForm.invalid || submitting()" (click)="submitCreate()">
          {{ submitting() ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </tp-modal>

    <tp-modal [open]="!!completeTarget()" title="Complete Payout" (closed)="completeTarget.set(null)">
      <p>
        Confirm the bank transfer for payout <strong>{{ completeTarget()?.payoutNo }}</strong> — this marks it Paid.
      </p>
      <label class="tp-finance-form__standalone-label">
        Bank Transaction Reference
        <input type="text" [formControl]="bankReference" />
      </label>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="completeTarget.set(null)">Back</button>
        <button tpButton variant="primary" [disabled]="!bankReference.value.trim() || submitting()" (click)="submitComplete()">
          {{ submitting() ? 'Confirming…' : 'Mark Paid' }}
        </button>
      </div>
    </tp-modal>

    <tp-modal
      [open]="!!releaseTarget()"
      [title]="releaseAction() === 'fail' ? 'Fail Payout' : 'Cancel Payout'"
      (closed)="releaseTarget.set(null)"
    >
      <p>
        {{ releaseAction() === 'fail' ? 'Mark' : 'Cancel' }} payout <strong>{{ releaseTarget()?.payoutNo }}</strong>?
        This releases the reserved amount back to the operator's available balance. A reason is required.
      </p>
      <label class="tp-finance-form__standalone-label">
        Reason
        <textarea [formControl]="releaseReason" rows="2"></textarea>
      </label>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="releaseTarget.set(null)">Back</button>
        <button tpButton variant="danger" [disabled]="!releaseReason.value.trim() || submitting()" (click)="submitRelease()">
          {{ submitting() ? 'Saving…' : releaseAction() === 'fail' ? 'Mark Failed' : 'Cancel Payout' }}
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
      .tp-finance-form__standalone-label input,
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
      .tp-finance-form__standalone-label input:focus,
      .tp-finance-form__standalone-label textarea:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }
    `,
  ],
})
export class PayoutsComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  protected readonly operatorLookup = inject(OperatorLookupService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly formatMoney = formatMoney;

  protected readonly columns: TpTableColumn[] = [
    { key: 'payoutNo', label: 'Payout No.' },
    { key: 'operatorName', label: 'Operator' },
    { key: 'amountDisplay', label: 'Amount', align: 'right' },
    { key: 'paidAt', label: 'Paid At' },
    { key: 'notes', label: 'Notes' },
  ];

  private readonly payouts = signal<OperatorPayout[]>([]);
  private readonly settlements = signal<OperatorSettlement[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly operatorFilter = signal<string | null>(null);
  protected readonly showCreate = signal(false);
  protected readonly completeTarget = signal<OperatorPayout | null>(null);
  protected readonly releaseTarget = signal<OperatorPayout | null>(null);
  protected readonly releaseAction = signal<'fail' | 'cancel'>('fail');
  protected readonly bankReference = this.fb.nonNullable.control('');
  protected readonly releaseReason = this.fb.nonNullable.control('');

  protected readonly rows = computed<PayoutRow[]>(() =>
    this.payouts().map((payout) => {
      const canReleaseOrComplete = payout.status === 'Pending' || payout.status === 'Processing';
      return {
        id: payout.id,
        payoutNo: payout.payoutNo,
        operatorName: this.operatorLookup.nameFor(payout.busOperatorId),
        amountDisplay: formatMoney(payout.amount, payout.currency),
        status: payout.status,
        paidAt: formatDate(payout.paidAtUtc),
        notes: payout.notes ?? '—',
        canProcess: payout.status === 'Pending',
        canReleaseOrComplete,
      };
    }),
  );

  protected readonly createForm = this.fb.nonNullable.group({
    busOperatorId: ['', Validators.required],
    operatorSettlementId: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['BDT', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    notes: [''],
  });

  ngOnInit(): void {
    this.operatorLookup.ensureLoaded();
    this.load();
    this.financeApi.listSettlements().subscribe({ next: (settlements) => this.settlements.set(settlements) });
  }

  private load(): void {
    this.loading.set(true);
    this.financeApi.listPayouts(this.operatorFilter()).subscribe({
      next: (payouts) => {
        this.payouts.set(payouts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Plain method (not a computed signal) since it derives from a FormControl's live value, not a signal. */
  protected settlementsForOperator(operatorId: string): OperatorSettlement[] {
    if (!operatorId) return [];
    return this.settlements().filter((s) => s.busOperatorId === operatorId && s.status === 'Approved');
  }

  onOperatorFilterChange(operatorId: string | null): void {
    this.operatorFilter.set(operatorId);
    this.load();
  }

  openCreate(): void {
    this.createForm.reset({ busOperatorId: '', operatorSettlementId: '', amount: 0, currency: 'BDT', notes: '' });
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    const raw = this.createForm.getRawValue();

    this.submitting.set(true);
    this.financeApi
      .createPayout({
        busOperatorId: raw.busOperatorId,
        operatorSettlementId: raw.operatorSettlementId || null,
        amount: raw.amount,
        currency: raw.currency.toUpperCase(),
        notes: raw.notes || null,
      })
      .subscribe({
        next: (payout) => {
          this.toast.success(`Payout ${payout.payoutNo} created.`);
          this.submitting.set(false);
          this.showCreate.set(false);
          this.load();
        },
        error: () => this.submitting.set(false),
      });
  }

  process(id: string): void {
    this.submitting.set(true);
    this.financeApi.processPayout(id).subscribe({
      next: () => {
        this.toast.success('Payout moved to Processing.');
        this.submitting.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  openComplete(row: PayoutRow): void {
    const payout = this.payouts().find((p) => p.id === row.id) ?? null;
    this.bankReference.setValue('');
    this.completeTarget.set(payout);
  }

  submitComplete(): void {
    const target = this.completeTarget();
    if (!target || !this.bankReference.value.trim()) return;

    this.submitting.set(true);
    this.financeApi.completePayout(target.id, { bankTransactionReference: this.bankReference.value.trim() }).subscribe({
      next: () => {
        this.toast.success(`Payout ${target.payoutNo} marked Paid.`);
        this.submitting.set(false);
        this.completeTarget.set(null);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  openRelease(row: PayoutRow, action: 'fail' | 'cancel'): void {
    const payout = this.payouts().find((p) => p.id === row.id) ?? null;
    this.releaseAction.set(action);
    this.releaseReason.setValue('');
    this.releaseTarget.set(payout);
  }

  submitRelease(): void {
    const target = this.releaseTarget();
    if (!target || !this.releaseReason.value.trim()) return;
    const reason = this.releaseReason.value.trim();

    this.submitting.set(true);
    const request$ =
      this.releaseAction() === 'fail'
        ? this.financeApi.failPayout(target.id, { reason })
        : this.financeApi.cancelPayout(target.id, { reason });

    request$.subscribe({
      next: () => {
        this.toast.success(`Payout ${target.payoutNo} ${this.releaseAction() === 'fail' ? 'marked Failed' : 'cancelled'}.`);
        this.submitting.set(false);
        this.releaseTarget.set(null);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OperatorInvoice, OperatorStatement, SettlementDirection } from '@ticketportal-mono/models';
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

interface InvoiceRow {
  [key: string]: unknown;
  id: string;
  invoiceNo: string;
  operatorName: string;
  direction: string;
  amountDisplay: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  canIssue: boolean;
  canCancel: boolean;
  canRecordReceipt: boolean;
}

const DIRECTIONS: SettlementDirection[] = ['PlatformPaysOperator', 'OperatorPaysPlatform', 'NetZero'];

/**
 * Screen 5 — invoices between the platform and an operator, and recording
 * receipts against the ones where the OPERATOR owes the platform. Status
 * only ever moves via Issue/Cancel or a recorded receipt — there's no
 * generic edit (OperatorInvoicesController has no PUT).
 */
@Component({
  selector: 'tp-invoices',
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
          <h3>Invoices</h3>
          <p class="tp-muted">Bills between the platform and an operator, either direction.</p>
        </div>
        <button tpButton variant="primary" (click)="openCreate()">+ New Invoice</button>
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
          emptyTitle="No invoices yet"
          emptyMessage="Create one directly, or generate it from an approved settlement."
        >
          <ng-template #rowActions let-row>
            <tp-status-pill [status]="row.status" />
            @if (row.canIssue) {
              <button tpButton variant="ghost" size="sm" (click)="issue(row.id)">Issue</button>
            }
            @if (row.canRecordReceipt) {
              <button tpButton variant="ghost" size="sm" (click)="openReceipt(row)">Record Receipt</button>
            }
            @if (row.canCancel) {
              <button tpButton variant="ghost" size="sm" (click)="openCancel(row)">Cancel</button>
            }
          </ng-template>
        </tp-table>
      }
    </tp-card>

    <tp-modal [open]="showCreate()" title="New Invoice" (closed)="showCreate.set(false)">
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
          Link to Statement (optional)
          <select formControlName="operatorStatementId">
            <option value="">(none)</option>
            @for (statement of statementsForOperator(createForm.controls.busOperatorId.value); track statement.id) {
              <option [value]="statement.id">{{ statement.statementNo }} — {{ formatMoney(statement.netAmount) }}</option>
            }
          </select>
        </label>

        <label>
          Direction
          <select formControlName="direction">
            @for (direction of directions; track direction) {
              <option [value]="direction">{{ direction }}</option>
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

        <div class="tp-finance-form__row">
          <label>
            Invoice Date
            <input type="date" formControlName="invoiceDate" />
          </label>
          <label>
            Due Date (optional)
            <input type="date" formControlName="dueDate" />
          </label>
        </div>
      </form>

      <div modal-footer>
        <button tpButton variant="secondary" (click)="showCreate.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="createForm.invalid || submitting()" (click)="submitCreate()">
          {{ submitting() ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </tp-modal>

    <tp-modal [open]="!!cancelTarget()" title="Cancel Invoice" (closed)="cancelTarget.set(null)">
      <p>Cancel invoice <strong>{{ cancelTarget()?.invoiceNo }}</strong>? A reason is required.</p>
      <label class="tp-finance-form__standalone-label">
        Reason
        <textarea [formControl]="cancelReason" rows="2"></textarea>
      </label>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="cancelTarget.set(null)">Back</button>
        <button tpButton variant="danger" [disabled]="!cancelReason.value.trim() || submitting()" (click)="submitCancel()">
          {{ submitting() ? 'Cancelling…' : 'Cancel Invoice' }}
        </button>
      </div>
    </tp-modal>

    <tp-modal [open]="!!receiptTarget()" title="Record Payment Receipt" (closed)="receiptTarget.set(null)">
      <p>Recording a receipt against invoice <strong>{{ receiptTarget()?.invoiceNo }}</strong>.</p>
      <form [formGroup]="receiptForm" (ngSubmit)="submitReceipt()" class="tp-finance-form">
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
          Reference No. (optional)
          <input type="text" formControlName="referenceNo" />
        </label>
        <label>
          Notes (optional)
          <textarea formControlName="notes" rows="2"></textarea>
        </label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="receiptTarget.set(null)">Cancel</button>
        <button tpButton variant="primary" [disabled]="receiptForm.invalid || submitting()" (click)="submitReceipt()">
          {{ submitting() ? 'Recording…' : 'Record Receipt' }}
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
export class InvoicesComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  protected readonly operatorLookup = inject(OperatorLookupService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly directions = DIRECTIONS;
  protected readonly formatMoney = formatMoney;

  protected readonly columns: TpTableColumn[] = [
    { key: 'invoiceNo', label: 'Invoice No.' },
    { key: 'operatorName', label: 'Operator' },
    { key: 'direction', label: 'Direction' },
    { key: 'amountDisplay', label: 'Amount', align: 'right' },
    { key: 'invoiceDate', label: 'Invoice Date' },
    { key: 'dueDate', label: 'Due Date' },
  ];

  private readonly invoices = signal<OperatorInvoice[]>([]);
  private readonly statements = signal<OperatorStatement[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly operatorFilter = signal<string | null>(null);
  protected readonly showCreate = signal(false);
  protected readonly cancelTarget = signal<OperatorInvoice | null>(null);
  protected readonly receiptTarget = signal<OperatorInvoice | null>(null);
  protected readonly cancelReason = this.fb.nonNullable.control('');

  protected readonly rows = computed<InvoiceRow[]>(() =>
    this.invoices().map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      operatorName: this.operatorLookup.nameFor(invoice.busOperatorId),
      direction: invoice.direction,
      amountDisplay: formatMoney(invoice.amount, invoice.currency),
      status: invoice.status,
      invoiceDate: formatDate(invoice.invoiceDate),
      dueDate: formatDate(invoice.dueDate),
      canIssue: invoice.status === 'Draft',
      canCancel: invoice.status === 'Draft' || invoice.status === 'Issued' || invoice.status === 'PartiallyPaid',
      canRecordReceipt:
        invoice.direction === 'OperatorPaysPlatform' && (invoice.status === 'Issued' || invoice.status === 'PartiallyPaid'),
    })),
  );

  protected readonly createForm = this.fb.nonNullable.group({
    busOperatorId: ['', Validators.required],
    operatorStatementId: [''],
    direction: ['PlatformPaysOperator' as SettlementDirection, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['BDT', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    invoiceDate: ['', Validators.required],
    dueDate: [''],
  });

  protected readonly receiptForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['BDT', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    referenceNo: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.operatorLookup.ensureLoaded();
    this.load();
    this.financeApi.listStatements().subscribe({ next: (statements) => this.statements.set(statements) });
  }

  /** Plain method (not a computed signal) since it derives from a FormControl's live value, not a signal. */
  protected statementsForOperator(operatorId: string): OperatorStatement[] {
    if (!operatorId) return [];
    return this.statements().filter((s) => s.busOperatorId === operatorId);
  }

  private load(): void {
    this.loading.set(true);
    this.financeApi.listInvoices(this.operatorFilter()).subscribe({
      next: (invoices) => {
        this.invoices.set(invoices);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onOperatorFilterChange(operatorId: string | null): void {
    this.operatorFilter.set(operatorId);
    this.load();
  }

  openCreate(): void {
    this.createForm.reset({
      busOperatorId: '',
      operatorStatementId: '',
      direction: 'PlatformPaysOperator',
      amount: 0,
      currency: 'BDT',
      invoiceDate: '',
      dueDate: '',
    });
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    const raw = this.createForm.getRawValue();

    this.submitting.set(true);
    this.financeApi
      .createInvoice({
        busOperatorId: raw.busOperatorId,
        operatorStatementId: raw.operatorStatementId || null,
        invoiceDate: raw.invoiceDate,
        dueDate: raw.dueDate || null,
        direction: raw.direction,
        amount: raw.amount,
        currency: raw.currency.toUpperCase(),
      })
      .subscribe({
        next: (invoice) => {
          this.toast.success(`Invoice ${invoice.invoiceNo} created.`);
          this.submitting.set(false);
          this.showCreate.set(false);
          this.load();
        },
        error: () => this.submitting.set(false),
      });
  }

  issue(id: string): void {
    this.submitting.set(true);
    this.financeApi.issueInvoice(id).subscribe({
      next: () => {
        this.toast.success('Invoice issued.');
        this.submitting.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  openCancel(row: InvoiceRow): void {
    const invoice = this.invoices().find((i) => i.id === row.id) ?? null;
    this.cancelReason.setValue('');
    this.cancelTarget.set(invoice);
  }

  submitCancel(): void {
    const target = this.cancelTarget();
    if (!target || !this.cancelReason.value.trim()) return;

    this.submitting.set(true);
    this.financeApi.cancelInvoice(target.id, { reason: this.cancelReason.value.trim() }).subscribe({
      next: () => {
        this.toast.success(`Invoice ${target.invoiceNo} cancelled.`);
        this.submitting.set(false);
        this.cancelTarget.set(null);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  openReceipt(row: InvoiceRow): void {
    const invoice = this.invoices().find((i) => i.id === row.id) ?? null;
    if (!invoice) return;
    this.receiptForm.reset({ amount: invoice.amount, currency: invoice.currency, referenceNo: '', notes: '' });
    this.receiptTarget.set(invoice);
  }

  submitReceipt(): void {
    const target = this.receiptTarget();
    if (!target || this.receiptForm.invalid) return;
    const raw = this.receiptForm.getRawValue();

    this.submitting.set(true);
    this.financeApi
      .recordReceipt({
        operatorInvoiceId: target.id,
        amount: raw.amount,
        currency: raw.currency.toUpperCase(),
        referenceNo: raw.referenceNo || null,
        notes: raw.notes || null,
      })
      .subscribe({
        next: () => {
          this.toast.success(`Receipt recorded against ${target.invoiceNo}.`);
          this.submitting.set(false);
          this.receiptTarget.set(null);
          this.load();
        },
        error: () => this.submitting.set(false),
      });
  }
}

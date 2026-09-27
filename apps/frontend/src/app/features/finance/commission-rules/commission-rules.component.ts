import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommissionRule, CommissionType, SaleChannel } from '@ticketportal-mono/models';
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
import { formatDate } from '../shared/money.util';

// tp-table's [rows] input is typed Record<string, unknown>[] (see its doc
// comment) — the index signature here is what makes a concrete view-model
// interface assignable to that without an `as` cast at the binding site.
interface CommissionRuleRow {
  [key: string]: unknown;
  id: string;
  operatorName: string;
  saleChannel: string;
  commissionType: string;
  commissionValueDisplay: string;
  effectiveFrom: string;
  effectiveTo: string;
  statusDisplay: string;
  rule: CommissionRule;
}

const SALE_CHANNELS: SaleChannel[] = ['Online', 'Counter', 'Agent', 'Admin', 'ExternalApi'];
const COMMISSION_TYPES: CommissionType[] = ['Percentage', 'FixedAmount'];

/**
 * Screen 1 — per-operator, per-channel commission configuration (Percentage/
 * FixedAmount for online sales vs. the counter-sale ERP fee). Server-side
 * this is Admin-only end to end (CommissionRulesController) — a Staff caller
 * will see an empty list and a 403 toast on write, which is expected, not a
 * bug in this screen.
 */
@Component({
  selector: 'tp-commission-rules',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TpCardComponent,
    TpTableComponent,
    TpButtonDirective,
    TpModalComponent,
    TpSpinnerComponent,
  ],
  template: `
    <tp-card>
      <div class="tp-panel-toolbar">
        <div>
          <h3>Commission Rules</h3>
          <p class="tp-muted">Per-operator commission for online sales and counter-sale ERP usage.</p>
        </div>
        <button tpButton variant="primary" (click)="openCreate()">+ New Commission Rule</button>
      </div>

      @if (loading()) {
        <div class="tp-panel-loading"><tp-spinner /></div>
      } @else {
        <tp-table
          [columns]="columns"
          [rows]="rows()"
          emptyTitle="No commission rules yet"
          emptyMessage="Create one to start charging commission on an operator's sales."
        >
          <ng-template #rowActions let-row>
            <button tpButton variant="ghost" size="sm" (click)="openEdit(row.rule)">Edit</button>
            <button tpButton variant="ghost" size="sm" (click)="confirmDelete(row.rule)">Delete</button>
          </ng-template>
        </tp-table>
      }
    </tp-card>

    <tp-modal [open]="showForm()" [title]="editingId() ? 'Edit Commission Rule' : 'New Commission Rule'" (closed)="closeForm()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="tp-finance-form">
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
          Sale Channel
          <select formControlName="saleChannel">
            @for (channel of saleChannels; track channel) {
              <option [value]="channel">{{ channel }}</option>
            }
          </select>
        </label>

        <div class="tp-finance-form__row">
          <label>
            Commission Type
            <select formControlName="commissionType">
              @for (type of commissionTypes; track type) {
                <option [value]="type">{{ type === 'Percentage' ? 'Percentage (%)' : 'Fixed Amount' }}</option>
              }
            </select>
          </label>

          <label>
            Value
            <input type="number" step="0.01" min="0" formControlName="commissionValue" />
          </label>
        </div>

        <div class="tp-finance-form__row">
          <label>
            Effective From
            <input type="date" formControlName="effectiveFrom" />
          </label>

          <label>
            Effective To (optional)
            <input type="date" formControlName="effectiveTo" />
          </label>
        </div>

        <label class="tp-finance-form__checkbox">
          <input type="checkbox" formControlName="isActive" />
          Active
        </label>
      </form>

      <div modal-footer>
        <button tpButton variant="secondary" (click)="closeForm()">Cancel</button>
        <button tpButton variant="primary" [disabled]="form.invalid || submitting()" (click)="submit()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </tp-modal>

    <tp-modal [open]="!!deleteTarget()" title="Delete Commission Rule" (closed)="deleteTarget.set(null)">
      <p>
        Delete the {{ deleteTarget()?.saleChannel }} commission rule for
        <strong>{{ operatorLookup.nameFor(deleteTarget()?.busOperatorId) }}</strong>? This can't be undone.
      </p>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="deleteTarget.set(null)">Cancel</button>
        <button tpButton variant="danger" [disabled]="submitting()" (click)="deleteConfirmed()">
          {{ submitting() ? 'Deleting…' : 'Delete' }}
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
        margin-bottom: var(--tp-space-5);
      }

      .tp-panel-toolbar h3 {
        margin-bottom: var(--tp-space-1);
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

      .tp-finance-form label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-finance-form__checkbox {
        flex-direction: row !important;
        align-items: center;
        gap: var(--tp-space-2) !important;
      }

      .tp-finance-form input,
      .tp-finance-form select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-finance-form input:focus,
      .tp-finance-form select:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }
    `,
  ],
})
export class CommissionRulesComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  protected readonly operatorLookup = inject(OperatorLookupService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly saleChannels = SALE_CHANNELS;
  protected readonly commissionTypes = COMMISSION_TYPES;

  protected readonly columns: TpTableColumn[] = [
    { key: 'operatorName', label: 'Operator' },
    { key: 'saleChannel', label: 'Channel' },
    { key: 'commissionType', label: 'Type' },
    { key: 'commissionValueDisplay', label: 'Value', align: 'right' },
    { key: 'effectiveFrom', label: 'From' },
    { key: 'effectiveTo', label: 'To' },
    { key: 'statusDisplay', label: 'Status' },
  ];

  private readonly rules = signal<CommissionRule[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly deleteTarget = signal<CommissionRule | null>(null);
  private editingRowVersion: string | null = null;

  protected readonly rows = computed<CommissionRuleRow[]>(() =>
    this.rules().map((rule) => ({
      id: rule.id,
      operatorName: this.operatorLookup.nameFor(rule.busOperatorId),
      saleChannel: rule.saleChannel,
      commissionType: rule.commissionType === 'Percentage' ? 'Percentage' : 'Fixed Amount',
      commissionValueDisplay: rule.commissionType === 'Percentage' ? `${rule.commissionValue}%` : `${rule.commissionValue}`,
      effectiveFrom: formatDate(rule.effectiveFrom),
      effectiveTo: formatDate(rule.effectiveTo),
      statusDisplay: rule.isActive ? 'Active' : 'Inactive',
      rule,
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    busOperatorId: ['', Validators.required],
    saleChannel: ['Online' as SaleChannel, Validators.required],
    commissionType: ['Percentage' as CommissionType, Validators.required],
    commissionValue: [0, [Validators.required, Validators.min(0)]],
    effectiveFrom: ['', Validators.required],
    effectiveTo: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.operatorLookup.ensureLoaded();
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.financeApi.listCommissionRules().subscribe({
      next: (rules) => {
        this.rules.set(rules);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.editingRowVersion = null;
    this.form.reset({
      busOperatorId: '',
      saleChannel: 'Online',
      commissionType: 'Percentage',
      commissionValue: 0,
      effectiveFrom: '',
      effectiveTo: '',
      isActive: true,
    });
    this.showForm.set(true);
  }

  openEdit(rule: CommissionRule): void {
    this.editingId.set(rule.id);
    this.editingRowVersion = rule.rowVersion;
    this.form.reset({
      busOperatorId: rule.busOperatorId,
      saleChannel: rule.saleChannel,
      commissionType: rule.commissionType,
      commissionValue: rule.commissionValue,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo ?? '',
      isActive: rule.isActive,
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const request = {
      busOperatorId: raw.busOperatorId,
      operatorContractId: null,
      busRouteId: null,
      saleChannel: raw.saleChannel,
      commissionType: raw.commissionType,
      commissionValue: raw.commissionValue,
      effectiveFrom: raw.effectiveFrom,
      effectiveTo: raw.effectiveTo || null,
      isActive: raw.isActive,
    };

    this.submitting.set(true);
    const id = this.editingId();
    const save$ = id
      ? this.financeApi.updateCommissionRule(id, { ...request, rowVersion: this.editingRowVersion! })
      : this.financeApi.createCommissionRule(request);

    save$.subscribe({
      next: () => {
        this.toast.success(id ? 'Commission rule updated.' : 'Commission rule created.');
        this.submitting.set(false);
        this.showForm.set(false);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  confirmDelete(rule: CommissionRule): void {
    this.deleteTarget.set(rule);
  }

  deleteConfirmed(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.submitting.set(true);
    this.financeApi.deleteCommissionRule(target.id).subscribe({
      next: () => {
        this.toast.success('Commission rule deleted.');
        this.submitting.set(false);
        this.deleteTarget.set(null);
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }
}

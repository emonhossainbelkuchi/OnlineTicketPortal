import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusOperator, SalesCounter, Terminal } from '@ticketportal-mono/models';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpModalComponent, TpSpinnerComponent, TpStatusPillComponent } from '../../../shared/ui';
import { BusOperatorsService } from '../services/bus-operators.service';
import { SalesCountersService } from '../services/sales-counters.service';
import { TerminalsService } from '../services/terminals.service';

/**
 * Piece 5, screen 1 — manage sales counters per operator branch/terminal.
 * Full CRUD against SalesCountersController; soft-delete on the backend
 * (Delete just deactivates the row, it doesn't disappear from history).
 */
@Component({
  selector: 'tp-counter-setup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TpButtonDirective,
    TpCardComponent,
    TpEmptyStateComponent,
    TpModalComponent,
    TpSpinnerComponent,
    TpStatusPillComponent,
  ],
  template: `
    <tp-card>
      <div class="tp-toolbar">
        <h2>Sales Counters</h2>
        <button tpButton variant="primary" (click)="openCreate()">+ New Counter</button>
      </div>

      @if (loading()) {
        <tp-spinner />
      } @else if (counters().length === 0) {
        <tp-empty-state title="No sales counters yet" message="Add your first counter to start recording walk-in sales.">
          <button tpButton variant="primary" (click)="openCreate()">+ New Counter</button>
        </tp-empty-state>
      } @else {
        <div class="tp-table-wrap">
          <table class="tp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Terminal</th>
                <th>Phone</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (counter of counters(); track counter.id) {
                <tr>
                  <td>{{ counter.counterName }}</td>
                  <td>{{ counter.counterCode }}</td>
                  <td>{{ terminalName(counter.terminalId) }}</td>
                  <td>{{ counter.phoneNumber }}</td>
                  <td><tp-status-pill [status]="counter.isActive ? 'Active' : 'Inactive'" [tone]="counter.isActive ? 'success' : 'neutral'" /></td>
                  <td class="tp-table__actions">
                    <button tpButton variant="ghost" size="sm" (click)="openEdit(counter)">Edit</button>
                    <button tpButton variant="danger" size="sm" (click)="remove(counter)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </tp-card>

    <tp-modal [open]="modalOpen()" [title]="editing() ? 'Edit Counter' : 'New Counter'" (closed)="closeModal()">
      <form [formGroup]="form" class="tp-form" (ngSubmit)="save()">
        @if (auth.hasRole('Admin')) {
          <label>
            Bus Operator
            <select formControlName="busOperatorId">
              <option value="" disabled>Select an operator</option>
              @for (operator of eligibleBusOperators(); track operator.id) {
                <option [value]="operator.id">{{ operator.name }}</option>
              }
            </select>
          </label>
        }
        <label>
          Terminal
          <select formControlName="terminalId">
            <option value="" disabled>Select a terminal</option>
            @for (terminal of terminals(); track terminal.id) {
              <option [value]="terminal.id">{{ terminal.name }} ({{ terminal.city }})</option>
            }
          </select>
        </label>
        <label>
          Counter Name
          <input type="text" formControlName="counterName" placeholder="e.g. Gabtoli Counter 2" />
        </label>
        <label>
          Counter Code
          <input type="text" formControlName="counterCode" placeholder="e.g. GB-02" />
        </label>
        <label>
          Phone Number
          <input type="text" formControlName="phoneNumber" />
        </label>
        <label>
          Address
          <input type="text" formControlName="address" />
        </label>
        <label class="tp-checkbox">
          <input type="checkbox" formControlName="isActive" />
          Active
        </label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="closeModal()">Cancel</button>
        <button tpButton variant="primary" [disabled]="form.invalid || saving()" (click)="save()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </tp-modal>
  `,
  styles: [
    `
      .tp-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--tp-space-5);
      }

      .tp-toolbar h2 {
        margin: 0;
      }

      .tp-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-md);
      }

      .tp-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      .tp-table th {
        background: var(--tp-bg-soft);
        color: var(--tp-text-muted);
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: var(--tp-space-3) var(--tp-space-4);
        border-bottom: 1px solid var(--tp-border);
        text-align: left;
      }

      .tp-table td {
        padding: var(--tp-space-3) var(--tp-space-4);
        border-bottom: 1px solid var(--tp-border);
      }

      .tp-table tbody tr:last-child td {
        border-bottom: none;
      }

      .tp-table__actions {
        display: flex;
        gap: var(--tp-space-2);
        justify-content: flex-end;
      }

      .tp-form {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-4);
      }

      .tp-form label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-form input[type='text'],
      .tp-form select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-form input:focus,
      .tp-form select:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }

      .tp-checkbox {
        flex-direction: row !important;
        align-items: center;
        gap: var(--tp-space-2) !important;
      }
    `,
  ],
})
export class CounterSetupComponent implements OnInit {
  private readonly countersService = inject(SalesCountersService);
  private readonly terminalsService = inject(TerminalsService);
  private readonly busOperatorsService = inject(BusOperatorsService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<SalesCounter | null>(null);
  protected readonly counters = signal<SalesCounter[]>([]);
  protected readonly terminals = signal<Terminal[]>([]);
  private readonly busOperators = signal<BusOperator[]>([]);

  // Chunk 8 task 6: an ExternalApiManaged operator (e.g. Hanif) runs its own ERP end-to-end,
  // including cash-counter sales (concept doc §3.2) — TicketPortal never operates a counter for
  // one. Filtering it out of this picker is what actually keeps it out of counter configuration
  // day to day; SalesCountersController.Create rejects it server-side too either way.
  protected readonly eligibleBusOperators = computed(() =>
    this.busOperators().filter((o) => o.inventoryMode !== 'ExternalApiManaged'),
  );

  protected readonly form = this.fb.nonNullable.group({
    busOperatorId: [''],
    terminalId: ['', Validators.required],
    counterName: ['', Validators.required],
    counterCode: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    address: ['', Validators.required],
    isActive: [true],
  });

  ngOnInit(): void {
    this.terminalsService.list().subscribe((terminals) => this.terminals.set(terminals));
    if (this.auth.hasRole('Admin')) {
      this.busOperatorsService.list().subscribe((operators) => this.busOperators.set(operators));
    }
    this.refresh();
  }

  protected terminalName(terminalId: string): string {
    return this.terminals().find((t) => t.id === terminalId)?.name ?? terminalId;
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ busOperatorId: '', terminalId: '', counterName: '', counterCode: '', phoneNumber: '', address: '', isActive: true });
    this.modalOpen.set(true);
  }

  protected openEdit(counter: SalesCounter): void {
    this.editing.set(counter);
    this.form.reset({
      busOperatorId: counter.busOperatorId,
      terminalId: counter.terminalId,
      counterName: counter.counterName,
      counterCode: counter.counterCode,
      phoneNumber: counter.phoneNumber,
      address: counter.address,
      isActive: counter.isActive,
    });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const request = {
      busOperatorId: raw.busOperatorId || undefined,
      terminalId: raw.terminalId,
      counterName: raw.counterName,
      counterCode: raw.counterCode,
      phoneNumber: raw.phoneNumber,
      address: raw.address,
      isActive: raw.isActive,
    };

    const editing = this.editing();
    const request$ = editing
      ? this.countersService.update(editing.id, { ...request, rowVersion: editing.rowVersion })
      : this.countersService.create(request);

    request$.subscribe({
      next: () => {
        this.toast.success(editing ? 'Counter updated.' : 'Counter created.');
        this.saving.set(false);
        this.modalOpen.set(false);
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  protected remove(counter: SalesCounter): void {
    if (!confirm(`Delete counter "${counter.counterName}"?`)) return;

    this.countersService.delete(counter.id).subscribe(() => {
      this.toast.success('Counter deleted.');
      this.refresh();
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.countersService.list().subscribe({
      next: (counters) => {
        this.counters.set(counters);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

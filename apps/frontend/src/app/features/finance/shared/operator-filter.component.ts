import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { OperatorLookupService } from '../services/operator-lookup.service';

/**
 * "All Operators" + one option per BusOperator. Every Piece 6 list screen
 * that supports filtering by operator (Wallets/Ledger, Settlements,
 * Invoices, Payouts) uses this instead of duplicating the same <select>
 * four times.
 *
 *   <tp-operator-filter [value]="operatorFilter()" (valueChange)="onOperatorFilterChange($event)" />
 */
@Component({
  selector: 'tp-operator-filter',
  standalone: true,
  template: `
    <label class="tp-operator-filter">
      Operator
      <select [value]="value ?? ''" (change)="onChange($event)">
        <option value="">All Operators</option>
        @for (op of operatorLookup.operators(); track op.id) {
          <option [value]="op.id">{{ op.name }}</option>
        }
      </select>
    </label>
  `,
  styles: [
    `
      .tp-operator-filter {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
        min-width: 220px;
      }

      .tp-operator-filter select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-operator-filter select:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }
    `,
  ],
})
export class OperatorFilterComponent {
  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string | null>();

  protected readonly operatorLookup = inject(OperatorLookupService);

  constructor() {
    this.operatorLookup.ensureLoaded();
  }

  onChange(event: Event): void {
    const selected = (event.target as HTMLSelectElement).value;
    this.valueChange.emit(selected || null);
  }
}

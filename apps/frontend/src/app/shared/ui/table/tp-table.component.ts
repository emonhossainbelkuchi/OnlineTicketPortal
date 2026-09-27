import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, TemplateRef } from '@angular/core';
import { TpEmptyStateComponent } from '../empty-state/tp-empty-state.component';

export interface TpTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

/**
 * Generic table for plain data. Basic usage (renders row[col.key] as text):
 *
 *   <tp-table
 *     [columns]="[{key: 'pnr', label: 'PNR'}, {key: 'grandTotal', label: 'Total', align: 'right'}]"
 *     [rows]="bookings"
 *     emptyTitle="No bookings yet"
 *   />
 *
 * Need a custom cell (a status pill, a link, an action button)? Project a
 * #rowActions template — it gets the row as its implicit context and is
 * appended as a final unlabeled column:
 *
 *   <tp-table [columns]="cols" [rows]="bookings">
 *     <ng-template #rowActions let-row>
 *       <tp-status-pill [status]="row.status" />
 *       <button tpButton variant="ghost" size="sm" (click)="view(row)">View</button>
 *     </ng-template>
 *   </tp-table>
 *
 * For anything beyond that (custom cell per COLUMN, not just a trailing
 * actions column), it's usually simpler to just write a bespoke table for
 * that one screen rather than fighting this component's abstraction.
 */
@Component({
  selector: 'tp-table',
  standalone: true,
  imports: [CommonModule, TpEmptyStateComponent],
  template: `
    @if (rows.length === 0) {
      <tp-empty-state [title]="emptyTitle" [message]="emptyMessage" />
    } @else {
      <div class="tp-table-wrap">
        <table class="tp-table">
          <thead>
            <tr>
              @for (col of columns; track col.key) {
                <th [style.text-align]="col.align ?? 'left'">{{ col.label }}</th>
              }
              @if (rowActions) {
                <th></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track $index) {
              <tr>
                @for (col of columns; track col.key) {
                  <td [style.text-align]="col.align ?? 'left'">{{ row[col.key] }}</td>
                }
                @if (rowActions) {
                  <td class="tp-table__actions">
                    <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: row }" />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [
    `
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
      }

      .tp-table td {
        padding: var(--tp-space-3) var(--tp-space-4);
        border-bottom: 1px solid var(--tp-border);
      }

      .tp-table tbody tr:last-child td {
        border-bottom: none;
      }

      .tp-table tbody tr:hover {
        background: var(--tp-bg-soft);
      }

      .tp-table__actions {
        display: flex;
        align-items: center;
        gap: var(--tp-space-2);
        justify-content: flex-end;
      }
    `,
  ],
})
export class TpTableComponent {
  @Input({ required: true }) columns: TpTableColumn[] = [];
  @Input({ required: true }) rows: Record<string, unknown>[] = [];
  @Input() emptyTitle = 'Nothing here yet';
  @Input() emptyMessage?: string;

  @ContentChild('rowActions') rowActions?: TemplateRef<{ $implicit: Record<string, unknown> }>;
}

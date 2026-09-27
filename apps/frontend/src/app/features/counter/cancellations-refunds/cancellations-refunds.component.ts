import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Booking, CancellationRequest, Refund } from '@ticketportal-mono/models';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpModalComponent, TpSpinnerComponent, TpStatusPillComponent, TpTabsComponent } from '../../../shared/ui';
import { BookingsLookupService } from '../services/bookings-lookup.service';
import { CancellationsService } from '../services/cancellations.service';
import { RefundsService } from '../services/refunds.service';

type ActionType = 'approveCancellation' | 'rejectCancellation' | 'approveRefund' | 'rejectRefund' | 'manualPayout';

interface ActionTarget {
  type: ActionType;
  id: string;
}

/**
 * Piece 5, screen 4 — cancellations & refunds desk. Two tabs over
 * CancellationRequestsController and RefundsController; every action here
 * is one of the fixed state-machine moves those controllers expose (see
 * their class comments) — there is no generic edit anywhere on this screen
 * by design.
 */
@Component({
  selector: 'tp-cancellations-refunds',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TpButtonDirective,
    TpCardComponent,
    TpEmptyStateComponent,
    TpModalComponent,
    TpSpinnerComponent,
    TpStatusPillComponent,
    TpTabsComponent,
  ],
  template: `
    <tp-tabs [tabs]="['Cancellation Requests', 'Refunds']" [(activeIndex)]="tabIndex" />

    <tp-card>
      @switch (tabIndex) {
        @case (0) {
          @if (loadingCancellations()) {
            <tp-spinner />
          } @else if (cancellations().length === 0) {
            <tp-empty-state title="No cancellation requests" message="Nothing waiting on this desk right now." />
          } @else {
            <div class="tp-table-wrap">
              <table class="tp-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Scope</th>
                    <th>Reason</th>
                    <th>Requested Amount</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of cancellations(); track item.id) {
                    <tr>
                      <td>{{ bookingLabel(item.bookingId) }}</td>
                      <td>{{ item.ticketId ? 'One ticket' : 'Whole booking' }}</td>
                      <td>{{ item.reason }}</td>
                      <td>{{ item.approvedRefundAmount ?? item.requestedRefundAmount }}</td>
                      <td><tp-status-pill [status]="item.status" /></td>
                      <td>{{ item.requestedAtUtc | date: 'MMM d, h:mm a' }}</td>
                      <td class="tp-table__actions">
                        @if (item.status === 'Requested') {
                          <button tpButton variant="secondary" size="sm" (click)="openAction('approveCancellation', item.id)">Approve</button>
                          <button tpButton variant="danger" size="sm" (click)="openAction('rejectCancellation', item.id)">Reject</button>
                        }
                        @if (item.status === 'Approved') {
                          <button tpButton variant="primary" size="sm" (click)="completeCancellation(item)">Complete</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        @case (1) {
          @if (loadingRefunds()) {
            <tp-spinner />
          } @else if (refunds().length === 0) {
            <tp-empty-state title="No refunds" message="Nothing waiting on this desk right now." />
          } @else {
            <div class="tp-table-wrap">
              <table class="tp-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of refunds(); track item.id) {
                    <tr>
                      <td>{{ bookingLabel(item.bookingId) }}</td>
                      <td>{{ item.currency }} {{ item.amount }}</td>
                      <td>{{ item.reason }}</td>
                      <td><tp-status-pill [status]="item.status" /></td>
                      <td>{{ item.requestedAtUtc | date: 'MMM d, h:mm a' }}</td>
                      <td class="tp-table__actions">
                        @if (item.status === 'Requested') {
                          <button tpButton variant="secondary" size="sm" (click)="openAction('approveRefund', item.id)">Approve</button>
                          <button tpButton variant="danger" size="sm" (click)="openAction('rejectRefund', item.id)">Reject</button>
                        }
                        @if (item.status === 'Approved') {
                          <button tpButton variant="primary" size="sm" (click)="processRefund(item)">Process</button>
                        }
                        @if (item.status === 'PendingManualPayout') {
                          <button tpButton variant="primary" size="sm" (click)="openAction('manualPayout', item.id)">Manual Payout</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </tp-card>

    <tp-modal [open]="!!actionTarget()" [title]="actionTitle()" (closed)="closeAction()">
      <form [formGroup]="actionForm" class="tp-form">
        @switch (actionTarget()?.type) {
          @case ('approveCancellation') {
            <label>
              Approved Refund Amount <span class="tp-muted">(leave blank to accept the requested amount)</span>
              <input type="number" formControlName="amount" />
            </label>
            <label>
              Remarks
              <input type="text" formControlName="text" />
            </label>
          }
          @case ('rejectCancellation') {
            <label>
              Reason for rejection
              <input type="text" formControlName="text" />
            </label>
          }
          @case ('approveRefund') {
            <label>
              Remarks
              <input type="text" formControlName="text" />
            </label>
          }
          @case ('rejectRefund') {
            <label>
              Reason for rejection
              <input type="text" formControlName="text" />
            </label>
          }
          @case ('manualPayout') {
            <label>
              Manual payout reference <span class="tp-muted">(receipt/transaction number)</span>
              <input type="text" formControlName="text" />
            </label>
          }
        }
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="closeAction()">Cancel</button>
        <button tpButton variant="primary" [disabled]="submitting()" (click)="submitAction()">
          {{ submitting() ? 'Submitting…' : 'Confirm' }}
        </button>
      </div>
    </tp-modal>
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

      .tp-form input {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }
    `,
  ],
})
export class CancellationsRefundsComponent implements OnInit {
  private readonly cancellationsService = inject(CancellationsService);
  private readonly refundsService = inject(RefundsService);
  private readonly bookingsLookup = inject(BookingsLookupService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected tabIndex = 0;

  protected readonly loadingCancellations = signal(true);
  protected readonly cancellations = signal<CancellationRequest[]>([]);
  protected readonly loadingRefunds = signal(true);
  protected readonly refunds = signal<Refund[]>([]);
  private readonly bookingsById = signal<Map<string, Booking>>(new Map());

  protected readonly actionTarget = signal<ActionTarget | null>(null);
  protected readonly submitting = signal(false);
  protected readonly actionForm = this.fb.nonNullable.group({
    amount: [null as number | null],
    text: [''],
  });

  ngOnInit(): void {
    this.bookingsLookup.list().subscribe((bookings) => {
      this.bookingsById.set(new Map(bookings.map((b) => [b.id, b])));
    });
    this.refreshCancellations();
    this.refreshRefunds();
  }

  protected bookingLabel(bookingId: string): string {
    const booking = this.bookingsById().get(bookingId);
    return booking ? `${booking.pnr} — ${booking.contactName}` : bookingId;
  }

  protected actionTitle(): string {
    const type = this.actionTarget()?.type;
    return (
      {
        approveCancellation: 'Approve Cancellation',
        rejectCancellation: 'Reject Cancellation',
        approveRefund: 'Approve Refund',
        rejectRefund: 'Reject Refund',
        manualPayout: 'Record Manual Payout',
      }[type ?? 'approveCancellation'] ?? ''
    );
  }

  protected openAction(type: ActionType, id: string): void {
    this.actionForm.reset({ amount: null, text: '' });
    this.actionTarget.set({ type, id });
  }

  protected closeAction(): void {
    this.actionTarget.set(null);
  }

  protected submitAction(): void {
    const target = this.actionTarget();
    if (!target) return;
    const raw = this.actionForm.getRawValue();
    this.submitting.set(true);

    let request$: Observable<unknown>;
    switch (target.type) {
      case 'approveCancellation':
        request$ = this.cancellationsService.approve(target.id, {
          approvedRefundAmount: raw.amount ?? undefined,
          remarks: raw.text || undefined,
        });
        break;
      case 'rejectCancellation':
        request$ = this.cancellationsService.reject(target.id, { rejectedReason: raw.text });
        break;
      case 'approveRefund':
        request$ = this.refundsService.approve(target.id, { remarks: raw.text || undefined });
        break;
      case 'rejectRefund':
        request$ = this.refundsService.reject(target.id, { reason: raw.text });
        break;
      case 'manualPayout':
        request$ = this.refundsService.manualPayout(target.id, { manualPayoutReference: raw.text });
        break;
    }

    request$.subscribe({
      next: () => {
        this.toast.success('Done.');
        this.submitting.set(false);
        this.closeAction();
        this.refreshCancellations();
        this.refreshRefunds();
      },
      error: () => this.submitting.set(false),
    });
  }

  protected completeCancellation(item: CancellationRequest): void {
    this.cancellationsService.complete(item.id).subscribe(() => {
      this.toast.success('Cancellation completed.');
      this.refreshCancellations();
    });
  }

  protected processRefund(item: Refund): void {
    this.refundsService.process(item.id).subscribe(() => {
      this.toast.success('Refund processed.');
      this.refreshRefunds();
    });
  }

  private refreshCancellations(): void {
    this.loadingCancellations.set(true);
    this.cancellationsService.list().subscribe({
      next: (items) => {
        this.cancellations.set(items);
        this.loadingCancellations.set(false);
      },
      error: () => this.loadingCancellations.set(false),
    });
  }

  private refreshRefunds(): void {
    this.loadingRefunds.set(true);
    this.refundsService.list().subscribe({
      next: (items) => {
        this.refunds.set(items);
        this.loadingRefunds.set(false);
      },
      error: () => this.loadingRefunds.set(false),
    });
  }
}

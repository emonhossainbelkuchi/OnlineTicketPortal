import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CancellationRequest, Refund } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { TpButtonDirective, TpStatusPillComponent, TpTableColumn, TpTableComponent } from '../../../../shared/ui';
import { AccountNavComponent } from '../account-nav/account-nav.component';

interface CancellationRow extends Record<string, unknown> {
  bookingId: string;
  requestedDisplay: string;
  reason: string;
  refundDisplay: string;
  status: string;
}

interface RefundRow extends Record<string, unknown> {
  bookingId: string;
  amountDisplay: string;
  status: string;
}

/**
 * The per-booking cancellation *request* action lives on BookingDetailComponent (it's tied to
 * one specific booking's tickets) — this screen is the flip side: a single place to see the
 * status of every cancellation/refund the customer has ever filed, without having to remember
 * which booking each one was against.
 */
@Component({
  selector: 'tp-cancellations',
  standalone: true,
  imports: [CommonModule, AccountNavComponent, TpTableComponent, TpStatusPillComponent, TpButtonDirective],
  template: `
    <div class="tp-page">
      <h2>My Account</h2>
      <tp-account-nav />

      <h3>Cancellation Requests</h3>
      <tp-table
        [columns]="cancellationColumns"
        [rows]="cancellationRows()"
        emptyTitle="No cancellation requests"
        emptyMessage="Requests you file from a booking's detail page will show up here."
      >
        <ng-template #rowActions let-row>
          <tp-status-pill [status]="row.status" />
          <button tpButton variant="ghost" size="sm" (click)="viewBooking(row.bookingId)">View Booking</button>
        </ng-template>
      </tp-table>

      <h3 class="tp-refunds-heading">Refunds</h3>
      <tp-table
        [columns]="refundColumns"
        [rows]="refundRows()"
        emptyTitle="No refunds"
        emptyMessage="Refunds from an approved cancellation or a lost-seat-hold race will show up here."
      >
        <ng-template #rowActions let-row>
          <tp-status-pill [status]="row.status" />
          <button tpButton variant="ghost" size="sm" (click)="viewBooking(row.bookingId)">View Booking</button>
        </ng-template>
      </tp-table>
    </div>
  `,
  styles: [
    `
      .tp-refunds-heading {
        margin-top: var(--tp-space-6);
      }
    `,
  ],
})
export class CancellationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly cancellationColumns: TpTableColumn[] = [
    { key: 'requestedDisplay', label: 'Requested' },
    { key: 'reason', label: 'Reason' },
    { key: 'refundDisplay', label: 'Refund', align: 'right' },
  ];

  protected readonly refundColumns: TpTableColumn[] = [{ key: 'amountDisplay', label: 'Amount', align: 'right' }];

  protected readonly cancellationRows = signal<CancellationRow[]>([]);
  protected readonly refundRows = signal<RefundRow[]>([]);

  ngOnInit(): void {
    this.api.get<CancellationRequest[]>('cancellationrequests').subscribe((requests) => {
      this.cancellationRows.set(
        requests
          .slice()
          .sort((a, b) => (a.requestedAtUtc < b.requestedAtUtc ? 1 : -1))
          .map((cr) => ({
            bookingId: cr.bookingId,
            requestedDisplay: new Date(cr.requestedAtUtc).toLocaleDateString(),
            reason: cr.reason,
            refundDisplay: cr.approvedRefundAmount !== null ? cr.approvedRefundAmount.toFixed(2) : `~${cr.requestedRefundAmount.toFixed(2)}`,
            status: cr.status,
          })),
      );
    });

    this.api.get<Refund[]>('refunds').subscribe((refunds) => {
      this.refundRows.set(
        refunds
          .slice()
          .sort((a, b) => (a.requestedAtUtc < b.requestedAtUtc ? 1 : -1))
          .map((r) => ({
            bookingId: r.bookingId,
            amountDisplay: `${r.amount.toFixed(2)} ${r.currency}`,
            status: r.status,
          })),
      );
    });
  }

  viewBooking(bookingId: string): void {
    this.router.navigate(['/my-bookings', bookingId]);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Booking, BookingStatus } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { TpButtonDirective, TpStatusPillComponent, TpTableColumn, TpTableComponent, TpTabsComponent } from '../../../../shared/ui';
import { AccountNavComponent } from '../account-nav/account-nav.component';

const UPCOMING: BookingStatus[] = ['Draft', 'PendingPayment', 'Confirmed'];
const CANCELLED: BookingStatus[] = ['Cancelled', 'Expired', 'Failed', 'PartiallyCancelled', 'Refunded'];

interface BookingRow extends Record<string, unknown> {
  id: string;
  pnr: string;
  createdDisplay: string;
  totalDisplay: string;
  status: BookingStatus;
}

/**
 * BookingsController.GetAll is already scoped server-side to "my own bookings" for a Customer
 * caller (see Piece 1's backend-surface note) — this just fetches once and splits by status
 * client-side into the three tabs, rather than three separate requests.
 */
@Component({
  selector: 'tp-booking-history',
  standalone: true,
  imports: [CommonModule, AccountNavComponent, TpTabsComponent, TpTableComponent, TpStatusPillComponent, TpButtonDirective],
  template: `
    <div class="tp-page">
      <h2>My Bookings</h2>
      <tp-account-nav />

      <tp-tabs [tabs]="['Upcoming', 'Past', 'Cancelled']" [(activeIndex)]="tabIndex" />

      <tp-table
        [columns]="columns"
        [rows]="rowsForTab()"
        emptyTitle="Nothing here yet"
        [emptyMessage]="emptyMessageForTab()"
      >
        <ng-template #rowActions let-row>
          <tp-status-pill [status]="row.status" />
          <button tpButton variant="ghost" size="sm" (click)="view(row.id)">View</button>
        </ng-template>
      </tp-table>
    </div>
  `,
})
export class BookingHistoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly columns: TpTableColumn[] = [
    { key: 'pnr', label: 'PNR' },
    { key: 'createdDisplay', label: 'Booked On' },
    { key: 'totalDisplay', label: 'Total', align: 'right' },
  ];

  protected tabIndex = 0;
  private readonly bookings = signal<Booking[]>([]);

  protected readonly rows = computed<BookingRow[]>(() =>
    this.bookings()
      .slice()
      .sort((a, b) => (a.createdAtUtc < b.createdAtUtc ? 1 : -1))
      .map((b) => ({
        id: b.id,
        pnr: b.pnr,
        createdDisplay: new Date(b.createdAtUtc).toLocaleDateString(),
        totalDisplay: `${b.grandTotal.toFixed(2)} ${b.currency}`,
        status: b.status,
      })),
  );

  ngOnInit(): void {
    this.api.get<Booking[]>('bookings').subscribe((bookings) => this.bookings.set(bookings));
  }

  rowsForTab(): BookingRow[] {
    const statuses = this.tabIndex === 0 ? UPCOMING : this.tabIndex === 1 ? (['Completed'] as BookingStatus[]) : CANCELLED;
    return this.rows().filter((r) => statuses.includes(r.status));
  }

  emptyMessageForTab(): string {
    return this.tabIndex === 0
      ? 'Trips you have booked but not yet taken will show up here.'
      : this.tabIndex === 1
        ? 'Completed trips will show up here.'
        : 'Cancelled, expired, or refunded bookings will show up here.';
  }

  view(id: string): void {
    this.router.navigate(['/my-bookings', id]);
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent } from '../../../shared/ui';
import { TicketQrCardComponent } from '../../../shared/tickets/ticket-qr-card.component';
import { TicketView } from '../../../shared/tickets/ticket.types';
import { ApiService } from '../../../core/services/api.service';

/**
 * Chunk 6 task 4 — the counter desk's printable receipt: one ticket (with its
 * own QR) per seat, reached from the walk-in flow's "Sale complete" screen
 * via 'Print Tickets' (see walk-in-booking.component.ts). Ticket ids arrive
 * as a comma-separated 'ids' query param straight from
 * CounterSaleConfirmResult.ticketIds — deliberately not a route param or a
 * server-side "receipt for this booking" endpoint, since the confirm
 * response already has exactly the ids this screen needs and GET
 * 'tickets/{id}' (TicketsController) is already scoped so a CounterStaff
 * member can only fetch a ticket that belongs to their own operator.
 *
 * Reuses <tp-ticket-qr-card> — the same component My Bookings' ticket-detail
 * screen uses — so a counter-issued ticket and a customer's own downloaded
 * ticket render identically.
 */
@Component({
  selector: 'tp-counter-receipt',
  standalone: true,
  imports: [RouterLink, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, TicketQrCardComponent],
  template: `
    <div class="tp-receipt-page">
      <div class="tp-receipt__actions">
        <a routerLink="../dashboard"><button tpButton variant="ghost" type="button">← Dashboard</button></a>
        <button tpButton variant="primary" type="button" [disabled]="loading() || tickets().length === 0" (click)="print()">
          Print receipt
        </button>
      </div>

      @if (loading()) {
        <tp-card><tp-spinner /> Loading tickets…</tp-card>
      } @else if (tickets().length === 0) {
        <tp-empty-state title="No tickets to print" message="Start a walk-in sale first, then come back here from the confirmation screen." />
      } @else {
        @for (t of tickets(); track t.id) {
          <tp-card class="tp-receipt__ticket">
            <div class="tp-receipt__ticket-head">
              <p class="tp-muted">{{ t.busOperatorName }}</p>
              <h3>{{ t.departureTerminalName || t.departureCity }} → {{ t.arrivalTerminalName || t.arrivalCity }}</h3>
            </div>
            <tp-ticket-qr-card [ticket]="t" />
          </tp-card>
        }
      }
    </div>
  `,
  styles: [
    `
      .tp-receipt-page {
        max-width: 820px;
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-4);
      }

      .tp-receipt__actions {
        display: flex;
        justify-content: space-between;
      }

      .tp-receipt__ticket-head {
        padding-bottom: var(--tp-space-3);
        margin-bottom: var(--tp-space-3);
        border-bottom: 1px dashed var(--tp-border);
      }

      .tp-receipt__ticket-head p {
        margin: 0;
      }

      .tp-receipt__ticket-head h3 {
        margin: var(--tp-space-1) 0 0;
        font-family: var(--tp-font-heading);
      }

      @media print {
        .tp-receipt__actions {
          display: none;
        }

        .tp-receipt__ticket {
          break-inside: avoid;
          break-after: page;
        }
      }
    `,
  ],
})
export class CounterReceiptComponent implements OnInit {
  private readonly route$ = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  protected readonly loading = signal(true);
  protected readonly tickets = signal<TicketView[]>([]);

  ngOnInit(): void {
    const raw = this.route$.snapshot.queryParamMap.get('ids') ?? '';
    const ids = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      this.loading.set(false);
      return;
    }

    // Same-operator scoping is enforced server-side per ticket (TicketsController.GetById) —
    // no need to duplicate that check here.
    forkJoin(ids.map((id) => this.api.get<TicketView>(`tickets/${id}`))).subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected print(): void {
    window.print();
  }
}

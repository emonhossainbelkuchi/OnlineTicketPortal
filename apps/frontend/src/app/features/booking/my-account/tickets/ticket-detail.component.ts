import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, TpStatusPillComponent } from '../../../../shared/ui';
import { downloadTicketPdf } from '../../../../shared/tickets/ticket-pdf';
import { TicketQrCardComponent } from '../../../../shared/tickets/ticket-qr-card.component';
import { TicketView, ticketRoute } from '../../../../shared/tickets/ticket.types';

@Component({
  selector: 'tp-ticket-detail',
  standalone: true,
  imports: [RouterLink, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, TpStatusPillComponent, TicketQrCardComponent],
  template: `
    <div class="tp-page tp-ticket-page">
      <a routerLink="/my-bookings/tickets" class="tp-back-link">← My tickets</a>

      @if (loading()) {
        <div class="tp-center"><tp-spinner /></div>
      } @else if (error()) {
        <tp-empty-state title="Ticket not available" [message]="error()" />
      } @else if (ticket(); as t) {
        <tp-card class="tp-ticket">
          <div class="tp-ticket__head">
            <div>
              <p class="tp-muted">{{ t.busOperatorName }}</p>
              <h2>{{ route() }}</h2>
            </div>
            <tp-status-pill [status]="t.status" />
          </div>

          <div class="tp-ticket__body">
            <tp-ticket-qr-card [ticket]="t" (qrReady)="qr.set($event)" />
          </div>

          <div class="tp-ticket__actions">
            <button tpButton variant="primary" type="button" (click)="download()" [disabled]="!qr() || downloading()">
              {{ downloading() ? 'Preparing PDF…' : 'Download PDF' }}
            </button>
            <a [routerLink]="['/my-bookings', t.bookingId]"><button tpButton variant="secondary" type="button">View booking</button></a>
            <a routerLink="/my-bookings/complaints/new" [queryParams]="{ bookingId: t.bookingId }"><button tpButton variant="ghost" type="button">Report a problem</button></a>
          </div>
        </tp-card>
      }
    </div>
  `,
  styles: [`
    .tp-ticket-page { max-width: 820px; display: flex; flex-direction: column; gap: var(--tp-space-4); padding-top: var(--tp-space-6); }
    .tp-back-link { color: var(--tp-text-muted); text-decoration: none; font-weight: 600; }
    .tp-center { display: flex; justify-content: center; padding: var(--tp-space-6); }
    .tp-ticket__head { display: flex; justify-content: space-between; align-items: start; gap: var(--tp-space-3); padding-bottom: var(--tp-space-3); border-bottom: 1px dashed var(--tp-border); }
    .tp-ticket__head p { margin: 0; }
    h2 { margin: var(--tp-space-1) 0 0; font-family: var(--tp-font-heading); }
    .tp-ticket__body { padding: var(--tp-space-4) 0; }
    .tp-ticket__actions { display: flex; flex-wrap: wrap; gap: var(--tp-space-2); padding-top: var(--tp-space-3); border-top: 1px dashed var(--tp-border); }
  `],
})
export class TicketDetailComponent implements OnInit {
  private readonly route$ = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly ticket = signal<TicketView | null>(null);
  protected readonly qr = signal<string | null>(null);
  protected readonly downloading = signal(false);

  ngOnInit(): void {
    const id = this.route$.snapshot.paramMap.get('ticketId');
    if (!id) {
      this.error.set('No ticket selected.');
      this.loading.set(false);
      return;
    }
    // TicketsController.GetById returns 403/404 for a ticket that is not the caller's own.
    this.api.get<TicketView>(`tickets/${id}`).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.status === 404 || err.status === 403 ? 'This ticket was not found on your account.' : err.message || 'Could not load this ticket.');
        this.loading.set(false);
      },
    });
  }

  protected route(): string {
    const t = this.ticket();
    return t ? ticketRoute(t) : '';
  }

  protected async download(): Promise<void> {
    const ticket = this.ticket();
    const qr = this.qr();
    if (!ticket || !qr) return;
    this.downloading.set(true);
    try {
      await downloadTicketPdf(ticket, qr);
    } catch {
      this.toast.error('Could not create the PDF. Please try again.');
    } finally {
      this.downloading.set(false);
    }
  }
}

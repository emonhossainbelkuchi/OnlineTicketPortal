import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';
import { TpButtonDirective, TpCardComponent } from '../../../shared/ui';

interface TicketVerification {
  ticketNumber: string;
  status: string;
  validForBoarding: boolean;
  seatNumber: string;
  tripCode: string;
  operatorName: string | null;
  departureTerminal: string | null;
  arrivalTerminal: string | null;
  departureTimeUtc: string;
}

@Component({
  selector: 'tp-ticket-verify',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, TpButtonDirective, TpCardComponent],
  template: `
    <div class="tp-page tp-ticket-verify-page">
      <tp-card>
        <h2>Verify a ticket</h2>
        <p class="tp-muted">Enter the ticket number shown on the passenger's ticket. Verification only shows boarding information.</p>
        <form [formGroup]="form" (ngSubmit)="verify()">
          <input formControlName="ticketNumber" placeholder="e.g. TP-20260921-0001" autocomplete="off" />
          <button tpButton variant="primary" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Checking…' : 'Verify ticket' }}
          </button>
        </form>
        @if (error()) { <p class="tp-error-text">{{ error() }}</p> }
      </tp-card>

      @if (ticket(); as value) {
        <tp-card class="tp-ticket-result" [class.tp-ticket-result--valid]="value.validForBoarding" [class.tp-ticket-result--invalid]="!value.validForBoarding">
          <div class="tp-ticket-result__heading">
            <div>
              <p class="tp-muted">Ticket {{ value.ticketNumber }}</p>
              <h3>{{ value.validForBoarding ? 'Valid for boarding' : 'Not valid for boarding' }}</h3>
            </div>
            <span class="tp-ticket-status">{{ value.status }}</span>
          </div>
          <dl>
            <div><dt>Route</dt><dd>{{ value.departureTerminal }} → {{ value.arrivalTerminal }}</dd></div>
            <div><dt>Departure</dt><dd>{{ value.departureTimeUtc | date: 'medium' }}</dd></div>
            <div><dt>Seat</dt><dd>{{ value.seatNumber }}</dd></div>
            <div><dt>Operator</dt><dd>{{ value.operatorName || '—' }}</dd></div>
            <div><dt>Trip</dt><dd>{{ value.tripCode }}</dd></div>
          </dl>
        </tp-card>
      }
    </div>
  `,
  styles: [`
    .tp-ticket-verify-page { max-width: 680px; display: flex; flex-direction: column; gap: var(--tp-space-4); padding-top: var(--tp-space-6); }
    h2, h3 { font-family: var(--tp-font-heading); }
    h2 { margin-top: 0; }
    form { display: flex; gap: var(--tp-space-3); margin-top: var(--tp-space-4); }
    input { flex: 1; min-width: 0; border: 1px solid var(--tp-border); border-radius: var(--tp-radius-sm); padding: 10px var(--tp-space-3); font: inherit; text-transform: uppercase; }
    .tp-error-text { margin: var(--tp-space-3) 0 0; color: var(--tp-danger); font-size: 13px; }
    .tp-ticket-result { border-left: 4px solid var(--tp-danger); }
    .tp-ticket-result--valid { border-left-color: var(--tp-success); }
    .tp-ticket-result__heading { display: flex; align-items: start; justify-content: space-between; gap: var(--tp-space-3); }
    .tp-ticket-result h3 { margin: var(--tp-space-1) 0 0; }
    .tp-ticket-status { border-radius: var(--tp-radius-pill); padding: 4px 9px; color: var(--tp-text-muted); background: var(--tp-surface-alt); font-size: 12px; font-weight: 700; }
    dl { margin: var(--tp-space-4) 0 0; display: grid; gap: var(--tp-space-2); }
    dl div { display: flex; justify-content: space-between; gap: var(--tp-space-4); }
    dt { color: var(--tp-text-muted); } dd { margin: 0; font-weight: 600; text-align: right; }
    @media (max-width: 560px) { form { flex-direction: column; } }
  `],
})
export class TicketVerifyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly ticket = signal<TicketVerification | null>(null);
  protected readonly form = this.fb.nonNullable.group({ ticketNumber: ['', Validators.required] });

  verify(): void {
    if (this.form.invalid) return;
    const ticketNumber = this.form.controls.ticketNumber.value.trim();
    this.loading.set(true);
    this.error.set('');
    this.ticket.set(null);
    this.api.get<TicketVerification>(`tickets/verify/${encodeURIComponent(ticketNumber)}`).subscribe({
      next: (ticket) => { this.ticket.set(ticket); this.loading.set(false); },
      error: (error: ApiError) => {
        this.error.set(error.status === 404 ? 'Ticket not found. Check the ticket number and try again.' : error.message || 'Could not verify this ticket.');
        this.loading.set(false);
      },
    });
  }
}

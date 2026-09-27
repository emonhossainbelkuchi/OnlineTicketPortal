import { DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '@ticketportal-mono/models';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpStatusPillComponent } from '../../../shared/ui';

// Mirrors TicketsController.VerifyByTicketNumber's anonymous response shape — this screen
// deliberately reuses that same minimal-data endpoint (no passenger contact/payment details)
// rather than adding a second, richer lookup just for staff.
interface BoardingTicketLookup {
  ticketNumber: string;
  status: string;
  validForBoarding: boolean;
  checkedIn: boolean;
  seatNumber: string;
  tripCode: string;
  operatorName: string | null;
  departureTerminal: string | null;
  arrivalTerminal: string | null;
  departureTimeUtc: string;
}

// Mirrors TicketsController.CheckIn's response shape (Chunk 4 task 1).
interface CheckInResult {
  ticketNumber: string;
  status: string;
  alreadyCheckedIn: boolean;
  checkedInAtUtc: string | null;
  message: string;
}

/**
 * Chunk 4 task 2 — the boarding desk: type or scan a ticket number, see whether it's valid /
 * already used / cancelled, and check it in exactly once. Mounted at /counter/boarding (see
 * counter.routes.ts), gated on the Ticket.CheckIn permission (StaffRole.Supervisor per
 * PermissionMatrix.cs) the same way every other Counter Desk child route is gated.
 *
 * Deliberately a two-step flow (look up, then a separate "Check in" click) rather than
 * checking in on lookup alone — a barcode scanner firing twice, or staff re-reading the same
 * number, should never silently double-submit a state change; only look-up is a no-op GET.
 */
@Component({
  selector: 'tp-boarding',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, TpButtonDirective, TpCardComponent, TpStatusPillComponent],
  template: `
    <div class="tp-page tp-boarding-page">
      <header class="tp-boarding-header">
        <h2>Boarding Desk</h2>
        <p class="tp-muted">Type or scan a ticket number, confirm it's valid, then check the passenger in.</p>
      </header>

      <tp-card>
        <form [formGroup]="form" (ngSubmit)="lookup()">
          <input
            #ticketInput
            formControlName="ticketNumber"
            placeholder="e.g. TKT1A2B3C4D5E"
            autocomplete="off"
            autofocus
          />
          <button tpButton variant="primary" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Looking up…' : 'Look up' }}
          </button>
        </form>
        @if (error()) { <p class="tp-error-text">{{ error() }}</p> }
      </tp-card>

      @if (ticket(); as t) {
        <tp-card
          class="tp-boarding-result"
          [class.tp-boarding-result--ok]="t.validForBoarding && !t.checkedIn"
          [class.tp-boarding-result--used]="t.checkedIn"
          [class.tp-boarding-result--blocked]="!t.validForBoarding"
        >
          <div class="tp-boarding-result__heading">
            <div>
              <p class="tp-muted">Ticket {{ t.ticketNumber }}</p>
              <h3>
                @if (!t.validForBoarding) { Not valid for boarding }
                @else if (t.checkedIn) { Already checked in }
                @else { Ready to board }
              </h3>
            </div>
            <tp-status-pill [status]="t.status" />
          </div>

          <dl>
            <div><dt>Route</dt><dd>{{ t.departureTerminal }} → {{ t.arrivalTerminal }}</dd></div>
            <div><dt>Departure</dt><dd>{{ t.departureTimeUtc | date: 'medium' }}</dd></div>
            <div><dt>Seat</dt><dd>{{ t.seatNumber }}</dd></div>
            <div><dt>Operator</dt><dd>{{ t.operatorName || '—' }}</dd></div>
            <div><dt>Trip</dt><dd>{{ t.tripCode }}</dd></div>
          </dl>

          @if (checkInMessage()) { <p class="tp-boarding-note">{{ checkInMessage() }}</p> }

          <div class="tp-boarding-result__actions">
            @if (t.validForBoarding && !t.checkedIn) {
              <button tpButton variant="primary" type="button" [disabled]="checkingIn()" (click)="checkIn(t.ticketNumber)">
                {{ checkingIn() ? 'Checking in…' : 'Check in' }}
              </button>
            }
            <button tpButton variant="secondary" type="button" (click)="reset()">Next ticket</button>
          </div>
        </tp-card>
      }
    </div>
  `,
  styles: [`
    .tp-boarding-page { max-width: 680px; display: flex; flex-direction: column; gap: var(--tp-space-4); padding-top: var(--tp-space-2); }
    .tp-boarding-header { margin-bottom: var(--tp-space-2); }
    .tp-boarding-header h2 { font-family: var(--tp-font-heading); margin: 0 0 var(--tp-space-1); }
    .tp-boarding-header p { margin: 0; }
    form { display: flex; gap: var(--tp-space-3); }
    input { flex: 1; min-width: 0; border: 1px solid var(--tp-border); border-radius: var(--tp-radius-sm); padding: 10px var(--tp-space-3); font: inherit; text-transform: uppercase; }
    .tp-error-text { margin: var(--tp-space-3) 0 0; color: var(--tp-danger); font-size: 13px; }
    .tp-boarding-result { border-left: 4px solid var(--tp-danger); }
    .tp-boarding-result--ok { border-left-color: var(--tp-success); }
    .tp-boarding-result--used { border-left-color: var(--tp-warning, var(--tp-text-muted)); }
    .tp-boarding-result__heading { display: flex; align-items: start; justify-content: space-between; gap: var(--tp-space-3); }
    .tp-boarding-result h3 { margin: var(--tp-space-1) 0 0; font-family: var(--tp-font-heading); }
    dl { margin: var(--tp-space-4) 0 0; display: grid; gap: var(--tp-space-2); }
    dl div { display: flex; justify-content: space-between; gap: var(--tp-space-4); }
    dt { color: var(--tp-text-muted); } dd { margin: 0; font-weight: 600; text-align: right; }
    .tp-boarding-note { margin: var(--tp-space-3) 0 0; font-size: 13px; color: var(--tp-text-muted); font-style: italic; }
    .tp-boarding-result__actions { display: flex; justify-content: flex-end; gap: var(--tp-space-3); margin-top: var(--tp-space-4); }
    @media (max-width: 560px) { form { flex-direction: column; } }
  `],
})
export class BoardingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  @ViewChild('ticketInput') private readonly ticketInput?: ElementRef<HTMLInputElement>;

  protected readonly loading = signal(false);
  protected readonly checkingIn = signal(false);
  protected readonly error = signal('');
  protected readonly checkInMessage = signal('');
  protected readonly ticket = signal<BoardingTicketLookup | null>(null);
  protected readonly form = this.fb.nonNullable.group({ ticketNumber: ['', Validators.required] });

  lookup(): void {
    if (this.form.invalid) return;
    const ticketNumber = this.form.controls.ticketNumber.value.trim();

    this.loading.set(true);
    this.error.set('');
    this.checkInMessage.set('');
    this.ticket.set(null);

    this.api.get<BoardingTicketLookup>(`tickets/verify/${encodeURIComponent(ticketNumber)}`).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.status === 404 ? 'Ticket not found. Check the number and try again.' : err.message || 'Could not look up this ticket.');
        this.loading.set(false);
      },
    });
  }

  checkIn(ticketNumber: string): void {
    this.checkingIn.set(true);
    this.checkInMessage.set('');

    this.api.post<CheckInResult>(`tickets/${encodeURIComponent(ticketNumber)}/check-in`).subscribe({
      next: (result) => {
        const current = this.ticket();
        if (current) {
          this.ticket.set({ ...current, status: result.status, checkedIn: true });
        }
        this.checkInMessage.set(result.message);
        this.checkingIn.set(false);
        if (result.alreadyCheckedIn) {
          this.toast.warning(result.message);
        } else {
          this.toast.success(`${ticketNumber} checked in.`);
        }
      },
      error: (err: ApiError) => {
        this.checkInMessage.set(err.message || 'Could not check in this ticket.');
        this.checkingIn.set(false);
      },
    });
  }

  /** Clears the result and hands focus straight back to the input for the next ticket. */
  reset(): void {
    this.ticket.set(null);
    this.error.set('');
    this.checkInMessage.set('');
    this.form.reset({ ticketNumber: '' });
    this.ticketInput?.nativeElement.focus();
  }
}

import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Booking, Complaint, ComplaintStatus } from '@ticketportal-mono/models';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpModalComponent, TpSpinnerComponent, TpStatusPillComponent } from '../../../shared/ui';
import { BookingsLookupService } from '../services/bookings-lookup.service';
import { ComplaintsService } from '../services/complaints.service';

const STATUSES: ComplaintStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];

/**
 * Piece 5, screen 6 — complaints intake. GetAll is platform-wide (see
 * ComplaintsService's doc comment), so this screen does its own text
 * filter over subject/booking rather than relying on a server-side scope.
 *
 * The "Log Complaint" action has a real limitation, called out in the
 * modal itself: ComplaintCreateDto always attaches to whoever is LOGGED
 * IN — there's no field for a different, walk-in customer. See
 * ComplaintCreateRequest's doc comment for the exact backend behavior.
 */
@Component({
  selector: 'tp-complaints',
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
  ],
  template: `
    <tp-card>
      <div class="tp-toolbar">
        <h2>Complaints</h2>
        <div class="tp-toolbar__right">
          <input type="text" class="tp-search" placeholder="Filter by subject or booking…" [value]="filterText()" (input)="onFilter($event)" />
          <button tpButton variant="primary" (click)="openCreate()">+ Log Complaint</button>
        </div>
      </div>

      @if (loading()) {
        <tp-spinner />
      } @else if (filtered().length === 0) {
        <tp-empty-state title="No complaints found" message="Nothing matches this filter right now." />
      } @else {
        <div class="tp-table-wrap">
          <table class="tp-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Booking</th>
                <th>Status</th>
                <th>Logged</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (complaint of filtered(); track complaint.id) {
                <tr>
                  <td>
                    {{ complaint.subject }}
                    <div class="tp-muted tp-description">{{ complaint.description }}</div>
                  </td>
                  <td>{{ complaint.bookingId ? bookingLabel(complaint.bookingId) : '—' }}</td>
                  <td><tp-status-pill [status]="complaint.status" /></td>
                  <td>{{ complaint.createdAtUtc | date: 'MMM d, h:mm a' }}</td>
                  <td>
                    <select [value]="complaint.status" (change)="updateStatus(complaint, $event)">
                      @for (status of statuses; track status) {
                        <option [value]="status">{{ status }}</option>
                      }
                    </select>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </tp-card>

    <tp-modal [open]="modalOpen()" title="Log Complaint" (closed)="closeModal()">
      <p class="tp-note">
        This will be filed under your own staff account — the backend doesn't yet support attaching a complaint to a
        different, walk-in customer's profile. Link a booking ID if the complaint relates to one.
      </p>
      <form [formGroup]="form" class="tp-form">
        <label>
          Booking ID <span class="tp-muted">(optional)</span>
          <input type="text" formControlName="bookingId" />
        </label>
        <label>
          Subject
          <input type="text" formControlName="subject" />
        </label>
        <label>
          Description
          <textarea rows="4" formControlName="description"></textarea>
        </label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="closeModal()">Cancel</button>
        <button tpButton variant="primary" [disabled]="form.invalid || saving()" (click)="save()">
          {{ saving() ? 'Saving…' : 'Log Complaint' }}
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
        flex-wrap: wrap;
        gap: var(--tp-space-3);
      }

      .tp-toolbar h2 {
        margin: 0;
      }

      .tp-toolbar__right {
        display: flex;
        gap: var(--tp-space-3);
        align-items: center;
      }

      .tp-search {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 8px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        min-width: 220px;
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
        vertical-align: top;
      }

      .tp-table tbody tr:last-child td {
        border-bottom: none;
      }

      .tp-description {
        max-width: 360px;
      }

      .tp-table select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 6px var(--tp-space-2);
        font-size: 13px;
        font-family: var(--tp-font-body);
      }

      .tp-note {
        background: var(--tp-warning-tint);
        color: #8a5a00;
        border-radius: var(--tp-radius-sm);
        padding: var(--tp-space-3);
        font-size: 13px;
        margin-top: 0;
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

      .tp-form input,
      .tp-form textarea {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
        resize: vertical;
      }
    `,
  ],
})
export class ComplaintsComponent implements OnInit {
  private readonly complaintsService = inject(ComplaintsService);
  private readonly bookingsLookup = inject(BookingsLookupService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly statuses = STATUSES;
  protected readonly loading = signal(true);
  protected readonly complaints = signal<Complaint[]>([]);
  private readonly bookingsById = signal<Map<string, Booking>>(new Map());
  protected readonly filterText = signal('');

  protected readonly filtered = computed(() => {
    const term = this.filterText().trim().toLowerCase();
    if (!term) return this.complaints();
    return this.complaints().filter(
      (c) => c.subject.toLowerCase().includes(term) || (c.bookingId ? this.bookingLabel(c.bookingId).toLowerCase().includes(term) : false),
    );
  });

  protected readonly modalOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    bookingId: [''],
    subject: ['', Validators.required],
    description: ['', Validators.required],
  });

  ngOnInit(): void {
    this.bookingsLookup.list().subscribe((bookings) => {
      this.bookingsById.set(new Map(bookings.map((b) => [b.id, b])));
    });
    this.refresh();
  }

  protected bookingLabel(bookingId: string): string {
    const booking = this.bookingsById().get(bookingId);
    return booking ? `${booking.pnr} — ${booking.contactName}` : bookingId;
  }

  protected onFilter(event: Event): void {
    this.filterText.set((event.target as HTMLInputElement).value);
  }

  protected openCreate(): void {
    this.form.reset({ bookingId: '', subject: '', description: '' });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();

    this.complaintsService
      .create({ bookingId: raw.bookingId || undefined, subject: raw.subject, description: raw.description })
      .subscribe({
        next: () => {
          this.toast.success('Complaint logged.');
          this.saving.set(false);
          this.closeModal();
          this.refresh();
        },
        error: () => this.saving.set(false),
      });
  }

  protected updateStatus(complaint: Complaint, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as ComplaintStatus;
    if (status === complaint.status) return;

    this.complaintsService.updateStatus(complaint.id, { status }).subscribe({
      next: () => {
        this.toast.success('Status updated.');
        this.refresh();
      },
      error: () => this.refresh(),
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.complaintsService.list().subscribe({
      next: (complaints) => {
        this.complaints.set(complaints);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

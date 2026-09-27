import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError, Complaint } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, TpStatusPillComponent } from '../../../../shared/ui';
import { AccountNavComponent } from '../account-nav/account-nav.component';

/**
 * The customer's side of complaints (the counter desk's staff-side screen already existed).
 * ComplaintsController.GetAll is scoped server-side to the caller's own complaints.
 */
@Component({
  selector: 'tp-my-complaints',
  standalone: true,
  imports: [DatePipe, RouterLink, AccountNavComponent, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent, TpStatusPillComponent],
  template: `
    <div class="tp-page">
      <div class="tp-complaints__head">
        <h2>My Complaints</h2>
        <a routerLink="/my-bookings/complaints/new"><button tpButton variant="primary" type="button">New complaint</button></a>
      </div>
      <tp-account-nav />

      @if (loading()) {
        <div class="tp-center"><tp-spinner /></div>
      } @else if (error()) {
        <tp-card><p class="tp-error-text">{{ error() }}</p></tp-card>
      } @else if (complaints().length === 0) {
        <tp-empty-state title="No complaints" message="If something went wrong with a trip or a payment, let us know and our team will follow up." />
      } @else {
        <div class="tp-complaint-list">
          @for (c of complaints(); track c.id) {
            <tp-card>
              <div class="tp-complaint__top">
                <h3>{{ c.subject }}</h3>
                <tp-status-pill [status]="c.status" />
              </div>
              <p class="tp-complaint__body">{{ c.description }}</p>
              <p class="tp-muted tp-complaint__meta">
                Filed {{ c.createdAtUtc | date: 'medium' }}
                @if (c.resolvedAtUtc) { · Resolved {{ c.resolvedAtUtc | date: 'medium' }} }
                @if (c.bookingId) { · <a [routerLink]="['/my-bookings', c.bookingId]">View booking</a> }
              </p>
            </tp-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .tp-complaints__head { display: flex; align-items: center; justify-content: space-between; gap: var(--tp-space-3); }
    .tp-complaints__head h2 { margin: 0; }
    .tp-center { display: flex; justify-content: center; padding: var(--tp-space-6); }
    .tp-error-text { color: var(--tp-danger); margin: 0; }
    .tp-complaint-list { display: flex; flex-direction: column; gap: var(--tp-space-3); }
    .tp-complaint__top { display: flex; align-items: start; justify-content: space-between; gap: var(--tp-space-3); }
    h3 { margin: 0; font-family: var(--tp-font-heading); font-size: 17px; }
    .tp-complaint__body { margin: var(--tp-space-2) 0; white-space: pre-line; }
    .tp-complaint__meta { margin: 0; font-size: 13px; }
  `],
})
export class MyComplaintsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly complaints = signal<Complaint[]>([]);

  ngOnInit(): void {
    this.api.get<Complaint[]>('complaints').subscribe({
      next: (list) => {
        this.complaints.set([...list].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc)));
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message || 'Could not load your complaints.');
        this.loading.set(false);
      },
    });
  }
}

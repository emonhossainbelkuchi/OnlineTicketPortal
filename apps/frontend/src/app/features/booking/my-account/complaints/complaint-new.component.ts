import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError, Booking, Complaint, ComplaintCreateRequest } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent } from '../../../../shared/ui';

@Component({
  selector: 'tp-complaint-new',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TpButtonDirective, TpCardComponent],
  template: `
    <div class="tp-page tp-complaint-page">
      <a routerLink="/my-bookings/complaints" class="tp-back-link">← My complaints</a>
      <tp-card>
        <h2>Report a problem</h2>
        <p class="tp-muted">Tell us what went wrong. Attach the booking it relates to so we can find it faster.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Related booking <span class="tp-muted">(optional)</span>
            <select formControlName="bookingId">
              <option value="">Not about a specific booking</option>
              @for (b of bookings(); track b.id) { <option [value]="b.id">{{ b.pnr }}</option> }
            </select>
          </label>
          <label>Subject
            <input formControlName="subject" maxlength="120" placeholder="e.g. Bus left without me" />
          </label>
          <label>What happened?
            <textarea formControlName="description" rows="6" maxlength="1000" placeholder="Describe the problem in a few sentences."></textarea>
            <span class="tp-muted tp-count">{{ form.controls.description.value.length }}/1000</span>
          </label>
          @if (error()) { <p class="tp-error-text">{{ error() }}</p> }
          <div class="tp-complaint-page__actions">
            <button tpButton variant="primary" type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Sending…' : 'Submit complaint' }}</button>
            <a routerLink="/my-bookings/complaints"><button tpButton variant="ghost" type="button">Cancel</button></a>
          </div>
        </form>
      </tp-card>
    </div>
  `,
  styles: [`
    .tp-complaint-page { max-width: 640px; display: flex; flex-direction: column; gap: var(--tp-space-4); padding-top: var(--tp-space-6); }
    .tp-back-link { color: var(--tp-text-muted); text-decoration: none; font-weight: 600; }
    h2 { margin: 0; font-family: var(--tp-font-heading); }
    form { display: flex; flex-direction: column; gap: var(--tp-space-4); margin-top: var(--tp-space-4); }
    label { display: flex; flex-direction: column; gap: var(--tp-space-1); font-size: 13px; font-weight: 600; color: var(--tp-text-muted); }
    select, input, textarea { border: 1px solid var(--tp-border); border-radius: var(--tp-radius-sm); padding: 10px var(--tp-space-3); font: inherit; color: var(--tp-text); background: var(--tp-surface); }
    textarea { resize: vertical; }
    .tp-count { align-self: flex-end; font-weight: 400; font-size: 12px; }
    .tp-error-text { color: var(--tp-danger); margin: 0; font-size: 13px; }
    .tp-complaint-page__actions { display: flex; gap: var(--tp-space-2); }
  `],
})
export class ComplaintNewComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    bookingId: [''],
    subject: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    const preselected = this.route.snapshot.queryParamMap.get('bookingId');
    if (preselected) this.form.controls.bookingId.setValue(preselected);
    this.api.get<Booking[]>('bookings').subscribe({
      next: (list) => this.bookings.set(list),
      error: () => undefined, // the booking link is optional
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const { bookingId, subject, description } = this.form.getRawValue();
    const body: ComplaintCreateRequest = { subject: subject.trim(), description: description.trim(), ...(bookingId ? { bookingId } : {}) };
    this.saving.set(true);
    this.error.set('');
    this.api.post<Complaint>('complaints', body).subscribe({
      next: () => {
        this.toast.success('Complaint submitted. We will follow up soon.');
        void this.router.navigate(['/my-bookings/complaints']);
      },
      error: (err: ApiError) => {
        this.error.set(err.message || 'Could not submit your complaint.');
        this.saving.set(false);
      },
    });
  }
}

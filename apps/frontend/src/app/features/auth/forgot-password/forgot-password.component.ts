import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TpButtonDirective } from '../../../shared/ui';

@Component({
  selector: 'tp-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TpButtonDirective],
  template: `
    <div class="tp-recovery-page">
      <section class="tp-recovery-card">
        <h2>Reset your password</h2>
        @if (submitted()) {
          <p class="tp-muted">If an account uses that email address, password-reset instructions have been sent.</p>
          <a routerLink="/auth/login"><button tpButton variant="primary">Back to log in</button></a>
        } @else {
          <p class="tp-muted">Enter the email address associated with your TicketPortal account.</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <label>Email <input type="email" formControlName="email" autocomplete="email" /></label>
            <button tpButton variant="primary" type="submit" [disabled]="form.invalid || sending()">
              {{ sending() ? 'Sending…' : 'Send reset link' }}
            </button>
          </form>
          <a class="tp-back-link" routerLink="/auth/login">Back to log in</a>
        }
      </section>
    </div>
  `,
  styles: [`
    .tp-recovery-page { display: flex; justify-content: center; padding: var(--tp-space-7) var(--tp-space-5); }
    .tp-recovery-card { width: 100%; max-width: 460px; padding: var(--tp-space-6); border: 1px solid var(--tp-border); border-radius: var(--tp-radius-lg); background: var(--tp-surface); box-shadow: var(--tp-shadow-card); }
    h2 { margin-top: 0; font-family: var(--tp-font-heading); }
    form { display: flex; flex-direction: column; gap: var(--tp-space-4); margin-top: var(--tp-space-5); }
    label { display: flex; flex-direction: column; gap: var(--tp-space-2); color: var(--tp-text-muted); font-size: 13px; font-weight: 600; }
    input { border: 1px solid var(--tp-border); border-radius: var(--tp-radius-sm); padding: 10px var(--tp-space-3); font: inherit; }
    .tp-back-link { display: inline-block; margin-top: var(--tp-space-5); color: var(--tp-yellow-dark); font-size: 13px; font-weight: 600; }
  `],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly sending = signal(false);
  protected readonly submitted = signal(false);
  protected readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  submit(): void {
    if (this.form.invalid) return;
    this.sending.set(true);
    this.auth.forgotPassword(this.form.getRawValue()).subscribe({
      next: () => { this.sending.set(false); this.submitted.set(true); },
      error: () => this.sending.set(false),
    });
  }
}

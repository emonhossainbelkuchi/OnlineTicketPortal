import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective } from '../../../shared/ui';

function passwordsMatch(value: { newPassword: string; confirmPassword: string }): boolean {
  return value.newPassword === value.confirmPassword;
}

@Component({
  selector: 'tp-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TpButtonDirective],
  template: `
    <div class="tp-recovery-page">
      <section class="tp-recovery-card">
        <h2>Choose a new password</h2>
        @if (!hasValidLink()) {
          <p class="tp-error-text">This reset link is incomplete. Request a new one to continue.</p>
          <a routerLink="/auth/forgot-password"><button tpButton variant="primary">Request a new link</button></a>
        } @else if (completed()) {
          <p class="tp-muted">Your password has been reset. You can now log in with it.</p>
          <a routerLink="/auth/login"><button tpButton variant="primary">Log in</button></a>
        } @else {
          <p class="tp-muted">Use at least six characters and keep this password private.</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <label>New password <input type="password" formControlName="newPassword" autocomplete="new-password" /></label>
            <label>Confirm password <input type="password" formControlName="confirmPassword" autocomplete="new-password" /></label>
            @if (form.value.newPassword && form.value.confirmPassword && !passwordsMatch()) { <p class="tp-error-text">Passwords do not match.</p> }
            <button tpButton variant="primary" type="submit" [disabled]="form.invalid || !passwordsMatch() || saving()">
              {{ saving() ? 'Resetting…' : 'Reset password' }}
            </button>
          </form>
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
    .tp-error-text { color: var(--tp-danger); font-size: 13px; margin: 0; }
  `],
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly saving = signal(false);
  protected readonly completed = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  protected hasValidLink(): boolean { return !!this.email && !!this.token; }
  protected passwordsMatch(): boolean { return passwordsMatch(this.form.getRawValue()); }

  submit(): void {
    if (this.form.invalid || !this.passwordsMatch() || !this.hasValidLink()) return;
    this.saving.set(true);
    this.auth.resetPassword({ email: this.email, token: this.token, newPassword: this.form.controls.newPassword.value }).subscribe({
      next: () => {
        this.saving.set(false);
        this.completed.set(true);
        this.toast.success('Password reset successfully.');
      },
      error: () => {
        this.saving.set(false);
        this.router.navigate(['/auth/forgot-password']);
      },
    });
  }
}

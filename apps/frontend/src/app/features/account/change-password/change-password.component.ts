import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent } from '../../../shared/ui';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordMismatch: true } : null;
}

/**
 * Top-level route (not under /my-bookings), guarded by authGuard alone with no role
 * restriction — every authenticated user, Customer or Staff/Operator/Admin, can change their
 * own password, same as the "My Profile" / "Change Password" pattern from the reference screen.
 */
@Component({
  selector: 'tp-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, TpCardComponent, TpButtonDirective, MatFormFieldModule, MatInputModule],
  template: `
    <div class="tp-page tp-change-password-page">
      <h2>Change Password</h2>
      <tp-card>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Current password</mat-label>
            <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>New password</mat-label>
            <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
            @if (form.controls.newPassword.hasError('minlength')) {
              <mat-error>Must be at least 6 characters.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirm new password</mat-label>
            <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
            @if (form.hasError('passwordMismatch') && form.controls.confirmPassword.dirty) {
              <mat-error>Passwords don't match.</mat-error>
            }
          </mat-form-field>

          <div class="tp-change-password-page__actions">
            <button tpButton variant="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Updating…' : 'Update Password' }}
            </button>
          </div>
        </form>
      </tp-card>
    </div>
  `,
  styles: [
    `
      .tp-change-password-page {
        max-width: 440px;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-1);
      }

      mat-form-field {
        width: 100%;
      }

      .tp-change-password-page__actions {
        display: flex;
        justify-content: flex-end;
        margin-top: var(--tp-space-2);
      }
    `,
  ],
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  submit(): void {
    if (this.form.invalid) return;
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.toast.success('Password updated.');
      },
      error: () => this.saving.set(false),
    });
  }
}

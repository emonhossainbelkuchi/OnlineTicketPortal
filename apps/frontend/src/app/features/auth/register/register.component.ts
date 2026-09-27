import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective } from '../../../shared/ui';
import { TpLogoComponent } from '../../../shared/ui/logo/tp-logo.component';

/**
 * Every self-signup account lands in the "Customer" role on the backend —
 * there's no role picker here on purpose. Operator/Staff/Admin accounts are
 * created by an existing Admin (AdminController -> POST /staff), which is
 * Piece 7's job, not this page's.
 */
@Component({
  selector: 'tp-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TpButtonDirective, TpLogoComponent],
  template: `
    <div class="tp-auth-page">
      <div class="tp-auth-split">
        <aside class="tp-auth-brand">
          <div class="tp-auth-brand__mesh" aria-hidden="true"></div>
          <tp-logo [size]="40" [wordmark]="true" tone="light" />
          <div class="tp-auth-brand__copy">
            <h1>Join the network<br />of every operator.</h1>
            <p>Create an account once and book any operator's bus, on any route, in seconds.</p>
          </div>
        </aside>

        <div class="tp-auth-form-panel">
          <div class="tp-auth-form-panel__inner">
            <h2>Create your account</h2>
            <p class="tp-muted">Book bus tickets across every operator on TicketPortal.</p>

            <form [formGroup]="form" (ngSubmit)="submit()">
              <label>
                Full name
                <input type="text" formControlName="fullName" autocomplete="name" />
              </label>

              <label>
                Username
                <input type="text" formControlName="userName" autocomplete="username" />
              </label>

              <label>
                Email
                <input type="email" formControlName="email" autocomplete="email" />
              </label>

              <label>
                Password
                <input type="password" formControlName="password" autocomplete="new-password" />
              </label>

              <button tpButton variant="primary" type="submit" [disabled]="form.invalid || submitting()" style="width: 100%">
                {{ submitting() ? 'Creating account…' : 'Sign up' }}
              </button>
            </form>

            <p class="tp-auth-card__switch">
              Already have an account? <a routerLink="/auth/login">Log in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .tp-auth-page {
        display: flex;
        justify-content: center;
        padding: var(--tp-space-7) var(--tp-space-5);
      }

      .tp-auth-split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
        max-width: 920px;
        border-radius: var(--tp-radius-xl);
        overflow: hidden;
        box-shadow: var(--tp-shadow-elevated);
        border: 1px solid var(--tp-border);
      }

      .tp-auth-brand {
        position: relative;
        background: var(--tp-ink);
        color: var(--tp-ink-text);
        padding: var(--tp-space-6);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
      }

      .tp-auth-brand__mesh {
        position: absolute;
        inset: 0;
        background: var(--tp-gradient-mesh);
        opacity: 0.9;
      }

      .tp-auth-brand tp-logo {
        position: relative;
        z-index: 1;
      }

      .tp-auth-brand__copy {
        position: relative;
        z-index: 1;
      }

      .tp-auth-brand__copy h1 {
        font-family: var(--tp-font-heading);
        font-size: 28px;
        line-height: 1.2;
        margin: 0 0 var(--tp-space-3);
      }

      .tp-auth-brand__copy p {
        margin: 0;
        font-size: 14px;
        color: var(--tp-ink-text-muted);
        max-width: 300px;
      }

      .tp-auth-form-panel {
        background: var(--tp-surface);
        display: flex;
        align-items: center;
        padding: var(--tp-space-6);
      }

      .tp-auth-form-panel__inner {
        width: 100%;
      }

      .tp-auth-form-panel h2 {
        margin: 0 0 var(--tp-space-1);
        font-family: var(--tp-font-heading);
      }

      form {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-4);
        margin-top: var(--tp-space-5);
      }

      label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      input {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
        transition: border-color var(--tp-transition-fast), box-shadow var(--tp-transition-fast);
      }

      input:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }

      .tp-auth-card__switch {
        text-align: center;
        font-size: 13px;
        color: var(--tp-text-muted);
        margin-top: var(--tp-space-5);
        margin-bottom: 0;
      }

      .tp-auth-card__switch a {
        color: var(--tp-yellow-dark);
        font-weight: 600;
      }

      @media (max-width: 720px) {
        .tp-auth-split {
          grid-template-columns: 1fr;
        }

        .tp-auth-brand {
          display: none;
        }
      }
    `,
  ],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Account created — please log in.');
        this.router.navigate(['/auth/login']);
      },
      error: () => this.submitting.set(false),
    });
  }
}

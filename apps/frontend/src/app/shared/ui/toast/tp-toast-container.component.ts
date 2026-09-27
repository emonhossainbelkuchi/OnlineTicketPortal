import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Mount exactly ONCE, in ShellComponent — every feature module just calls
 * ToastService.success()/.error()/etc. and it shows up here automatically.
 * Don't add a second <tp-toast-container> inside a feature page.
 */
@Component({
  selector: 'tp-toast-container',
  standalone: true,
  template: `
    <div class="tp-toast-stack">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="tp-toast" [class]="'tp-toast--' + toast.type">
          <span>{{ toast.message }}</span>
          <button type="button" aria-label="Dismiss" (click)="toastService.dismiss(toast.id)">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tp-toast-stack {
        position: fixed;
        top: var(--tp-space-5);
        right: var(--tp-space-5);
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        z-index: 2000;
        max-width: 360px;
      }

      .tp-toast {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--tp-space-3);
        padding: var(--tp-space-3) var(--tp-space-4);
        border-radius: var(--tp-radius-sm);
        box-shadow: var(--tp-shadow-elevated);
        font-size: 14px;
        font-weight: 500;
        animation: tp-toast-in var(--tp-transition);
        background: var(--tp-surface);
        border: 1px solid var(--tp-border);
      }

      .tp-toast--success {
        border-color: var(--tp-success);
        background: var(--tp-success-tint);
        color: var(--tp-success);
      }

      .tp-toast--error {
        border-color: var(--tp-danger);
        background: var(--tp-danger-tint);
        color: var(--tp-danger);
      }

      .tp-toast--warning {
        border-color: var(--tp-warning);
        background: var(--tp-warning-tint);
        color: #8a5a00;
      }

      .tp-toast--info {
        border-color: var(--tp-info);
        background: var(--tp-info-tint);
        color: var(--tp-info);
      }

      .tp-toast button {
        border: none;
        background: transparent;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
      }

      .tp-toast button:hover {
        opacity: 1;
      }

      @keyframes tp-toast-in {
        from {
          opacity: 0;
          transform: translateX(16px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
  ],
})
export class TpToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}

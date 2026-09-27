import { Component, Input } from '@angular/core';

/**
 * Usage: <tp-spinner /> or <tp-spinner size="lg" />
 * Also see ShellComponent's top-of-page loading bar (driven by
 * LoadingService) for whole-page loads — use THIS component for
 * inline/local loading states instead (a card's content, a button, etc.).
 */
@Component({
  selector: 'tp-spinner',
  standalone: true,
  template: `<span class="tp-spinner" [class]="'tp-spinner--' + size" role="status" aria-label="Loading"></span>`,
  styles: [
    `
      .tp-spinner {
        display: inline-block;
        border-radius: 50%;
        border: 3px solid var(--tp-yellow-tint);
        border-top-color: var(--tp-yellow-dark);
        animation: tp-spin 0.7s linear infinite;
      }

      .tp-spinner--sm {
        width: 16px;
        height: 16px;
        border-width: 2px;
      }

      .tp-spinner--md {
        width: 28px;
        height: 28px;
      }

      .tp-spinner--lg {
        width: 44px;
        height: 44px;
        border-width: 4px;
      }

      @keyframes tp-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class TpSpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}

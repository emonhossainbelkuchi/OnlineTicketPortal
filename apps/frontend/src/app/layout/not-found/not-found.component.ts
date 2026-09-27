import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TpButtonDirective } from '../../shared/ui/button/tp-button.directive';

@Component({
  selector: 'tp-not-found',
  standalone: true,
  imports: [RouterLink, TpButtonDirective],
  template: `
    <div class="tp-page tp-status-page">
      <div class="tp-status-page__icon tp-icon-badge">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path d="M9.5 9.5L14.5 12.5M14.5 9.5L9.5 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
      <h1>404 — Page not found</h1>
      <p class="tp-muted">The page you're looking for doesn't exist or was moved.</p>
      <a routerLink="/search"><button tpButton variant="primary">Back to Search</button></a>
    </div>
  `,
  styles: [
    `
      .tp-status-page {
        text-align: center;
        padding-top: var(--tp-space-7);
        padding-bottom: var(--tp-space-7);
      }

      .tp-status-page__icon {
        width: 72px;
        height: 72px;
        margin: 0 auto var(--tp-space-4);
      }
    `,
  ],
})
export class NotFoundComponent {}

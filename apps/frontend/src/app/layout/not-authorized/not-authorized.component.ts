import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TpButtonDirective } from '../../shared/ui/button/tp-button.directive';

@Component({
  selector: 'tp-not-authorized',
  standalone: true,
  imports: [RouterLink, TpButtonDirective],
  template: `
    <div class="tp-page tp-status-page">
      <div class="tp-status-page__icon tp-icon-badge">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="5" y="10.5" width="14" height="10" rx="2.2" stroke="currentColor" stroke-width="2" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="15.2" r="1.6" fill="currentColor" />
        </svg>
      </div>
      <h1>You don't have access to this page</h1>
      <p class="tp-muted">This area is restricted to a different account role.</p>
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
export class NotAuthorizedComponent {}

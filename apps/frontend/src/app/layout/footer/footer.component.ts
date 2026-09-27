import { Component } from '@angular/core';
import { TpLogoComponent } from '../../shared/ui/logo/tp-logo.component';

@Component({
  selector: 'tp-footer',
  standalone: true,
  imports: [TpLogoComponent],
  template: `
    <footer class="tp-footer">
      <div class="tp-footer__inner">
        <div class="tp-footer__brand">
          <tp-logo [size]="30" [wordmark]="true" tone="light" />
          <p>Book bus tickets across every operator, in one place.</p>
        </div>
        <div class="tp-footer__meta">
          <span>© {{ year }} TicketPortal</span>
          <span class="tp-footer__dot">•</span>
          <span>Multi-tenant bus ticket booking platform</span>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .tp-footer {
        background: var(--tp-ink);
        margin-top: var(--tp-space-5);
        position: relative;
      }

      .tp-footer::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        /* A soft white sheen reads as "catching the light" against the
           icy-blue-to-peach prism gradient panel — stays visible across
           the whole width, unlike a solid accent color that would blend
           into whichever end of the gradient matches it. */
        background: rgba(255, 255, 255, 0.9);
      }

      .tp-footer__inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--tp-space-4) var(--tp-space-5);
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: var(--tp-space-4);
      }

      .tp-footer__brand {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
      }

      .tp-footer__brand p {
        margin: 0;
        font-size: 13px;
        color: var(--tp-ink-text-muted);
        max-width: 320px;
      }

      .tp-footer__meta {
        font-size: 13px;
        color: var(--tp-ink-text-muted);
        display: flex;
        align-items: center;
        gap: var(--tp-space-2);
      }

      .tp-footer__dot {
        opacity: 0.5;
      }

      @media (max-width: 640px) {
        .tp-footer__inner {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}

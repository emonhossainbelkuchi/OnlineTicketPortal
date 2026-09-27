import { Component, Input } from '@angular/core';

let nextLogoId = 0;

/**
 * The TicketPortal brand mark — a single reusable SVG badge, literally a
 * ticket (rounded stub, two punched-out side notches, a dashed tear-line)
 * rather than an abstract route/pin glyph, so the icon reads as "bus ticket
 * booking" at a glance, including at favicon size.
 *
 * Gradient stops are driven by CSS variables (--tp-brand-1/2/3, defined in
 * apps/frontend/src/styles/theme-overrides.css) so the mark always follows
 * the app's current brand palette instead of hardcoding a color here.
 *
 * Usage:
 *   <tp-logo />                      // 32px badge only
 *   <tp-logo [size]="40" />
 *   <tp-logo [wordmark]="true" />    // badge + "TicketPortal" wordmark, for navbars/headers
 *   <tp-logo tone="light" [wordmark]="true" />  // for dark surfaces (footer, hero panels)
 */
@Component({
  selector: 'tp-logo',
  standalone: true,
  template: `
    <span class="tp-logo" [class.tp-logo--light]="tone === 'light'">
      <svg
        [attr.width]="size"
        [attr.height]="size"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient [attr.id]="gradientId" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0" style="stop-color: var(--tp-brand-1, #a8d8ea)" />
            <stop offset="0.5" style="stop-color: var(--tp-brand-2, #d9c9f0)" />
            <stop offset="1" style="stop-color: var(--tp-brand-3, #ffd3b4)" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" [attr.fill]="'url(#' + gradientId + ')'" />
        <!-- Ticket silhouette: a stub with two punched side-notches and a tear-line. -->
        <rect x="7" y="13" width="26" height="14" rx="3.2" stroke="white" stroke-width="2" fill="none" />
        <circle cx="7" cy="20" r="2.8" [attr.fill]="'url(#' + gradientId + ')'" />
        <circle cx="33" cy="20" r="2.8" [attr.fill]="'url(#' + gradientId + ')'" />
        <line x1="21.5" y1="15.2" x2="21.5" y2="24.8" stroke="white" stroke-width="2" stroke-dasharray="2.2 2.4" stroke-linecap="round" />
      </svg>
      @if (wordmark) {
        <span class="tp-logo__word">TicketPortal</span>
      }
    </span>
  `,
  styles: [
    `
      .tp-logo {
        display: inline-flex;
        align-items: center;
        gap: var(--tp-space-2);
        line-height: 1;
      }

      .tp-logo svg {
        display: block;
        flex-shrink: 0;
        filter: drop-shadow(0 6px 14px rgba(168, 216, 234, 0.5));
      }

      .tp-logo__word {
        font-family: var(--tp-font-heading);
        font-weight: 700;
        font-size: 18px;
        letter-spacing: -0.01em;
        color: var(--tp-text);
      }

      .tp-logo--light .tp-logo__word {
        color: var(--tp-ink-text);
      }
    `,
  ],
})
export class TpLogoComponent {
  @Input() size = 32;
  @Input() wordmark = false;
  @Input() tone: 'dark' | 'light' = 'dark';

  protected readonly gradientId = `tp-logo-grad-${nextLogoId++}`;
}

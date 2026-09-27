import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionInfo } from '@ticketportal-mono/models';
import { AuthService } from '../../core/services/auth.service';

/**
 * Piece 5 root screen — a thin sub-nav (same visual language as
 * shared/ui/tabs, built with real routerLinks instead of tp-tabs' index
 * switch so each screen is a real, bookmarkable/back-button-friendly URL)
 * plus a <router-outlet> for the eight screens below it. Mounted once at
 * /counter — see counter.routes.ts for the child route list.
 *
 * Chunk 6 task 6 — shows which operator and counter(s) this session is
 * actually scoped to, straight from GET 'account/me' (already fetched once
 * and cached by AuthService.ensureCapabilities() — role.guard.ts triggers
 * the same call before this shell ever renders, so this is normally a
 * no-op re-read of the cached signal, not a second request). A CounterStaff
 * member juggling more than one desk needs to see which counter(s) they're
 * actually allowed to sell from before they start a walk-in sale, not
 * discover it from a 403 partway through.
 */
@Component({
  selector: 'tp-counter-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="tp-page">
      <header class="tp-counter-header">
        <h1>Counter &amp; Agent Operations</h1>
        <p class="tp-muted">Walk-in sales, agent roster, cancellations/refunds, staff HR, complaints, and boarding check-in.</p>
        @if (session(); as s) {
          <p class="tp-counter-context">
            {{ s.busOperatorName || 'Platform-wide' }}
            @if (s.assignedCounters.length > 0) {
              — {{ counterNames(s) }}
            }
          </p>
        }
      </header>

      <nav class="tp-tabs" role="tablist">
        <a class="tp-tab" routerLink="dashboard" routerLinkActive="tp-tab--active">Dashboard</a>
        <a class="tp-tab" routerLink="walk-in" routerLinkActive="tp-tab--active">Walk-in Booking</a>
        <a class="tp-tab" routerLink="setup" routerLinkActive="tp-tab--active">Counter Setup</a>
        <a class="tp-tab" routerLink="agents" routerLinkActive="tp-tab--active">Agents</a>
        <a class="tp-tab" routerLink="cancellations" routerLinkActive="tp-tab--active">Cancellations &amp; Refunds</a>
        <a class="tp-tab" routerLink="staff" routerLinkActive="tp-tab--active">Staff HR</a>
        <a class="tp-tab" routerLink="complaints" routerLinkActive="tp-tab--active">Complaints</a>
        <a class="tp-tab" routerLink="boarding" routerLinkActive="tp-tab--active">Boarding</a>
      </nav>

      <router-outlet />
    </div>
  `,
  styles: [
    `
      .tp-counter-header {
        margin-bottom: var(--tp-space-5);
      }

      .tp-counter-header p {
        margin: 0;
      }

      .tp-counter-context {
        margin-top: var(--tp-space-1) !important;
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      /* Re-uses the same .tp-tabs/.tp-tab visual language as
         shared/ui/tabs/tp-tabs.component.ts, but with real routerLinks —
         tp-tabs itself only supports index-based switching, not routes. */
      .tp-tabs {
        display: flex;
        gap: var(--tp-space-2);
        border-bottom: 1px solid var(--tp-border);
        margin-bottom: var(--tp-space-5);
        flex-wrap: wrap;
      }

      .tp-tab {
        display: inline-block;
        padding: var(--tp-space-3) var(--tp-space-2);
        font-family: var(--tp-font-body);
        font-weight: 600;
        font-size: 14px;
        color: var(--tp-text-muted);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: color var(--tp-transition-fast), border-color var(--tp-transition-fast);
      }

      .tp-tab:hover {
        color: var(--tp-text);
      }

      .tp-tab--active {
        color: var(--tp-text);
        border-bottom-color: var(--tp-yellow-dark);
      }
    `,
  ],
})
export class CounterShellComponent {
  private readonly auth = inject(AuthService);

  protected readonly session = signal<SessionInfo | null>(null);

  constructor() {
    // roleGuard already resolved this before this shell was allowed to
    // render, so ensureCapabilities() here just reads the cached signal —
    // no extra network round trip in the normal case.
    this.auth.ensureCapabilities().subscribe({
      next: (s) => this.session.set(s),
      error: () => this.session.set(null),
    });
  }

  protected counterNames(s: SessionInfo): string {
    return s.assignedCounters.map((c) => c.counterName).join(', ');
  }
}

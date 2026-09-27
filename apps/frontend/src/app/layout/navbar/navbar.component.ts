import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { TpButtonDirective } from '../../shared/ui/button/tp-button.directive';
import { TpLogoComponent } from '../../shared/ui/logo/tp-logo.component';

/**
 * Shows different nav links depending on the logged-in user's role. Add a
 * link here when your feature module ships its top-level landing page —
 * don't scatter portal-switcher links inside individual feature components.
 */
@Component({
  selector: 'tp-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TpButtonDirective, TpLogoComponent, MatMenuModule, MatIconModule],
  template: `
    <header class="tp-navbar tp-glass">
      <div class="tp-navbar__inner">
        <a routerLink="/search" class="tp-navbar__brand">
          <tp-logo [size]="34" />
        </a>

        <nav class="tp-navbar__links">
          @if (!auth.isAuthenticated() || auth.hasRole('Customer')) {
            <a routerLink="/search" routerLinkActive="tp-navbar__link--active">Search Trips</a>
          }
          <a routerLink="/buses" routerLinkActive="tp-navbar__link--active">Browse Buses</a>
          <a routerLink="/search/verify-ticket" routerLinkActive="tp-navbar__link--active">Verify Ticket</a>
          @if (auth.hasRole('Customer')) {
            <a routerLink="/my-bookings" routerLinkActive="tp-navbar__link--active">My Bookings</a>
          }
          @if (auth.hasRole('Operator', 'Staff', 'Admin')) {
            <a routerLink="/operator" routerLinkActive="tp-navbar__link--active">Operator Panel</a>
          }
          @if (auth.hasRole('Staff')) {
            <a routerLink="/counter" routerLinkActive="tp-navbar__link--active">Counter Desk</a>
            <a routerLink="/finance" routerLinkActive="tp-navbar__link--active">Finance</a>
          }
          @if (auth.hasRole('Admin')) {
            <a routerLink="/admin" routerLinkActive="tp-navbar__link--active">Admin</a>
          }
        </nav>

        <div class="tp-navbar__actions">
          @if (auth.isAuthenticated()) {
            <button type="button" class="tp-navbar__account" [matMenuTriggerFor]="accountMenu">
              <span class="tp-navbar__avatar">{{ initial() }}</span>
              <span class="tp-navbar__username">{{ auth.currentUser()?.userName }}</span>
              <mat-icon class="tp-navbar__chevron">expand_more</mat-icon>
            </button>
            <mat-menu #accountMenu="matMenu" xPosition="before" class="tp-account-menu">
              @if (auth.hasRole('Customer')) {
                <a mat-menu-item routerLink="/my-bookings/profile">
                  <mat-icon>person</mat-icon>
                  <span>My Profile</span>
                </a>
              }
              <a mat-menu-item routerLink="/account/change-password">
                <mat-icon>lock</mat-icon>
                <span>Change Password</span>
              </a>
              <button mat-menu-item type="button" (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          } @else {
            <a routerLink="/auth/login"><button tpButton variant="secondary" size="sm">Log in</button></a>
            <a routerLink="/auth/register"><button tpButton variant="primary" size="sm">Sign up</button></a>
          }
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .tp-navbar {
        border-bottom: 1px solid var(--tp-border);
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .tp-navbar__inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--tp-space-3) var(--tp-space-5);
        display: flex;
        align-items: center;
        gap: var(--tp-space-6);
      }

      .tp-navbar__brand {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        transition: transform var(--tp-transition-fast);
      }

      .tp-navbar__brand:hover {
        transform: translateY(-1px);
      }

      .tp-navbar__links {
        display: flex;
        gap: var(--tp-space-5);
        flex: 1;
      }

      .tp-navbar__links a {
        position: relative;
        padding: var(--tp-space-1) 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--tp-text-muted);
        transition: color var(--tp-transition-fast);
      }

      .tp-navbar__links a::after {
        content: '';
        position: absolute;
        left: 0;
        right: 100%;
        bottom: -13px;
        height: 2px;
        border-radius: 2px;
        background: var(--tp-gradient-brand);
        transition: right var(--tp-transition);
      }

      .tp-navbar__links a:hover {
        color: var(--tp-text);
      }

      .tp-navbar__links a:hover::after {
        right: 0;
      }

      .tp-navbar__link--active {
        color: var(--tp-text) !important;
        font-weight: 600;
      }

      .tp-navbar__link--active::after {
        right: 0 !important;
      }

      .tp-navbar__actions {
        display: flex;
        align-items: center;
        gap: var(--tp-space-3);
      }

      .tp-navbar__account {
        display: flex;
        align-items: center;
        gap: var(--tp-space-2);
        border: 1px solid var(--tp-border);
        background: var(--tp-surface);
        border-radius: var(--tp-radius-pill);
        padding: 4px 10px 4px 4px;
        cursor: pointer;
        font: inherit;
        transition: box-shadow var(--tp-transition-fast), border-color var(--tp-transition-fast);
      }

      .tp-navbar__account:hover {
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 8px 20px -8px var(--tp-yellow);
      }

      .tp-navbar__avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--tp-gradient-brand);
        color: var(--tp-text-on-yellow);
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
      }

      .tp-navbar__username {
        font-size: 14px;
        font-weight: 600;
        color: var(--tp-text);
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tp-navbar__chevron {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--tp-text-muted);
      }

      @media (max-width: 720px) {
        .tp-navbar__links {
          display: none;
        }

        .tp-navbar__username {
          display: none;
        }
      }
    `,
  ],
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected initial(): string {
    const name = this.auth.currentUser()?.userName ?? '';
    return name.charAt(0).toUpperCase() || '•';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}

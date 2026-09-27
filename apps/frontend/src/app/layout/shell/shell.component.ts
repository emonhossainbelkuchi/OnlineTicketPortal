import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { TpToastContainerComponent } from '../../shared/ui/toast/tp-toast-container.component';
import { LoadingService } from '../../core/services/loading.service';

/**
 * The one place the navbar, footer, global toast container, and the
 * top-of-page loading bar are mounted. AppComponent just renders this —
 * feature routes render inside <router-outlet> and never need to think
 * about any of this scaffolding.
 */
@Component({
  selector: 'tp-shell',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, TpToastContainerComponent],
  template: `
    @if (loading.isLoading()) {
      <div class="tp-loading-bar"></div>
    }
    <div class="tp-ambient" aria-hidden="true"></div>
    <tp-navbar />
    <main>
      <router-outlet />
    </main>
    <tp-footer />
    <tp-toast-container />
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        position: relative;
      }

      main {
        min-height: calc(100vh - 200px);
        position: relative;
      }

      /* Soft, decorative gradient mesh sitting behind the whole app. Fixed +
         pointer-events:none so it never intercepts clicks or scrolls with
         content — purely ambient warmth behind the white surfaces. */
      .tp-ambient {
        position: fixed;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        background: var(--tp-gradient-mesh);
        background-color: var(--tp-bg);
      }

      .tp-loading-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--tp-gradient-brand);
        z-index: 3000;
        animation: tp-loading-sweep 1.1s ease-in-out infinite;
      }

      @keyframes tp-loading-sweep {
        0% {
          transform: translateX(-100%) scaleX(0.4);
        }
        50% {
          transform: translateX(20%) scaleX(0.6);
        }
        100% {
          transform: translateX(100%) scaleX(0.4);
        }
      }
    `,
  ],
})
export class ShellComponent {
  protected readonly loading = inject(LoadingService);
}

import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * Usage:
 *   <tp-modal [open]="showModal" title="Confirm cancellation" (closed)="showModal = false">
 *     <p>Are you sure?</p>
 *     <div modal-footer>
 *       <button tpButton variant="secondary" (click)="showModal = false">Back</button>
 *       <button tpButton variant="danger" (click)="confirm()">Cancel Booking</button>
 *     </div>
 *   </tp-modal>
 *
 * Closes on backdrop click and Escape. Doesn't manage its own open state on
 * purpose — the parent owns that, same pattern as everything else here.
 */
@Component({
  selector: 'tp-modal',
  standalone: true,
  template: `
    @if (open) {
      <!-- Backdrop is a convenience mouse/touch dismiss target only — full
           keyboard access is already provided by the Escape handler above
           and the visible close button below. role="presentation" tells
           assistive tech (and the linter) this div isn't itself an
           interactive control. -->
      <div class="tp-modal-backdrop" role="presentation" (click)="onBackdropClick($event)">
        <div class="tp-modal" role="dialog" aria-modal="true">
          <header class="tp-modal__header">
            <h3>{{ title }}</h3>
            <button type="button" class="tp-modal__close" aria-label="Close" (click)="close()">&times;</button>
          </header>
          <div class="tp-modal__body">
            <ng-content />
          </div>
          <footer class="tp-modal__footer">
            <ng-content select="[modal-footer]" />
          </footer>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .tp-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(43, 43, 43, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--tp-space-4);
        z-index: 1000;
      }

      .tp-modal {
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        background: var(--tp-surface);
        border-radius: var(--tp-radius-lg);
        box-shadow: var(--tp-shadow-elevated);
      }

      .tp-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--tp-space-5) var(--tp-space-5) 0;
      }

      .tp-modal__header h3 {
        margin: 0;
      }

      .tp-modal__close {
        border: none;
        background: transparent;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        color: var(--tp-text-muted);
        padding: var(--tp-space-1);
      }

      .tp-modal__close:hover {
        color: var(--tp-text);
      }

      .tp-modal__body {
        padding: var(--tp-space-4) var(--tp-space-5);
      }

      .tp-modal__footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--tp-space-3);
        padding: 0 var(--tp-space-5) var(--tp-space-5);
      }
    `,
  ],
})
export class TpModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}

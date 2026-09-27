import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Renders just the tab strip — YOU render the content per active index, so
 * this doesn't fight you with ContentChildren/structural-directive magic:
 *
 *   <tp-tabs [tabs]="['Upcoming', 'Past', 'Cancelled']" [(activeIndex)]="tabIndex" />
 *   @switch (tabIndex) {
 *     @case (0) { <app-upcoming-bookings /> }
 *     @case (1) { <app-past-bookings /> }
 *     @case (2) { <app-cancelled-bookings /> }
 *   }
 */
@Component({
  selector: 'tp-tabs',
  standalone: true,
  template: `
    <div class="tp-tabs" role="tablist">
      @for (tab of tabs; track tab; let i = $index) {
        <button
          type="button"
          role="tab"
          class="tp-tab"
          [class.tp-tab--active]="i === activeIndex"
          [attr.aria-selected]="i === activeIndex"
          (click)="select(i)"
        >
          {{ tab }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .tp-tabs {
        display: flex;
        gap: var(--tp-space-2);
        border-bottom: 1px solid var(--tp-border);
        margin-bottom: var(--tp-space-5);
      }

      .tp-tab {
        border: none;
        background: transparent;
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
export class TpTabsComponent {
  @Input() tabs: string[] = [];
  @Input() activeIndex = 0;
  @Output() activeIndexChange = new EventEmitter<number>();

  select(index: number): void {
    this.activeIndex = index;
    this.activeIndexChange.emit(index);
  }
}

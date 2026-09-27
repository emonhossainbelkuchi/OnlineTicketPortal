import { Component, Input } from '@angular/core';

/**
 * Base card surface. Styling comes from the SHARED global classes in
 * libs/shared/design-tokens/components.css (.tp-card / .tp-card--hoverable /
 * .tp-card--padded) — the same classes the React admin app's <Card> uses —
 * so don't add component-local styles here, edit the shared file instead.
 *
 * Usage:
 *   <tp-card>...</tp-card>
 *   <tp-card [hoverable]="true">...</tp-card>          // lifts on hover — use for clickable cards (trip results, etc.)
 *   <tp-card [padded]="false">...</tp-card>             // edge-to-edge content (e.g. you're adding your own table)
 */
@Component({
  selector: 'tp-card',
  standalone: true,
  template: `<ng-content />`,
  host: {
    class: 'tp-card',
    '[class.tp-card--hoverable]': 'hoverable',
    '[class.tp-card--padded]': 'padded',
  },
})
export class TpCardComponent {
  @Input() hoverable = false;
  @Input() padded = true;
}

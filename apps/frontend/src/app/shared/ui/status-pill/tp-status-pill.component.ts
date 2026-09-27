import { Component, computed, input } from '@angular/core';
import { PillTone, toneForStatus } from './status-tone';

/**
 * Auto-colored status badge. Styling comes from the SHARED global .tp-pill
 * classes in libs/shared/design-tokens/components.css — the same classes
 * the React admin app's <StatusPill> uses — don't add local styles here.
 *
 *   <tp-status-pill [status]="booking.status" />
 *   <tp-status-pill [status]="payment.status" />
 *
 * Override the tone explicitly only for a status this component doesn't
 * know about yet (better: add it to status-tone.ts instead so everyone
 * benefits):
 *   <tp-status-pill status="SomeNewStatus" tone="warning" />
 */
@Component({
  selector: 'tp-status-pill',
  standalone: true,
  template: `<span class="tp-pill" [class]="'tp-pill--' + resolvedTone()">{{ status() }}</span>`,
})
export class TpStatusPillComponent {
  readonly status = input.required<string>();
  readonly tone = input<PillTone | undefined>(undefined);

  protected readonly resolvedTone = computed(() => this.tone() ?? toneForStatus(this.status()));
}

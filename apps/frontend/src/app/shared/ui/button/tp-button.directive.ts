import { Directive, HostBinding, Input } from '@angular/core';
import { MatRipple } from '@angular/material/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Attribute directive, not a wrapper component — apply it straight to a
 * native <button>, so (click), [disabled], type="submit" inside a form,
 * etc. all keep working exactly like a normal button.
 *
 *   <button tpButton variant="primary" (click)="save()">Save</button>
 *   <button tpButton variant="secondary" size="sm">Cancel</button>
 *   <button tpButton variant="danger" [disabled]="isDeleting">Delete</button>
 *
 * `hostDirectives: [MatRipple]` composes Angular Material's ripple straight
 * onto the same host element — every existing tpButton usage across the app
 * picks up a real Material press ripple for free, with no template changes.
 * `.tp-btn` already sets `position: relative; overflow: hidden;`, which is
 * exactly what MatRipple needs to clip cleanly to the button's rounded
 * corners.
 */
@Directive({
  selector: 'button[tpButton]',
  standalone: true,
  hostDirectives: [MatRipple],
})
export class TpButtonDirective {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';

  @HostBinding('class') get hostClass(): string {
    return `tp-btn tp-btn--${this.variant} tp-btn--${this.size}`;
  }
}

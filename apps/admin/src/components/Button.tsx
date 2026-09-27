import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * Applies the SAME .tp-btn classes as Angular's TpButtonDirective (see
 * libs/shared/design-tokens/components.css) — this is what keeps the two
 * apps' buttons visually identical. Don't add a styled-components/CSS-in-JS
 * button elsewhere, use this.
 */
export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  const classes = ['tp-btn', `tp-btn--${variant}`, `tp-btn--${size}`, className].filter(Boolean).join(' ');
  return <button className={classes} {...rest} />;
}

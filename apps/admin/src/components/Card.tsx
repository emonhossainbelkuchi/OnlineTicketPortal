import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
}

/** Mirrors Angular's TpCardComponent — same shared .tp-card classes. */
export function Card({ hoverable = false, padded = true, className, ...rest }: CardProps) {
  const classes = ['tp-card', hoverable && 'tp-card--hoverable', padded && 'tp-card--padded', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes} {...rest} />;
}

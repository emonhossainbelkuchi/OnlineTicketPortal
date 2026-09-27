import { useId } from 'react';

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  tone?: 'dark' | 'light';
}

/**
 * The TicketPortal brand mark — mirrors Angular's TpLogoComponent
 * (apps/frontend/src/app/shared/ui/logo/) exactly: a real ticket shape
 * (rounded stub, two punched side-notches, a dashed tear-line) on the same
 * icy-blue-to-peach "prism" gradient the customer app uses.
 *
 * Colors are hardcoded rather than read from CSS variables on purpose: the
 * customer app's palette lives in apps/frontend/src/styles/theme-
 * overrides.css, which only that app loads — admin intentionally keeps its
 * own separate color scheme (see libs/shared/design-tokens), so this logo
 * matches the frontend's mark visually without pulling admin's overall
 * theme along with it.
 */
export function Logo({ size = 32, wordmark = false, tone = 'dark' }: LogoProps) {
  const gradientId = `tp-logo-grad-${useId()}`;

  return (
    <span className={`logo${tone === 'light' ? ' logo--light' : ''}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#A8D8EA" />
            <stop offset="0.5" stopColor="#D9C9F0" />
            <stop offset="1" stopColor="#FFD3B4" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
        <rect x="7" y="13" width="26" height="14" rx="3.2" stroke="#2D2A32" strokeWidth="2" fill="none" />
        <circle cx="7" cy="20" r="2.8" fill={`url(#${gradientId})`} />
        <circle cx="33" cy="20" r="2.8" fill={`url(#${gradientId})`} />
        <line x1="21.5" y1="15.2" x2="21.5" y2="24.8" stroke="#2D2A32" strokeWidth="2" strokeDasharray="2.2 2.4" strokeLinecap="round" />
      </svg>
      {wordmark && <span className="logo__word">TicketPortal</span>}
    </span>
  );
}

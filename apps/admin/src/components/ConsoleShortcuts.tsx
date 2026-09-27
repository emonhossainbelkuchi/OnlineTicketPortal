import { Card } from './Card';

export interface ConsoleShortcut {
  label: string;
  hint?: string;
  /** Console resource key (see console/config/resources.generated.ts), e.g. "AuditLogs". */
  resource?: string;
  /** Or an explicit console path, e.g. "/admin" for the dashboard. */
  href?: string;
}

/**
 * Landing page for an admin section whose real screens live in the management console
 * (src/console). Plain <a> tags on purpose: the console is a separate HTML document with its
 * own Bootstrap/Tailwind stylesheet, so entering it must be a full page load rather than a
 * client-side <Link> navigation (which would leak its CSS into these pages).
 */
export function ConsoleShortcuts({
  title,
  message,
  links,
}: {
  title: string;
  message: string;
  links: ConsoleShortcut[];
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p className="tp-muted">{message}</p>
        </div>
      </div>
      <div className="console-shortcuts">
        {links.map((link) => (
          <a
            key={link.resource ?? link.href}
            className="console-shortcuts__item"
            href={link.href ?? `/admin/resource/${link.resource}`}
          >
            <Card>
              <strong>{link.label}</strong>
              {link.hint && <span className="tp-muted">{link.hint}</span>}
            </Card>
          </a>
        ))}
      </div>
    </>
  );
}

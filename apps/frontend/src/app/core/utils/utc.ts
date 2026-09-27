/**
 * The API stores every "...Utc" timestamp as UTC, but SQL Server hands the value back to EF
 * Core with an *unspecified* DateTime kind, and System.Text.Json then serializes it WITHOUT a
 * trailing "Z" or offset ("2026-09-22T02:00:00"). JavaScript reads a timezone-less ISO string
 * as LOCAL time, so in Dhaka (UTC+6) every departure/arrival/created time on screen showed the
 * UTC clock digits - six hours early - and every booking-time comparison drifted the same way.
 *
 * markUtc() runs once, on every API response (see utc-dates.interceptor.ts): any string under
 * a key that ends in "Utc" and looks like a timezone-less ISO timestamp gets the missing "Z".
 * After that, `new Date(x)`, the `date` pipe and `toLocaleString()` all convert to the viewer's
 * timezone correctly with no per-screen work.
 */
const NAIVE_ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function withUtcMarker(value: string): string {
  return NAIVE_ISO_TIMESTAMP.test(value) ? `${value}Z` : value;
}

export function markUtc<T>(body: T): T {
  return walk(body, false) as T;
}

function walk(node: unknown, parentKeyIsUtc: boolean): unknown {
  if (typeof node === 'string') {
    return parentKeyIsUtc ? withUtcMarker(node) : node;
  }
  if (Array.isArray(node)) {
    // Array elements inherit the key of the array itself (e.g. "someUtc": ["...", "..."]).
    return node.map((item) => walk(item, parentKeyIsUtc));
  }
  if (node !== null && typeof node === 'object' && Object.getPrototypeOf(node) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      out[key] = walk(val, key.endsWith('Utc'));
    }
    return out;
  }
  return node;
}

/** Parses a "...Utc" API string as UTC even if it was not passed through markUtc() (returns null for empty). */
export function parseUtc(value: string | null | undefined): Date | null {
  return value ? new Date(withUtcMarker(value)) : null;
}

/**
 * Formats an API UTC timestamp for an <input type="datetime-local">, which shows and edits
 * LOCAL wall-clock time ("YYYY-MM-DDTHH:mm"). Slicing the raw UTC string into such an input
 * (the old edit-trip form did) displays the UTC digits as if they were local, and saving it
 * back through new Date(local).toISOString() then moves the trip by the UTC offset on every edit.
 */
export function toDateTimeLocalValue(value: string | null | undefined): string {
  const date = parseUtc(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The viewer's LOCAL calendar date ("YYYY-MM-DD") of an API UTC timestamp - what a date filter means to them. */
export function toLocalDateValue(value: string | null | undefined): string {
  const local = toDateTimeLocalValue(value);
  return local ? local.slice(0, 10) : '';
}

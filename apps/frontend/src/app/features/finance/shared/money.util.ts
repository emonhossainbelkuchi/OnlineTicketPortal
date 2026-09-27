/**
 * <tp-table> renders `row[col.key]` as plain interpolated text (see its doc
 * comment) — it doesn't know about currency formatting, so every Piece 6
 * table pre-formats amounts into its view-model rows using this instead of
 * relying on Angular's built-in CurrencyPipe (which assumes a fixed
 * locale/currency; this app's currency is per-row/per-operator data, not a
 * fixed setting).
 */
export function formatMoney(amount: number | null | undefined, currency = 'BDT'): string {
  if (amount === null || amount === undefined) return '—';
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  // DateOnly values come across as "yyyy-MM-dd"; DateTime values as full ISO
  // — both parse fine here, we only ever want the date part displayed.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

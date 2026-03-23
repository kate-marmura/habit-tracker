/**
 * Returns today's date as YYYY-MM-DD in the given IANA timezone.
 * Uses `en-CA` locale which natively produces ISO-like date format.
 * Must stay consistent with the client's `X-Timezone` header behavior in `api.ts`.
 */
export function getTodayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * True when `dateStr` is `YYYY-MM-DD` and matches a real calendar day in UTC
 * (e.g. rejects 2026-02-30, 2026-13-01).
 */
export function isValidCalendarDateString(dateStr: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * Parses a YYYY-MM-DD string into a Date using UTC components,
 * avoiding timezone-induced off-by-one errors when stored as a Postgres DATE.
 */
export function parseCalendarDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formats a Date (expected UTC midnight from a Postgres DATE) back to YYYY-MM-DD.
 */
export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

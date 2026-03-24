import { format, isValid, parse } from 'date-fns';

/** Display API date strings (YYYY-MM-DD) as e.g. "24 March 2026". */
export function formatDate(dateStr: string): string {
  const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (!isValid(parsed)) return dateStr;
  return format(parsed, 'd MMMM yyyy');
}

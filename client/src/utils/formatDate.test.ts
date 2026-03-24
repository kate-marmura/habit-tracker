import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats YYYY-MM-DD to d MMMM yyyy', () => {
    expect(formatDate('2026-03-24')).toBe('24 March 2026');
    expect(formatDate('2026-01-05')).toBe('5 January 2026');
  });

  it('returns original string when parse fails', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

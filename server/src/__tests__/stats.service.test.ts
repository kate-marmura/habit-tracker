import { describe, it, expect } from '@jest/globals';
import {
  addCalendarDays,
  countInclusiveDaysFromStartToToday,
  computeCompletionRate,
  computeLongestStreak,
  computeCurrentStreak,
} from '../services/stats.service.js';

describe('addCalendarDays', () => {
  it('moves backward and forward across month boundary', () => {
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addCalendarDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('countInclusiveDaysFromStartToToday', () => {
  it('returns 0 when today is before start', () => {
    expect(countInclusiveDaysFromStartToToday('2026-03-10', '2026-03-09')).toBe(0);
  });

  it('returns 1 when start equals today', () => {
    expect(countInclusiveDaysFromStartToToday('2026-03-15', '2026-03-15')).toBe(1);
  });

  it('counts inclusive range', () => {
    expect(countInclusiveDaysFromStartToToday('2026-03-01', '2026-03-10')).toBe(10);
  });
});

describe('computeCompletionRate', () => {
  it('returns 0 when totalDays is 0', () => {
    expect(computeCompletionRate(5, 0)).toBe(0);
  });

  it('returns ratio when completed is within window', () => {
    expect(computeCompletionRate(4, 20)).toBe(0.2);
  });

  it('caps at 1 when completed exceeds window', () => {
    expect(computeCompletionRate(10, 5)).toBe(1);
  });
});

describe('computeLongestStreak', () => {
  it('returns 0 for empty list', () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it('returns 1 for single entry', () => {
    expect(computeLongestStreak(['2026-03-05'])).toBe(1);
  });

  it('returns full length when all consecutive', () => {
    expect(computeLongestStreak(['2026-03-01', '2026-03-02', '2026-03-03'])).toBe(3);
  });

  it('stops at gap and returns longest run', () => {
    expect(
      computeLongestStreak(['2026-03-01', '2026-03-02', '2026-03-05', '2026-03-06', '2026-03-07']),
    ).toBe(3);
  });

  it('picks max among multiple runs', () => {
    expect(
      computeLongestStreak([
        '2026-01-01',
        '2026-01-02',
        '2026-02-10',
        '2026-02-11',
        '2026-02-12',
        '2026-02-13',
      ]),
    ).toBe(4);
  });
});

describe('computeCurrentStreak', () => {
  const start = '2026-03-01';

  it('returns 0 when no entries on today or yesterday', () => {
    const set = new Set(['2026-03-01']);
    expect(computeCurrentStreak(set, '2026-03-10', start)).toBe(0);
  });

  it('starts from today when today is marked', () => {
    const set = new Set(['2026-03-09', '2026-03-10']);
    expect(computeCurrentStreak(set, '2026-03-10', start)).toBe(2);
  });

  it('starts from yesterday when today not marked but yesterday is', () => {
    const set = new Set(['2026-03-08', '2026-03-09']);
    expect(computeCurrentStreak(set, '2026-03-10', start)).toBe(2);
  });

  it('stops at gap', () => {
    const set = new Set(['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-05']);
    expect(computeCurrentStreak(set, '2026-03-09', start)).toBe(3);
  });

  it('habit created today with no marks → 0', () => {
    const set = new Set<string>();
    expect(computeCurrentStreak(set, '2026-06-01', '2026-06-01')).toBe(0);
  });

  it('all days from start through today marked → streak equals span', () => {
    const set = new Set(['2026-03-01', '2026-03-02', '2026-03-03']);
    expect(computeCurrentStreak(set, '2026-03-03', '2026-03-01')).toBe(3);
  });
});

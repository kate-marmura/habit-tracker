import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import {
  formatCalendarDate,
  getTodayInTimezone,
  parseCalendarDate,
} from '../lib/calendar-date.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Add signed whole days to a calendar YYYY-MM-DD string (UTC date math). */
export function addCalendarDays(dateStr: string, deltaDays: number): string {
  const d = parseCalendarDate(dateStr);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return formatCalendarDate(d);
}

/** Inclusive days from start through today; 0 if today is before start. */
export function countInclusiveDaysFromStartToToday(startDateStr: string, todayStr: string): number {
  if (todayStr < startDateStr) return 0;
  const start = parseCalendarDate(startDateStr);
  const end = parseCalendarDate(todayStr);
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

/** Completion ratio in [0, 1]; caps at 1 if entries exceed the start→today window (defensive). */
export function computeCompletionRate(completedDays: number, totalDays: number): number {
  if (totalDays <= 0) return 0;
  return Math.min(1, completedDays / totalDays);
}

export function computeLongestStreak(sortedAscYmd: string[]): number {
  if (sortedAscYmd.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedAscYmd.length; i++) {
    if (sortedAscYmd[i] === addCalendarDays(sortedAscYmd[i - 1], 1)) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function computeCurrentStreak(
  entrySet: Set<string>,
  todayStr: string,
  startDateStr: string,
): number {
  let cursor: string;
  if (entrySet.has(todayStr)) {
    cursor = todayStr;
  } else {
    const yesterday = addCalendarDays(todayStr, -1);
    if (entrySet.has(yesterday)) {
      cursor = yesterday;
    } else {
      return 0;
    }
  }

  let streak = 0;
  while (entrySet.has(cursor) && cursor >= startDateStr) {
    streak++;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalDays: number;
  completedDays: number;
}

export async function getHabitStats(
  userId: string,
  habitId: string,
  timezone: string,
): Promise<HabitStats> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { startDate: true },
  });

  if (!habit) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  const rows = await prisma.dayEntry.findMany({
    where: { habitId },
    select: { entryDate: true },
    orderBy: { entryDate: 'asc' },
  });

  const sortedYmd = rows.map((r) => formatCalendarDate(r.entryDate));
  const entrySet = new Set(sortedYmd);

  const startDateStr = formatCalendarDate(habit.startDate);
  const todayStr = getTodayInTimezone(timezone);

  const totalDays = countInclusiveDaysFromStartToToday(startDateStr, todayStr);
  const completedDays = sortedYmd.length;
  const completionRate = computeCompletionRate(completedDays, totalDays);

  return {
    currentStreak: computeCurrentStreak(entrySet, todayStr, startDateStr),
    longestStreak: computeLongestStreak(sortedYmd),
    completionRate,
    totalDays,
    completedDays,
  };
}

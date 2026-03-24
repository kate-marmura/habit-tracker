import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import {
  formatCalendarDate,
  parseCalendarDate,
  getTodayInTimezone,
} from '../lib/calendar-date.js';

export async function listEntriesByMonth(userId: string, habitId: string, month: string) {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });

  if (!habit) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year, mon - 1, 1));
  const lastDay = new Date(Date.UTC(year, mon, 0));

  const entries = await prisma.dayEntry.findMany({
    where: {
      habitId,
      entryDate: { gte: firstDay, lte: lastDay },
    },
    select: { id: true, entryDate: true },
    orderBy: { entryDate: 'asc' },
  });

  return entries.map((e) => ({
    id: e.id,
    entryDate: formatCalendarDate(e.entryDate),
  }));
}

export async function createEntry(userId: string, habitId: string, date: string, timezone: string) {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true, startDate: true },
  });

  if (!habit) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  const startDateStr = formatCalendarDate(habit.startDate);
  if (date < startDateStr) {
    throw new AppError(422, 'INVALID_DATE', 'Date is before habit start date');
  }

  const today = getTodayInTimezone(timezone);
  if (date > today) {
    throw new AppError(422, 'INVALID_DATE', 'Cannot mark future dates');
  }

  try {
    const entry = await prisma.dayEntry.create({
      data: { habitId, entryDate: parseCalendarDate(date) },
      select: { id: true, entryDate: true },
    });

    return { id: entry.id, entryDate: formatCalendarDate(entry.entryDate) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'ALREADY_MARKED', 'This day is already marked');
    }
    throw err;
  }
}

export async function deleteEntry(userId: string, habitId: string, date: string) {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });

  if (!habit) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  await prisma.dayEntry.deleteMany({
    where: { habitId, entryDate: parseCalendarDate(date) },
  });
}

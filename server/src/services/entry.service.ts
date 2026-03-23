import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { formatCalendarDate } from '../lib/calendar-date.js';

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

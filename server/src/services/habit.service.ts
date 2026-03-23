import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { getTodayInTimezone, parseCalendarDate, formatCalendarDate } from '../lib/calendar-date.js';

const MAX_ACTIVE_HABITS = 10;

interface CreateHabitInput {
  name: string;
  description?: string | null;
  startDate: string;
}

export async function createHabit(userId: string, input: CreateHabitInput, timezone: string) {
  const today = getTodayInTimezone(timezone);
  if (input.startDate > today) {
    throw new AppError(422, 'INVALID_START_DATE', 'Start date cannot be in the future');
  }

  const activeCount = await prisma.habit.count({
    where: { userId, isArchived: false },
  });

  if (activeCount >= MAX_ACTIVE_HABITS) {
    throw new AppError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.');
  }

  const description = input.description?.trim() || null;

  const habit = await prisma.habit.create({
    data: {
      userId,
      name: input.name,
      description,
      startDate: parseCalendarDate(input.startDate),
    },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...habit,
    startDate: formatCalendarDate(habit.startDate),
  };
}

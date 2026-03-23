import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { getTodayInTimezone, parseCalendarDate, formatCalendarDate } from '../lib/calendar-date.js';

const MAX_ACTIVE_HABITS = 10;

interface CreateHabitInput {
  name: string;
  description?: string | null;
  startDate: string;
}

const habitSelectFields = {
  id: true,
  name: true,
  description: true,
  startDate: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
    select: habitSelectFields,
  });

  return {
    ...habit,
    startDate: formatCalendarDate(habit.startDate),
  };
}

export async function listActiveHabits(userId: string) {
  const habits = await prisma.habit.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    select: habitSelectFields,
  });

  return habits.map((h) => ({ ...h, startDate: formatCalendarDate(h.startDate) }));
}

export async function listArchivedHabits(userId: string) {
  const habits = await prisma.habit.findMany({
    where: { userId, isArchived: true },
    orderBy: { createdAt: 'desc' },
    select: habitSelectFields,
  });

  return habits.map((h) => ({ ...h, startDate: formatCalendarDate(h.startDate) }));
}

export async function getHabitById(userId: string, habitId: string) {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: habitSelectFields,
  });

  if (!habit) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  return { ...habit, startDate: formatCalendarDate(habit.startDate) };
}

interface UpdateHabitInput {
  name: string;
  description?: string | null;
}

export async function updateHabit(userId: string, habitId: string, input: UpdateHabitInput) {
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  const description = input.description?.trim() || null;

  const habit = await prisma.habit.update({
    where: { id: habitId },
    data: { name: input.name, description },
    select: habitSelectFields,
  });

  return { ...habit, startDate: formatCalendarDate(habit.startDate) };
}

export async function unarchiveHabit(userId: string, habitId: string) {
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true, isArchived: true },
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  if (!existing.isArchived) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      select: habitSelectFields,
    });
    if (!habit) throw new AppError(404, 'NOT_FOUND', 'Habit not found');
    return { ...habit, startDate: formatCalendarDate(habit.startDate) };
  }

  const activeCount = await prisma.habit.count({
    where: { userId, isArchived: false },
  });

  if (activeCount >= MAX_ACTIVE_HABITS) {
    throw new AppError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.');
  }

  const habit = await prisma.habit.update({
    where: { id: habitId },
    data: { isArchived: false },
    select: habitSelectFields,
  });

  return { ...habit, startDate: formatCalendarDate(habit.startDate) };
}

export async function archiveHabit(userId: string, habitId: string) {
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true, isArchived: true },
  });

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }

  if (existing.isArchived) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      select: habitSelectFields,
    });
    if (!habit) throw new AppError(404, 'NOT_FOUND', 'Habit not found');
    return { ...habit, startDate: formatCalendarDate(habit.startDate) };
  }

  const habit = await prisma.habit.update({
    where: { id: habitId },
    data: { isArchived: true },
    select: habitSelectFields,
  });

  return { ...habit, startDate: formatCalendarDate(habit.startDate) };
}

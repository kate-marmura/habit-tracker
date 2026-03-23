import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { createHabit, listActiveHabits, listArchivedHabits } from '../services/habit.service.js';
import { isValidCalendarDateString } from '../lib/calendar-date.js';

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters').optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD')
    .refine(isValidCalendarDateString, 'Start date is not a valid calendar date'),
});

const router = Router();

router.use(authenticate);

router.get('/archived', async (_req, res) => {
  const habits = await listArchivedHabits(res.locals.userId);
  res.json(habits);
});

router.get('/', async (_req, res) => {
  const habits = await listActiveHabits(res.locals.userId);
  res.json(habits);
});

router.post('/', async (req, res) => {
  const input = createHabitSchema.parse(req.body);
  const habit = await createHabit(res.locals.userId, input, res.locals.timezone);
  res.status(201).json(habit);
});

export default router;

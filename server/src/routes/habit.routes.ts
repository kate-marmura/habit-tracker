import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createHabit,
  listActiveHabits,
  listArchivedHabits,
  getHabitById,
  updateHabit,
  archiveHabit,
  unarchiveHabit,
  deleteHabit,
} from '../services/habit.service.js';
import { isValidCalendarDateString } from '../lib/calendar-date.js';

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters').optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD')
    .refine(isValidCalendarDateString, 'Start date is not a valid calendar date'),
});

export const updateHabitBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters').optional(),
});

const habitIdParam = z.string().uuid('Invalid habit ID');

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

router.get('/:id', async (req, res) => {
  const id = habitIdParam.parse(req.params.id);
  const habit = await getHabitById(res.locals.userId, id);
  res.json(habit);
});

router.put('/:id', async (req, res) => {
  const id = habitIdParam.parse(req.params.id);
  const input = updateHabitBodySchema.parse(req.body);
  const habit = await updateHabit(res.locals.userId, id, input);
  res.json(habit);
});

router.patch('/:id/archive', async (req, res) => {
  const id = habitIdParam.parse(req.params.id);
  const habit = await archiveHabit(res.locals.userId, id);
  res.json(habit);
});

router.patch('/:id/unarchive', async (req, res) => {
  const id = habitIdParam.parse(req.params.id);
  const habit = await unarchiveHabit(res.locals.userId, id);
  res.json(habit);
});

router.delete('/:id', async (req, res) => {
  const id = habitIdParam.parse(req.params.id);
  const result = await deleteHabit(res.locals.userId, id);
  res.json(result);
});

export default router;

import { Router, type Request } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { listEntriesByMonth, createEntry } from '../services/entry.service.js';
import { isValidCalendarDateString } from '../lib/calendar-date.js';

const habitIdParam = z.string().uuid('Invalid habit ID');

const monthQuery = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format')
  .refine((val) => {
    const m = Number(val.split('-')[1]);
    return m >= 1 && m <= 12;
  }, 'Month must be between 01 and 12');

const router = Router({ mergeParams: true });

router.use(authenticate);

const createEntryBody = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .refine(isValidCalendarDateString, 'Date is not a valid calendar date'),
});

router.get('/', async (req: Request<{ id: string }>, res) => {
  const id = habitIdParam.parse(req.params.id);
  const month = monthQuery.parse(req.query.month);
  const entries = await listEntriesByMonth(res.locals.userId, id, month);
  res.json(entries);
});

router.post('/', async (req: Request<{ id: string }>, res) => {
  const id = habitIdParam.parse(req.params.id);
  const { date } = createEntryBody.parse(req.body);
  const entry = await createEntry(res.locals.userId, id, date, res.locals.timezone);
  res.status(201).json(entry);
});

export default router;

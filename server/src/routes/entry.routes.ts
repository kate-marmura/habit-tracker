import { Router, type Request } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { listEntriesByMonth } from '../services/entry.service.js';

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

router.get('/', async (req: Request<{ id: string }>, res) => {
  const id = habitIdParam.parse(req.params.id);
  const month = monthQuery.parse(req.query.month);
  const entries = await listEntriesByMonth(res.locals.userId, id, month);
  res.json(entries);
});

export default router;

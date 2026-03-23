import { Router } from 'express';
import authRoutes from './auth.routes.js';
import entryRoutes from './entry.routes.js';
import habitRoutes from './habit.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/habits/:id/entries', entryRoutes);
router.use('/habits', habitRoutes);

export default router;

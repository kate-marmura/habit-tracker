import { Router } from 'express';
import { z } from 'zod';
import { commonPasswords } from '../data/common-passwords.js';
import { register, login, changePassword, requestPasswordReset } from '../services/auth.service.js';
import { registerLimiter, loginLimiter, forgotPasswordLimiter } from '../middleware/rate-limit.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .refine((val) => !commonPasswords.has(val.toLowerCase()), {
    message: 'This password is too common. Please choose a stronger password.',
  });

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format').max(255),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format').max(255),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

const router = Router();

router.post('/register', registerLimiter, async (req, res) => {
  const { email, password } = registerSchema.parse(req.body);
  const result = await register(email, password);
  res.status(201).json(result);
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await login(email, password);
  res.status(200).json(result);
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const result = await requestPasswordReset(email);
  res.status(200).json(result);
});

router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const result = await changePassword(res.locals.userId, currentPassword, newPassword);
  res.status(200).json(result);
});

export default router;

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/** Test-only: isolate rate-limit bucket + force prod-like limit (see auth.reset-password.test.ts). */
export const RESET_PASSWORD_RATE_TEST_SLOT_HEADER = 'x-test-rate-limit-slot';

function setRetryAfterFromRateLimit(req: Request, res: Response): void {
  const info = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit;
  const reset = info?.resetTime;
  const seconds = reset
    ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000))
    : Math.ceil(15 * 60);
  res.setHeader('Retry-After', String(seconds));
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.',
      },
    });
  },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = (req.body as { email?: string })?.email;
    if (typeof email === 'string' && email.trim()) {
      return `forgot:${email.trim().toLowerCase()}`;
    }
    return `forgot:ip:${req.ip ?? 'unknown'}`;
  },
  validate: { keyGeneratorIpFallback: false },
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: "You've requested too many password reset emails. Please try again later.",
      },
    });
  },
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req: Request) => {
    if (process.env.NODE_ENV !== 'test') return 5;
    if (req.get(RESET_PASSWORD_RATE_TEST_SLOT_HEADER) === 'rate-429') return 5;
    return 1000;
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    if (process.env.NODE_ENV === 'test') {
      const slot = req.get(RESET_PASSWORD_RATE_TEST_SLOT_HEADER);
      if (typeof slot === 'string' && slot.trim()) {
        return `reset-pw:test:${slot.trim()}`;
      }
    }
    return `reset-pw:ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  handler: (req, res) => {
    setRetryAfterFromRateLimit(req, res);
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts. Please try again later.',
      },
    });
  },
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts. Please try again later.',
      },
    });
  },
});

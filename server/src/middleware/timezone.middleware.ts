import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

declare module 'express' {
  interface Locals {
    timezone: string;
  }
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function timezoneMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.get('X-Timezone');

  if (!header) {
    if (config.NODE_ENV === 'development') {
      console.warn(`Missing X-Timezone header for ${req.method} ${req.path}, defaulting to UTC`);
    }
    res.locals.timezone = 'UTC';
    next();
    return;
  }

  res.locals.timezone = isValidTimezone(header) ? header : 'UTC';
  next();
}

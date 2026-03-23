import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

declare module 'express' {
  interface Locals {
    timezone: string;
  }
}

export function timezoneMiddleware(req: Request, res: Response, next: NextFunction): void {
  const timezone = req.get('X-Timezone') ?? 'UTC';

  if (!req.get('X-Timezone') && config.NODE_ENV === 'development') {
    console.warn(`Missing X-Timezone header for ${req.method} ${req.path}, defaulting to UTC`);
  }

  res.locals.timezone = timezone;
  next();
}

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from './error-handler.js';

declare module 'express' {
  interface Locals {
    userId: string;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    res.locals.userId = (payload as { sub: string }).sub;
    next();
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}

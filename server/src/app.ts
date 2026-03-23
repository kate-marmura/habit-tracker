import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { AppError, errorHandler } from './middleware/error-handler.js';
import { timezoneMiddleware } from './middleware/timezone.middleware.js';
import apiRouter from './routes/index.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);

app.use(express.json({ limit: '1mb' }));

if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(timezoneMiddleware);

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.json({ status: 'ok', db: 'disconnected' });
  }
});

app.use('/api', apiRouter);

app.use((_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found'));
});

app.use(errorHandler);

export default app;

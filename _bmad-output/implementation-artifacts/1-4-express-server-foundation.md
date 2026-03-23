# Story 1.4: Express Server Foundation

Status: done

## Story

As a developer,
I want the Express server configured with middleware, error handling, and health check,
so that API routes can be added incrementally.

## Acceptance Criteria

1. `app.ts` configures Express with JSON body parsing, CORS, and security headers
2. Environment config validated with zod (`config.ts`)
3. Global error handler middleware returns consistent error format: `{ error: { code, message } }`
4. `GET /api/health` returns 200 with `{ status: "ok", db: "connected" }` (includes database connectivity check)
5. Server starts on configurable port (default 3001)
6. Request logging configured for development

## Tasks / Subtasks

- [x] Task 1: Install new dependencies (AC: #1, #2, #6)
  - [x] `npm install helmet cors morgan zod`
  - [x] `npm install -D @types/cors @types/morgan`
  - [x] Do NOT install `@types/helmet` (helmet ships its own types)

- [x] Task 2: Create environment config with zod — `server/src/config.ts` (AC: #2, #5)
  - [x] Zod schema validates DATABASE_URL, PORT, NODE_ENV, JWT_SECRET, JWT_EXPIRY, CLIENT_URL
  - [x] Parse process.env through zod schema at import time
  - [x] Export typed config object
  - [x] If validation fails, logs clear error per field and exits process

- [x] Task 3: Create global error handler — `server/src/middleware/error-handler.ts` (AC: #3)
  - [x] AppError class with statusCode, code, message
  - [x] Handles AppError, Prisma P2002 (409), P2025 (404), ZodError (422), unknown (500)
  - [x] Returns consistent `{ error: { code, message } }` format
  - [x] Full stack in development, sanitized in production

- [x] Task 4: Create `server/src/app.ts` — Express app setup (AC: #1, #3, #4, #6)
  - [x] Middleware order: helmet → cors → express.json → morgan (dev only)
  - [x] Health check mounted, error handler mounted last
  - [x] App exported without listen()

- [x] Task 5: Refactor health endpoint to use Prisma (AC: #4)
  - [x] Health route in app.ts using prisma.$queryRaw
  - [x] Returns connected/disconnected with 200
  - [x] pg import removed from index.ts (kept in package.json for @prisma/adapter-pg)

- [x] Task 6: Refactor `server/src/index.ts` — server startup (AC: #5)
  - [x] Imports app and config, calls listen()
  - [x] Handles uncaughtException and unhandledRejection
  - [x] ~16 lines total

- [x] Task 7: Create timezone middleware stub — `server/src/middleware/timezone.middleware.ts`
  - [x] Extracts X-Timezone header, defaults to UTC
  - [x] Stores on res.locals.timezone, warns in development when missing
  - [x] Extends Express Locals type declaration

- [x] Task 8: Verify complete setup
  - [x] Server starts on port 3001
  - [x] Health check returns {"status":"ok","db":"connected"}
  - [x] Helmet security headers present (CSP, HSTS, X-Content-Type-Options, etc.)
  - [x] CORS preflight returns correct Access-Control-Allow-Origin and methods
  - [x] npm run build succeeds, npm run lint passes
  - [x] docker compose build server succeeds

## Dev Notes

### Critical Architecture Constraints

- **app.ts vs index.ts separation**: `app.ts` configures the Express app (middleware, routes, error handler). `index.ts` only imports app and calls `listen()`. This separation enables testing the app without starting a server. [Source: Architecture §7]
- **Service layer pattern**: Routes are thin — parse/validate with zod, delegate to service functions. Services contain business logic and call Prisma. This is the pattern for ALL future routes. [Source: Architecture §7]
- **Error format**: Always `{ error: { code, message } }`. Never raw strings, never different shapes. [Source: Architecture §5]
- **Express 5 async handling**: Express 5.x natively catches rejected promises from async route handlers. Do NOT use `express-async-errors` or manual try/catch in routes for error forwarding. Just `throw` or let promises reject.

### Dependencies to Install

| Package | Purpose | Version Notes |
|---------|---------|---------------|
| `helmet` | Security headers (HSTS, CSP, X-Frame-Options, etc.) | Ships own types |
| `cors` | CORS middleware | Needs `@types/cors` |
| `morgan` | HTTP request logging | Needs `@types/morgan` |
| `zod` | Runtime validation for env config (and future request validation) | Already specified in Architecture §2 |

### Security Headers Configuration

Helmet's defaults cover most requirements from Architecture §9. Customize these:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind may need inline styles
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));
```

Headers per Architecture §9: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.

### CORS Configuration

```typescript
app.use(cors({
  origin: config.CLIENT_URL,    // http://localhost:5173 in dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
```

Do NOT use wildcard `*` origin. Use the `CLIENT_URL` env var. [Source: Architecture §9]

### Error Handler Pattern

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

Usage in future routes: `throw new AppError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.')` — Express 5 automatically forwards to error handler.

### Zod Config Pattern

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

### Health Endpoint Refactor

Current `index.ts` uses raw `pg.Client` for DB connectivity check. Replace with Prisma:

```typescript
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.json({ status: 'ok', db: 'disconnected' });
  }
});
```

**Important**: `pg` package is still needed as a dependency — it's used by `@prisma/adapter-pg` (the Prisma 7 PostgreSQL adapter from E1-S3). Do NOT remove `pg` from `package.json`. Just remove the direct `import pg from 'pg'` from `index.ts`.

### Existing Codebase State (from E1-S1 through E1-S3)

**Server files:**
- `server/src/index.ts` — Express app + health endpoint + raw pg check (WILL BE REFACTORED into app.ts + index.ts)
- `server/src/lib/prisma.ts` — Prisma client singleton using `@prisma/adapter-pg` + `PrismaPg`
- `server/src/generated/prisma/` — Generated Prisma client (Prisma 7.5.0)
- `server/prisma/schema.prisma` — 4 models: User, Habit, DayEntry, PasswordResetToken

**Package versions:**
- Express 5.2.1, pg 8.20.0, @prisma/client 7.5.0, @prisma/adapter-pg 7.5.0
- TypeScript 5.9.3, tsx 4.21.0
- ESM module (`"type": "module"`)
- tsconfig: strict, module NodeNext, outDir ./dist, rootDir ./src

**Docker:**
- `docker-compose.yml` with db, server, client, dev/test profiles
- Server Dockerfile includes Prisma generate step
- `.env` with DATABASE_URL, JWT_SECRET, PORT, CLIENT_URL

### Target File Structure After This Story

```
server/src/
├── index.ts                    # Server startup only (~15 lines)
├── app.ts                      # Express app config + middleware + routes
├── config.ts                   # Zod-validated environment config
├── middleware/
│   ├── error-handler.ts        # AppError class + global error handler
│   └── timezone.middleware.ts  # X-Timezone header extraction
├── lib/
│   └── prisma.ts               # Prisma client singleton (existing)
└── generated/prisma/           # Generated Prisma client (existing)
```

### What This Story Does NOT Include

- No auth middleware or JWT verification (E2)
- No rate limiting middleware (E2)
- No API routes for habits, entries, or stats (E2+, E3+, E4+, E5+)
- No service layer files (created per-feature in future stories)
- No CI pipeline (E1-S5)
- No test setup (E1-S6)

### References

- [Source: Architecture §5 — API Design (error response format `{ error: { code, message } }`)]
- [Source: Architecture §7 — Backend Architecture (project structure, app.ts, config.ts, middleware/, service layer pattern)]
- [Source: Architecture §9 — Security Architecture (security headers, CORS, HSTS, CSP)]
- [Source: Architecture §4 — Data Model (timezone strategy — X-Timezone header)]
- [Source: Epics — E1-S4 acceptance criteria]
- [Source: Previous Story 1-3 — Prisma singleton, generated client location, adapter-pg pattern]

## Dev Agent Record

### Agent Model Used

Claude (claude-4.6-opus)

### Debug Log References

- ESLint flagged `_next` param in error handler as unused — Express requires 4 params for error middleware. Added eslint-disable-next-line comment.

### Completion Notes List

- **Task 1:** Installed helmet, cors, morgan, zod (runtime) and @types/cors, @types/morgan (dev).
- **Task 2:** Created config.ts with zod schema — validates DATABASE_URL, PORT (coerce number, default 3001), NODE_ENV (enum, default development), JWT_SECRET (min 32 chars), JWT_EXPIRY (default 7d), CLIENT_URL (default localhost:5173). Uses safeParse + process.exit(1) on failure with per-field error messages.
- **Task 3:** Created error-handler.ts with AppError class and error handler middleware. Handles: AppError (custom status+code), Prisma P2002→409, P2025→404, ZodError→422, unknown→500. All return `{ error: { code, message } }`.
- **Task 4:** Created app.ts with middleware in correct order: helmet (with custom CSP), cors (CLIENT_URL origin, credentials), express.json (1mb limit), morgan (dev only). Health route mounted, error handler last. App exported without listen().
- **Task 5:** Health endpoint refactored to use `prisma.$queryRaw\`SELECT 1\`` instead of raw pg. Returns connected/disconnected. pg package kept as @prisma/adapter-pg dependency.
- **Task 6:** index.ts reduced to ~16 lines: imports app+config, calls listen(), handles uncaughtException and unhandledRejection.
- **Task 7:** Created timezone.middleware.ts extracting X-Timezone header, defaulting to UTC, storing on res.locals.timezone. Extends Express Locals interface.
- **Task 8:** All verifications passed: server starts, health endpoint works, helmet headers present, CORS preflight correct, build/lint/Docker all pass.

### File List

- `server/package.json` (modified) — Added helmet, cors, morgan, zod, @types/cors, @types/morgan
- `server/src/config.ts` (new) — Zod-validated environment configuration
- `server/src/app.ts` (new) — Express app with middleware, health route, error handler
- `server/src/index.ts` (modified) — Reduced to server startup only
- `server/src/middleware/error-handler.ts` (new) — AppError class + global error handler
- `server/src/middleware/timezone.middleware.ts` (new) — X-Timezone header extraction middleware

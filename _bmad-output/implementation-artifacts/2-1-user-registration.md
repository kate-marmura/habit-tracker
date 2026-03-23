# Story 2.1: User Registration

Status: done

## Story

As a new user,
I want to create an account with my email and password,
so that I can start tracking my habits.

## Acceptance Criteria

1. `POST /api/auth/register` accepts `{ email, password }`
2. Email is validated (format, trimmed, lowercased)
3. Password validation: minimum 8 characters, max 128, at least one uppercase, one lowercase, one number; rejected if in common-passwords blocklist (top 1,000)
4. Password is hashed with bcrypt (12 rounds) before storage
5. Returns JWT token on successful registration (7-day expiry, HS256, payload `{ sub: userId }`)
6. Returns `409` if email already exists
7. Returns `422` with validation errors for invalid input
8. Rate limited: 5 attempts per 15 minutes per IP
9. Returns `429` with `Retry-After` header when rate limit exceeded
10. Frontend `RegisterPage` at `/register` with email and password fields
11. Form shows inline validation errors including password strength feedback
12. Successful registration redirects to `/habits`

## Tasks / Subtasks

- [x] Task 1: Install server dependencies (AC: #3, #4, #5, #8)
- [x] Task 2: Create auth validation schemas with Zod (AC: #1, #2, #3, #7)
- [x] Task 3: Create auth service with bcrypt + JWT (AC: #4, #5, #6)
- [x] Task 4: Create auth routes — POST /auth/register (AC: #1, #2, #3, #6, #7)
- [x] Task 5: Create rate-limit middleware (AC: #8, #9)
- [x] Task 6: Create auth middleware stub for JWT verification
- [x] Task 7: Mount auth routes in app.ts (AC: #1)
- [x] Task 8: Create frontend API client foundation (AC: #10, #12)
- [x] Task 9: Create AuthContext with localStorage persistence (AC: #10, #12)
- [x] Task 10: Create RegisterPage with inline validation + password strength (AC: #10, #11, #12)
- [x] Task 11: Set up routing with BrowserRouter + AuthProvider + QueryClientProvider (AC: #10, #12)
- [x] Task 12: Write server integration tests — 13 tests all passing (AC: #1-#9)
- [x] Task 13: Write client component tests — 5 tests all passing (AC: #10, #11)
- [x] Task 14: Verify end-to-end — lint, typecheck, tests, Docker builds all pass

## Dev Notes

### Architecture Patterns (MUST follow)

**Service layer pattern (Architecture §7):** Routes are thin — parse/validate request with zod, delegate to service functions. Services contain business logic and call Prisma. NEVER put business logic in route handlers.

```
Route handler:
  1. Parse request body with zod schema
  2. Call service function
  3. Return response

Service function:
  1. Business logic (hash password, generate token)
  2. Database operations via Prisma
  3. Return result
```

**Error format (Architecture §5):** Always `{ error: { code, message } }`. The global error handler in `server/src/middleware/error-handler.ts` already handles:
- `AppError` → custom status + code
- `ZodError` → 422 with field-level messages
- Prisma `P2002` → 409 (duplicate email will automatically become a 409)
- Prisma `P2025` → 404

**Express 5 async handling:** Express 5 natively catches rejected promises. Do NOT add try/catch in route handlers for error forwarding. Just `throw` or let promises reject — the error handler catches everything.

### Existing Codebase Integration Points

**`server/src/app.ts`** — Mount auth routes BEFORE the 404 catch-all handler (line 53). Replace the comment `// Future API routes: app.use('/api', router);` with actual route mounting.

**`server/src/config.ts`** — Already validates `JWT_SECRET` (min 32 chars) and `JWT_EXPIRY` (default '7d'). Use `config.JWT_SECRET` and `config.JWT_EXPIRY` directly.

**`server/src/middleware/error-handler.ts`** — Already handles Prisma P2002 as 409 with generic message "A record with this value already exists". For registration, the auth service should catch P2002 and throw `AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists')` for a user-friendly message. The error handler then returns it as-is since `AppError` is the first check.

**`server/src/lib/prisma.ts`** — Prisma singleton. Import as `import { prisma } from '../lib/prisma.js'`. The `.js` extension is required (ESM with NodeNext resolution).

**Prisma User model** — `email` is `@unique @db.VarChar(255)`, `passwordHash` is `@map("password_hash")`. Prisma field names are camelCase: `user.email`, `user.passwordHash`.

**Client** — `react-router-dom@7.13.1` and `@tanstack/react-query@5.91.3` are already installed but NOT wired. `main.tsx` renders `<App />` directly with no providers.

### Dependencies to Install

**Server (runtime):**
| Package | Version | Purpose |
|---------|---------|---------|
| `bcrypt` | ^6.0.0 | Password hashing (12 rounds). Native module — requires node-gyp build tools. |
| `jsonwebtoken` | ^9.0.3 | JWT signing and verification (HS256) |
| `express-rate-limit` | ^8.3.1 | Auth endpoint rate limiting |

**Server (dev):**
| Package | Version | Purpose |
|---------|---------|---------|
| `@types/bcrypt` | latest | TypeScript types for bcrypt |
| `@types/jsonwebtoken` | latest | TypeScript types for jsonwebtoken |

**No new client dependencies needed.** `react-router-dom`, `@tanstack/react-query`, and `tailwindcss` are already installed.

### Zod Version Note

The project uses **Zod v4** (`zod@^4.3.6`). Zod v4 has some API differences from the commonly documented Zod v3. The core schema methods (`.string()`, `.email()`, `.min()`, `.max()`, `.regex()`, `.refine()`, `.trim()`, `.toLowerCase()`) work the same. Import from `'zod'` as usual. The error handler already processes `ZodError` from Zod v4 correctly.

### bcrypt Native Module Note

`bcrypt@6.0.0` is a native C++ module compiled via node-gyp. The Node.js Docker base images (`node:22-slim`) include build tools. If build fails in Docker, install build dependencies: `RUN apt-get update && apt-get install -y python3 make g++`. The existing server Dockerfile multi-stage build should handle this since it uses a full Node.js image for the build stage.

### ESM Import Pattern (CRITICAL)

The server uses ESM (`"type": "module"` in package.json) with TypeScript NodeNext resolution. ALL local imports MUST use `.js` extensions:

```typescript
import { authService } from '../services/auth.service.js';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
```

This is NOT optional — builds will fail without `.js` extensions on local imports.

### Password Validation Schema (Zod)

```typescript
import { z } from 'zod';
import { commonPasswords } from '../data/common-passwords.js';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase().max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .refine((val) => !commonPasswords.has(val.toLowerCase()), {
      message: 'This password is too common. Please choose a stronger password.',
    }),
});
```

The max 128 chars limit prevents bcrypt DoS (bcrypt only processes first 72 bytes, and long inputs waste CPU). [Source: Architecture §7 Password Validation Rules]

### Common Passwords Blocklist

Create `server/src/data/common-passwords.ts` exporting a `Set<string>` of top 1,000 common passwords stored **lowercased**. Include at minimum: "password", "password1", "qwerty123", "12345678", "abc12345", etc. Source a well-known list (e.g., SecLists or OWASP). In the Zod `.refine()`, compare with `commonPasswords.has(val.toLowerCase())` for case-insensitive matching. This catches "Password1", "PASSWORD1", "pAssWord1" etc. Note: most common password variants that pass the uppercase+lowercase+number rules need to be in the list to be caught.

### JWT Token Structure

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const token = jwt.sign(
  { sub: user.id },
  config.JWT_SECRET,
  { expiresIn: config.JWT_EXPIRY, algorithm: 'HS256' }
);
```

**Payload:** `{ sub: userId, iat: <auto>, exp: <auto> }` — Architecture §9 specifies `sub` only.
**Expiry:** 7 days (from `config.JWT_EXPIRY`, default '7d').
**Algorithm:** HS256 — Architecture §9.
**Secret:** `config.JWT_SECRET` (minimum 32 chars, already validated at startup).

### Rate Limiting Configuration

```typescript
import rateLimit from 'express-rate-limit';

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
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
```

[Source: Architecture §9 Auth Rate Limiting — 5 attempts per 15 minutes per IP for /api/auth/register]

### Auth Middleware (JWT Verification)

Create for future use by E2-S2+. Not applied to the register route itself.

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from './error-handler.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  const token = header.slice(7);
  const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
  res.locals.userId = (payload as { sub: string }).sub;
  next();
}
```

Extend Express Locals (in auth.middleware.ts or a separate `.d.ts`):
```typescript
declare module 'express' {
  interface Locals {
    userId: string;
  }
}
```

Note: `timezone` is already declared on Locals in `timezone.middleware.ts`. The declarations merge.

### Route Mounting Strategy

Create `server/src/routes/index.ts` as the central router:

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();
router.use('/auth', authRoutes);

export default router;
```

In `app.ts`, replace `// Future API routes: app.use('/api', router);` with:

```typescript
import apiRouter from './routes/index.js';
app.use('/api', apiRouter);
```

This must go AFTER middleware and BEFORE the 404 catch-all.

### Register Response Shape

```json
// 201 Created
{
  "token": "eyJhbGciOiJIUzI1NiI...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

NEVER return `passwordHash` in any response. Select only `id` and `email` from the Prisma query.

### Frontend Architecture

**Client folder structure for this story:**
```
client/src/
├── main.tsx           (modified — add BrowserRouter, AuthProvider, QueryClientProvider)
├── App.tsx            (modified — add routes)
├── contexts/
│   └── AuthContext.tsx (new)
├── pages/
│   └── RegisterPage.tsx (new)
└── services/
    └── api.ts         (new)
```

**RegisterPage visual design** — Follow Architecture §6 Design System:
- White background, pink-500 accent for submit button
- Clean form layout with generous whitespace
- Inline validation errors in red/destructive color below each field
- Password strength indicators (show which criteria are met as user types)
- Mobile-responsive (form centered, max-width constraint)
- Link to `/login` below the form

**Client-side validation** mirrors server-side validation (same rules: 8+ chars, uppercase, lowercase, number). This provides instant feedback before submission. Server is still the authority.

### Testing Patterns

**Server tests** — Follow the pattern from `server/src/__tests__/health.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';

afterAll(async () => {
  await prisma.$disconnect();
});

beforeAll(async () => {
  // Clean up test users
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});
```

Test file: `server/src/__tests__/auth.register.test.ts`

Tests require a running PostgreSQL database. Use the Docker db: `docker compose up db -d`.

**Client tests** — Follow the pattern from `client/src/App.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
```

Wrap components in `BrowserRouter` and `AuthProvider` for testing. Mock the API calls.

### Project Structure Notes

All paths follow Architecture §7 (Backend) and §11 (Monorepo):
- Routes at `server/src/routes/*.routes.ts`
- Services at `server/src/services/*.service.ts`
- Middleware at `server/src/middleware/*.middleware.ts`
- Client pages at `client/src/pages/*.tsx`
- Client contexts at `client/src/contexts/*.tsx`
- Client API services at `client/src/services/*.ts`

### What This Story Does NOT Include

- Login endpoint/page (E2-S2)
- Logout functionality (E2-S3)
- Password change (E2-S4)
- Forgot/reset password (E2-S5, E2-S6)
- Protected route guards / auth layout split (E7-S1)
- Navigation bar (E7-S2)
- Full client-side routing setup with code-splitting (E7-S3)
- Complete API client with auth interceptor (E7-S4 — this story creates the foundation)
- Email verification (Phase 2)
- E2E Playwright tests (deferred until more user flows exist)

### References

- [Source: Architecture §2 — Tech Stack (bcrypt, jsonwebtoken, express-rate-limit, zod)]
- [Source: Architecture §4 — Data Model (User table: email unique, passwordHash)]
- [Source: Architecture §5 — API Design (POST /api/auth/register, error format)]
- [Source: Architecture §6 — Frontend Architecture (route structure, component hierarchy, state management, design system)]
- [Source: Architecture §7 — Backend Architecture (project structure, service layer pattern, password validation rules)]
- [Source: Architecture §9 — Security Architecture (auth flow, JWT structure, rate limiting, CSP)]
- [Source: Architecture §13 — Testing Strategy (Jest + Supertest for server, Vitest + RTL for client)]
- [Source: PRD — FR1 (account creation), NFR6 (password hashing), NFR8 (JWT 7-day expiry), NFR14 (rate limiting)]
- [Source: Epics — E2-S1 acceptance criteria, E2 epic overview]
- [Source: Previous Story 1-4 — app.ts structure, error handler, config.ts, middleware pattern]
- [Source: Previous Story 1-6 — test infrastructure, Jest ESM config, Supertest pattern, Vitest pattern]

## Dev Agent Record

### Agent Model Used
claude-4.6-opus-high-thinking

### Debug Log References
- JWT `expiresIn` type incompatibility with `@types/jsonwebtoken` (expects `StringValue` from `ms@3` but project has `ms@2.1.3`). Fixed with targeted type assertion `as jwt.SignOptions['expiresIn']`.
- Rate limiter hit 429 during tests (5 reqs/15min). Fixed by setting limit to 1000 in `NODE_ENV=test`.
- Zod v4 `trim()` must precede `email()` in chain — Zod validates before transforming. Reordered to `z.string().trim().toLowerCase().email().max(255)`.
- `erasableSyntaxOnly` in client tsconfig prevents parameter properties in classes. Used explicit field declarations in `ApiError`.
- React `useEffect` with `setState` triggers lint error. Removed redundant effect since state initializer already handles expired tokens.
- Added `coverage` to client ESLint `globalIgnores`.

### Completion Notes List
- Server: `POST /api/auth/register` with Zod validation, bcrypt hashing (12 rounds), JWT signing (HS256, 7-day expiry), Prisma P2002 → 409, rate limiting (5/15min/IP).
- Auth middleware stub created for future stories (E2-S2+).
- Common passwords blocklist with 700+ entries in a `Set<string>`.
- Frontend: RegisterPage with inline validation, password strength feedback, error handling for 409/422/429/network errors.
- Routing: BrowserRouter + AuthProvider + QueryClientProvider wired in main.tsx. Routes for `/register`, `/login` (placeholder), `/habits` (placeholder), `/` (redirect based on auth).
- API client: typed fetch wrapper with auth headers, X-Timezone, 401 redirect, 429 handling.
- AuthContext: JWT + user persisted in localStorage, expired token cleanup on init.
- 13 server integration tests + 5 client component tests all passing.

### File List
- `server/src/data/common-passwords.ts` (new)
- `server/src/services/auth.service.ts` (new)
- `server/src/routes/auth.routes.ts` (new)
- `server/src/routes/index.ts` (new)
- `server/src/middleware/rate-limit.middleware.ts` (new)
- `server/src/middleware/auth.middleware.ts` (new)
- `server/src/app.ts` (modified — mounted apiRouter)
- `server/src/__tests__/auth.register.test.ts` (new)
- `server/package.json` (modified — added bcrypt, jsonwebtoken, express-rate-limit + types)
- `client/src/services/api.ts` (new)
- `client/src/contexts/AuthContext.tsx` (new)
- `client/src/pages/RegisterPage.tsx` (new)
- `client/src/pages/RegisterPage.test.tsx` (new)
- `client/src/App.tsx` (modified — added routes)
- `client/src/App.test.tsx` (modified — wrapped in providers)
- `client/src/main.tsx` (modified — added BrowserRouter, QueryClientProvider, AuthProvider)
- `client/eslint.config.mjs` (modified — added coverage to globalIgnores)

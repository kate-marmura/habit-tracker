# Story 1.3: Database Schema & Prisma Setup

Status: ready-for-dev

## Story

As a developer,
I want the Prisma ORM configured with the initial database schema,
so that I can run migrations and have type-safe database access.

## Acceptance Criteria

1. `prisma/schema.prisma` defines `users`, `habits`, `day_entries`, and `password_reset_tokens` tables per Architecture §4
2. UUID primary keys with `gen_random_uuid()` defaults
3. `day_entries` has unique constraint on `(habit_id, entry_date)`
4. `habits` has index on `(user_id, is_archived)`
5. `day_entries` has index on `(habit_id, entry_date)`
6. Cascade delete configured: users → habits → day_entries, users → password_reset_tokens
7. `prisma migrate dev` runs successfully and creates all tables
8. Prisma client singleton created at `server/src/lib/prisma.ts`

## Tasks / Subtasks

- [ ] Task 1: Install Prisma dependencies (AC: #7, #8)
  - [ ] Install Prisma CLI as dev dependency: `npm install -D prisma`
  - [ ] Install Prisma Client as runtime dependency: `npm install @prisma/client`
  - [ ] Add Prisma scripts to `server/package.json`:
    - `"db:migrate": "prisma migrate dev"`
    - `"db:migrate:deploy": "prisma migrate deploy"`
    - `"db:generate": "prisma generate"`
    - `"db:studio": "prisma studio"`
    - `"db:push": "prisma db push"`
    - `"db:seed": "prisma db seed"`

- [ ] Task 2: Initialize Prisma schema (AC: #1, #2)
  - [ ] Run `npx prisma init --datasource-provider postgresql` (creates `server/prisma/schema.prisma` and updates `.env`)
  - [ ] Verify `datasource db` uses `provider = "postgresql"` and `url = env("DATABASE_URL")`
  - [ ] Set `generator client` with `provider = "prisma-client-js"`
  - [ ] Verify DATABASE_URL in `.env` points to the Docker PostgreSQL: `postgresql://postgres:postgres@db:5432/habbit_tracker` (already configured from E1-S2)

- [ ] Task 3: Define `User` model (AC: #1, #2)
  - [ ] Model name: `User` (maps to `users` table via `@@map("users")`)
  - [ ] Fields:
    - `id` — `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
    - `email` — `String @unique @db.VarChar(255)`
    - `passwordHash` — `String @map("password_hash") @db.VarChar(255)`
    - `createdAt` — `DateTime @default(now()) @map("created_at") @db.Timestamptz`
    - `updatedAt` — `DateTime @updatedAt @map("updated_at") @db.Timestamptz`
  - [ ] Relations: `habits Habit[]`, `passwordResetTokens PasswordResetToken[]`

- [ ] Task 4: Define `Habit` model (AC: #1, #2, #4, #6)
  - [ ] Model name: `Habit` (maps to `habits` table via `@@map("habits")`)
  - [ ] Fields:
    - `id` — `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
    - `userId` — `String @map("user_id") @db.Uuid`
    - `name` — `String @db.VarChar(100)`
    - `description` — `String?`
    - `startDate` — `DateTime @map("start_date") @db.Date`
    - `isArchived` — `Boolean @default(false) @map("is_archived")`
    - `createdAt` — `DateTime @default(now()) @map("created_at") @db.Timestamptz`
    - `updatedAt` — `DateTime @updatedAt @map("updated_at") @db.Timestamptz`
  - [ ] Relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
  - [ ] Relation: `dayEntries DayEntry[]`
  - [ ] Index: `@@index([userId, isArchived])` (powers active/archived habit list queries)

- [ ] Task 5: Define `DayEntry` model (AC: #1, #2, #3, #5, #6)
  - [ ] Model name: `DayEntry` (maps to `day_entries` table via `@@map("day_entries")`)
  - [ ] Fields:
    - `id` — `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
    - `habitId` — `String @map("habit_id") @db.Uuid`
    - `entryDate` — `DateTime @map("entry_date") @db.Date`
    - `createdAt` — `DateTime @default(now()) @map("created_at") @db.Timestamptz`
  - [ ] Relation: `habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)`
  - [ ] Unique constraint: `@@unique([habitId, entryDate])` (one entry per day per habit)
  - [ ] Index: `@@index([habitId, entryDate])` (powers calendar month queries and streak calculations)

- [ ] Task 6: Define `PasswordResetToken` model (AC: #1, #2, #6)
  - [ ] Model name: `PasswordResetToken` (maps to `password_reset_tokens` table via `@@map("password_reset_tokens")`)
  - [ ] Fields:
    - `id` — `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
    - `userId` — `String @map("user_id") @db.Uuid`
    - `tokenHash` — `String @map("token_hash") @db.VarChar(255)`
    - `expiresAt` — `DateTime @map("expires_at") @db.Timestamptz`
    - `usedAt` — `DateTime? @map("used_at") @db.Timestamptz`
    - `createdAt` — `DateTime @default(now()) @map("created_at") @db.Timestamptz`
  - [ ] Relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`

- [ ] Task 7: Run initial migration (AC: #7)
  - [ ] Ensure PostgreSQL is running: `docker compose up db -d` (uses existing Docker Compose from E1-S2)
  - [ ] For local dev (outside container), use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/habbit_tracker` (note: `localhost` not `db`)
  - [ ] Run `npx prisma migrate dev --name init` to create and apply the initial migration
  - [ ] Verify all 4 tables created in PostgreSQL with correct columns, types, constraints, and indexes
  - [ ] Verify migration file exists at `server/prisma/migrations/<timestamp>_init/migration.sql`

- [ ] Task 8: Create Prisma client singleton (AC: #8)
  - [ ] Create `server/src/lib/prisma.ts`
  - [ ] Export a singleton `PrismaClient` instance
  - [ ] Use lazy instantiation pattern to avoid multiple clients in development:
    ```typescript
    import { PrismaClient } from '@prisma/client';
    
    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
    
    export const prisma = globalForPrisma.prisma ?? new PrismaClient();
    
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
    ```
  - [ ] Create `server/src/lib/` directory if it doesn't exist

- [ ] Task 9: Update server Dockerfile for Prisma (AC: #7)
  - [ ] Copy `prisma/` directory in build stage (BEFORE `npm run build`)
  - [ ] Add `RUN npx prisma generate` in the build stage (after copying prisma directory, generates the client)
  - [ ] In production stage, copy the generated Prisma client from build stage
  - [ ] Copy `prisma/` directory to production stage for `prisma migrate deploy` at startup
  - [ ] Update `.dockerignore`: REMOVE `prisma/migrations` exclusion (migrations must be in the Docker image)

- [ ] Task 10: Update Docker Compose dev profile for Prisma
  - [ ] Add volume mount `./server/prisma:/app/prisma` to `server-dev` service (so schema changes are reflected without rebuild)
  - [ ] Verify `server-dev` service can run `npx prisma migrate dev` inside the container

- [ ] Task 11: Verify complete setup
  - [ ] `npx prisma generate` succeeds and generates typed client
  - [ ] `npx prisma migrate dev` applies cleanly against Docker PostgreSQL
  - [ ] Prisma Studio opens: `npx prisma studio` (visual database browser)
  - [ ] TypeScript imports work: `import { prisma } from './lib/prisma.js'` compiles without errors
  - [ ] Server still builds: `npm run build` succeeds
  - [ ] Docker build still works: `docker compose build server` succeeds with Prisma generate step

## Dev Notes

### Critical Architecture Constraints

- **4 tables exactly**: `users`, `habits`, `day_entries`, `password_reset_tokens`. No additional tables. [Source: Architecture §4]
- **No streaks table**: Streaks are computed from `day_entries` at query time. Do NOT create a separate streaks table. [Source: Architecture §4 Design Decisions]
- **Presence-based entries**: A `day_entries` row existing = day done. No row = not done. No boolean column. [Source: Architecture §4 Design Decisions]
- **start_date is immutable**: Enforced at application level (E3-S1+), not database level. [Source: Architecture §4 Design Decisions]
- **Prisma client singleton**: At `server/src/lib/prisma.ts`, NOT in routes or services. [Source: Architecture §7]

### Prisma Schema Naming Conventions (CRITICAL)

Prisma uses camelCase for model fields in TypeScript but the database should use snake_case. Use `@map()` and `@@map()` to bridge:

- **Model names**: PascalCase in Prisma (`User`, `Habit`, `DayEntry`), snake_case in DB via `@@map("users")`, `@@map("day_entries")`
- **Field names**: camelCase in Prisma (`userId`, `startDate`, `passwordHash`), snake_case in DB via `@map("user_id")`, `@map("start_date")`
- **This is mandatory** — all API code uses camelCase (TypeScript), all DB columns use snake_case (PostgreSQL convention)

### UUID Generation Strategy

Use PostgreSQL's native `gen_random_uuid()` function, NOT Prisma's `uuid()`:

```prisma
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

**Why native over Prisma?** Database-generated UUIDs are created at insert time by PostgreSQL, not by the application. This is more reliable for concurrent inserts and consistent with the Architecture spec. PostgreSQL 16 includes `gen_random_uuid()` natively (no pgcrypto extension required).

### Date vs DateTime Fields

- `start_date` and `entry_date` use `@db.Date` (DATE type, no time component) — these are calendar dates
- `created_at`, `updated_at`, `expires_at`, `used_at` use `@db.Timestamptz` (TIMESTAMPTZ) — these are precise timestamps
- This distinction is critical for the timezone strategy (Architecture §4 Timezone Strategy)

### DATABASE_URL for Migrations

When running `prisma migrate dev` from your host machine (outside Docker), the DATABASE_URL must use `localhost:5432`, not `db:5432`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/habbit_tracker" npx prisma migrate dev --name init
```

The `.env` file has `db` as the host (for Docker-to-Docker networking). Override with the command above, or temporarily edit `.env` for local Prisma commands.

### Dockerfile Updates Required

The current `server/Dockerfile` (from E1-S2) does NOT include Prisma generate. It must be updated:

**Build stage changes:**
```dockerfile
FROM deps AS build
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
```

**Production stage changes:**
```dockerfile
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
```

The generated Prisma client lives in `node_modules/.prisma/client/` and must be copied to the production stage. The `prisma/` directory is needed for `prisma migrate deploy`.

**`.dockerignore` fix:** Remove `prisma/migrations` from `server/.dockerignore` — migrations MUST be included in the Docker image so `prisma migrate deploy` works in production.

### Docker Compose Dev Profile Update

The `server-dev` service needs an additional volume mount for the Prisma schema:

```yaml
volumes:
  - ./server/src:/app/src
  - ./server/prisma:/app/prisma    # ADD THIS
  - /app/node_modules
```

### Existing Codebase State (from E1-S1 + E1-S2)

**Server:**
- `server/src/index.ts` — Express app with health endpoint using raw `pg` client (do NOT change to Prisma — E1-S4 will refactor)
- `server/package.json` — Express 5.2.1, pg 8.20.0, TypeScript 5.9.3, tsx 4.21.0, ESM module
- `server/tsconfig.json` — strict mode, module NodeNext, outDir ./dist, rootDir ./src
- `server/Dockerfile` — 3-stage multi-stage build (needs Prisma generate added)
- `server/.dockerignore` — excludes prisma/migrations (needs to be removed)

**Docker:**
- `docker-compose.yml` — db (postgres:16-alpine), server, client, dev and test profiles
- `.env` — `DATABASE_URL=postgresql://postgres:postgres@db:5432/habbit_tracker`
- PostgreSQL accessible at `localhost:5432` from host, `db:5432` from containers

### What This Story Does NOT Include

- No Express app refactoring or middleware (E1-S4)
- No API routes or services (E2+, E3+)
- No seed data
- No health endpoint changes (keep raw `pg` check — E1-S4 will handle the refactor)
- No CI pipeline (E1-S5)
- No test setup (E1-S6)

### References

- [Source: Architecture §4 — Data Model (all table definitions, ERD, design decisions, timezone strategy)]
- [Source: Architecture §7 — Backend Architecture (project structure, Prisma client at lib/prisma.ts)]
- [Source: Architecture §12 — Deployment Architecture (Dockerfile Prisma generate stage)]
- [Source: Epics — E1-S3 acceptance criteria]
- [Source: Previous Story 1-2 — Dockerfile, Docker Compose, .dockerignore, health endpoint state]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

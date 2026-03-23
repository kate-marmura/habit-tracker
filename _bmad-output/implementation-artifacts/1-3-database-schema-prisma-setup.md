# Story 1.3: Database Schema & Prisma Setup

Status: done

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

- [x] Task 1: Install Prisma dependencies (AC: #7, #8)
  - [x] Install Prisma CLI as dev dependency: `npm install -D prisma`
  - [x] Install Prisma Client as runtime dependency: `npm install @prisma/client`
  - [x] Add Prisma scripts to `server/package.json`:
    - `"db:migrate": "prisma migrate dev"`
    - `"db:migrate:deploy": "prisma migrate deploy"`
    - `"db:generate": "prisma generate"`
    - `"db:studio": "prisma studio"`
    - `"db:push": "prisma db push"`
    - `"db:seed": "prisma db seed"`

- [x] Task 2: Initialize Prisma schema (AC: #1, #2)
  - [x] Run `npx prisma init --datasource-provider postgresql` (creates `server/prisma/schema.prisma` and updates `.env`)
  - [x] Verify `datasource db` uses `provider = "postgresql"` and `url = env("DATABASE_URL")`
  - [x] Set `generator client` with `provider = "prisma-client"` (Prisma 7 uses `prisma-client` not `prisma-client-js`)
  - [x] Verify DATABASE_URL in `.env` points to the Docker PostgreSQL: `postgresql://postgres:postgres@db:5432/habit_tracker` (already configured from E1-S2)

- [x] Task 3: Define `User` model (AC: #1, #2)
  - [x] Model name: `User` (maps to `users` table via `@@map("users")`)
  - [x] All fields defined per spec with @map for snake_case DB columns
  - [x] Relations: `habits Habit[]`, `passwordResetTokens PasswordResetToken[]`

- [x] Task 4: Define `Habit` model (AC: #1, #2, #4, #6)
  - [x] Model name: `Habit` (maps to `habits` table via `@@map("habits")`)
  - [x] All fields defined per spec
  - [x] Relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
  - [x] Relation: `dayEntries DayEntry[]`
  - [x] Index: `@@index([userId, isArchived])`

- [x] Task 5: Define `DayEntry` model (AC: #1, #2, #3, #5, #6)
  - [x] Model name: `DayEntry` (maps to `day_entries` table via `@@map("day_entries")`)
  - [x] All fields defined per spec
  - [x] Relation: `habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)`
  - [x] Unique constraint: `@@unique([habitId, entryDate])`
  - [x] Index: `@@index([habitId, entryDate])`

- [x] Task 6: Define `PasswordResetToken` model (AC: #1, #2, #6)
  - [x] Model name: `PasswordResetToken` (maps to `password_reset_tokens` table via `@@map("password_reset_tokens")`)
  - [x] All fields defined per spec
  - [x] Relation: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`

- [x] Task 7: Run initial migration (AC: #7)
  - [x] PostgreSQL running via `docker compose up db -d`
  - [x] Used `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/habit_tracker` for host-to-container connection
  - [x] Ran `npx prisma migrate dev --name init` — migration applied successfully
  - [x] All 4 tables created with correct columns, types, constraints, and indexes
  - [x] Migration file at `server/prisma/migrations/20260320153004_init/migration.sql`

- [x] Task 8: Create Prisma client singleton (AC: #8)
  - [x] Created `server/src/lib/prisma.ts`
  - [x] Exports singleton `PrismaClient` instance with PrismaPg adapter (Prisma 7 adapter pattern)
  - [x] Uses lazy instantiation via globalThis to avoid multiple clients in development
  - [x] Created `server/src/lib/` directory

- [x] Task 9: Update server Dockerfile for Prisma (AC: #7)
  - [x] Copy `prisma/` and `prisma.config.ts` in build stage before `npm run build`
  - [x] Added `RUN npx prisma generate` in build stage
  - [x] Production stage copies generated Prisma client from `src/generated`
  - [x] Production stage copies `prisma/` and `prisma.config.ts` for `prisma migrate deploy`
  - [x] Removed `prisma/migrations` from `.dockerignore`

- [x] Task 10: Update Docker Compose dev profile for Prisma
  - [x] Added volume mount `./server/prisma:/app/prisma` to `server-dev` service

- [x] Task 11: Verify complete setup
  - [x] `npx prisma generate` succeeds — generates typed client to `./src/generated/prisma`
  - [x] `npx prisma migrate dev` applies cleanly against Docker PostgreSQL
  - [x] TypeScript compiles: `npx tsc --noEmit` passes
  - [x] Server builds: `npm run build` succeeds
  - [x] Server lint passes: `npm run lint` clean
  - [x] Docker build: `docker compose build server` succeeds with Prisma generate step

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/habit_tracker" npx prisma migrate dev --name init
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
- `.env` — `DATABASE_URL=postgresql://postgres:postgres@db:5432/habit_tracker`
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

Claude (claude-4.6-opus)

### Debug Log References

- Prisma 7.5.0 uses `prisma-client` generator (not `prisma-client-js`) with adapter-based connections via `@prisma/adapter-pg`. The singleton pattern was adapted accordingly.
- Prisma init creates `prisma.config.ts` for datasource configuration (new in Prisma 6+). This file is required in the Docker build.
- Generated client outputs to `src/generated/prisma/` (not `node_modules/.prisma/`).
- Had to install `dotenv` as dev dependency — required by `prisma.config.ts`.
- Had to install `@prisma/adapter-pg` — required by Prisma 7 for PostgreSQL connections.
- Added port mapping `5432:5432` to `db` service in docker-compose.yml (was missing) to enable host-to-container Prisma CLI access.

### Completion Notes List

- **Task 1:** Installed prisma (dev), @prisma/client (runtime), @prisma/adapter-pg (runtime), dotenv (dev). Added 6 db:* scripts to package.json.
- **Tasks 2-6:** Initialized Prisma with `prisma init --datasource-provider postgresql`. Defined all 4 models (User, Habit, DayEntry, PasswordResetToken) with exact field specifications from Architecture §4. UUID PKs via `gen_random_uuid()`, snake_case mapping, cascade deletes, indexes, unique constraint on (habit_id, entry_date).
- **Task 7:** Migration `20260320153004_init` applied successfully against Docker PostgreSQL. All tables, columns, constraints, indexes, and foreign keys created correctly.
- **Task 8:** Created Prisma client singleton at `server/src/lib/prisma.ts` using PrismaPg adapter pattern (Prisma 7). Lazy instantiation via globalThis for development.
- **Task 9:** Updated server Dockerfile to copy prisma/ and prisma.config.ts, run `npx prisma generate` in build stage, and copy generated client + prisma dir to production stage. Removed `prisma/migrations` from .dockerignore.
- **Task 10:** Added `./server/prisma:/app/prisma` volume mount to server-dev service in docker-compose.yml.
- **Task 11:** All verifications passed: prisma generate, tsc --noEmit, npm run build, npm run lint, docker compose build server.

### File List

- `server/package.json` (modified) — Added prisma, @prisma/client, @prisma/adapter-pg, dotenv; added db:* scripts
- `server/prisma/schema.prisma` (new) — Complete database schema with 4 models
- `server/prisma.config.ts` (new) — Prisma datasource configuration (generated by prisma init)
- `server/prisma/migrations/20260320153004_init/migration.sql` (new) — Initial migration SQL
- `server/prisma/migrations/migration_lock.toml` (new) — Migration lock file
- `server/src/lib/prisma.ts` (new) — PrismaClient singleton with PrismaPg adapter
- `server/src/generated/prisma/` (new, gitignored) — Generated Prisma client code
- `server/Dockerfile` (modified) — Added prisma generate step and generated client copy
- `server/.dockerignore` (modified) — Removed prisma/migrations exclusion
- `server/.gitignore` (new) — Generated by prisma init
- `docker-compose.yml` (modified) — Added port 5432 mapping to db, prisma volume mount to server-dev
- `.gitignore` (modified) — Added server/src/generated/ to ignore generated Prisma client

# Story 3.1: Create a Habit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to create a new habit with a name, description, and start date,
so that I can begin tracking it.

## Acceptance Criteria

1. `POST /api/habits` accepts `{ name, description, startDate }`
2. `name` required, max 100 characters; `description` optional; `startDate` required, must be ≤ today (resolved via client timezone), defaults to today in frontend
3. Returns `422` if `startDate` is in the future
4. Server enforces ≤10 active habits — returns `409` with `HABIT_LIMIT_REACHED` if limit exceeded (FR11)
5. Returns created habit object with generated `id`
6. Frontend `CreateHabitModal` accessible from `HabitListPage`
7. Form validates required fields before submission
8. New habit appears in the active habit list immediately after creation
9. Shows limit-reached error if user already has 10 active habits
10. Network errors show a user-friendly message ("Could not create habit. Please check your connection and try again.")
11. Start date is stored as-is and cannot be modified after creation (Architecture §4 Design Decisions) — enforce immutability by API design in later stories; this story only creates with the chosen date

## Tasks / Subtasks

- [x] Task 1: Add habit service — create + limit + date validation (AC: #1–#5, #11)
  - [x] Create `server/src/services/habit.service.ts`
  - [x] Export `createHabit(userId: string, input: { name: string; description?: string | null; startDate: string }, timezone: string)`
  - [x] Count active habits: `prisma.habit.count({ where: { userId, isArchived: false } })`
  - [x] If count ≥ 10, throw `AppError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.')` (match architecture error shape)
  - [x] Normalize `name` with `trim()`; reject empty after trim via Zod in routes or throw `422` in service — prefer Zod in routes for consistency
  - [x] Parse `startDate` as a calendar date string `YYYY-MM-DD` only
  - [x] Compute **today** in the request timezone using `res.locals.timezone` (set by `timezoneMiddleware` from `X-Timezone`; same source as architecture §4)
  - [x] If `startDate` (as a date-only value) is **after** today in that timezone, throw `AppError(422, 'INVALID_START_DATE', 'Start date cannot be in the future')` or rely on Zod refine — pick one pattern and keep messages user-friendly
  - [x] Persist `startDate` to Prisma `@db.Date` without off-by-one: build a `Date` from `YYYY-MM-DD` using **UTC date parts** (e.g. `Date.UTC(year, month - 1, day)`) so the stored `DATE` matches the user’s chosen calendar day
  - [x] `description`: optional; if omitted or empty string after trim, store `null`
  - [x] Return the created row with fields the client needs: at minimum `id`, `name`, `description`, `startDate`, `isArchived`, `createdAt`, `updatedAt` (serialize `startDate` as `YYYY-MM-DD` in JSON if needed for clarity — document chosen JSON shape)

- [x] Task 2: Add Zod schema and POST route (AC: #1, #3)
  - [x] Create `server/src/routes/habit.routes.ts`
  - [x] Apply `authenticate` middleware to all habit routes in this file (pattern: `router.use(authenticate)` at top of habit router)
  - [x] Define `createHabitSchema` with `zod`:
    - `name`: `z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters')`
    - `description`: optional — `z.string().trim().max(2000).optional()` or allow `''` → treat as no description
    - `startDate`: `z.string().regex(...).refine(isValidCalendarDateString)` so values like `2026-02-30` are rejected (`422` `VALIDATION_ERROR`)
  - [x] Add `POST /` → parse body, pass `res.locals.userId` and `res.locals.timezone` into service
  - [x] Return `201` with created habit JSON
  - [x] Do not add `GET /api/habits` in this story unless needed for manual QA; epic **3-2** owns list endpoints — client can use POST response to update local state (AC #8)

- [x] Task 3: Mount habit routes under `/api/habits` (AC: #1)
  - [x] Update `server/src/routes/index.ts` to `router.use('/habits', habitRoutes)`
  - [x] Ensure global `timezoneMiddleware` in `app.ts` runs before routes so `res.locals.timezone` is always set

- [x] Task 4: Server integration tests (AC: #1–#5, #9)
  - [x] Add `server/src/__tests__/habits.create.test.ts` following `auth.change-password.test.ts` patterns (supertest + prisma + JWT)
  - [x] Use a dedicated test user email domain (e.g. `habits-create@habit-habits-test.com`) and delete user + habits in `afterAll`
  - [x] Send `Authorization: Bearer <token>` and `X-Timezone: UTC` (or a fixed IANA zone) on every request
  - [x] Test: `201` creates habit; response includes `id`; `isArchived === false`
  - [x] Test: `startDate` stored as correct calendar date (read back from DB)
  - [x] Test: future `startDate` returns `422`
  - [x] Test: missing/empty `name` returns `422` (`ZodError` → `VALIDATION_ERROR`)
  - [x] Test: `name` > 100 chars returns `422`
  - [x] Test: 11th active habit returns `409` with `HABIT_LIMIT_REACHED`
  - [x] Test: without auth returns `401`
  - [x] Test: optional `description` omitted → stored `null`; provided → stored
  - [x] Test: impossible calendar `startDate` (e.g. `2026-02-30`) returns `422` (`VALIDATION_ERROR`)

- [x] Task 5: Shared “today in timezone” helper (AC: #2, #3)
  - [x] Add `server/src/lib/calendar-date.ts` (or similar) with `getCalendarDateInTimezone(timezone: string, date?: Date): string` returning `YYYY-MM-DD`
  - [x] Implement using `Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(...)` — `en-CA` yields ISO-like `YYYY-MM-DD`
  - [x] Use this helper in `habit.service.ts` for `startDate <= today` checks
  - [x] Document that this must stay consistent with `client` `X-Timezone` header behavior in `api.ts`

- [x] Task 6: Frontend types and API call (AC: #5, #8, #10)
  - [x] Add a small type + helper e.g. `client/src/types/habit.ts` and `createHabit` in `client/src/services/habitsApi.ts` (or extend `api.ts` with `post<Habit>('/api/habits', payload)` — avoid duplicating fetch logic)
  - [x] `post()` already sends `X-Timezone` via `getAuthHeaders()` — verify create habit uses the same client path
  - [x] On `fetch` failure (network), show: **"Could not create habit. Please check your connection and try again."** (distinguish from `ApiError` with status)
  - [x] On `409 HABIT_LIMIT_REACHED`, show API `message` or the architecture copy
  - [x] On `422`, show validation message from API

- [x] Task 7: `HabitListPage` + `CreateHabitModal` (AC: #6–#10)
  - [x] Add `client/src/pages/HabitListPage.tsx` — replace `HabitsPlaceholder` usage for `/habits` in `App.tsx`
  - [x] Local state: `habits: Habit[]` initialized to `[]` (full server list arrives in **3-2**)
  - [x] “Create habit” button opens `CreateHabitModal`
  - [x] Modal fields: `name` (required), `description` (optional), `startDate` (date input) defaulting to **today** in the browser’s local calendar (`YYYY-MM-DD` from `new Date()`)
  - [x] Client-side validation: block submit if `name` empty; show inline errors consistent with `RegisterPage` / `SettingsPage`
  - [x] On successful `POST`, append returned habit to `habits` state and close modal (AC #8)
  - [x] If user is not authenticated, redirect to `/login` (same local guard pattern as `SettingsPage` until **7-1**)

- [x] Task 8: Routing (AC: #6)
  - [x] Update `client/src/App.tsx`: `<Route path="/habits" element={<HabitListPage />} />`
  - [x] Remove or inline-delete `HabitsPlaceholder` if fully replaced

- [x] Task 9: Client tests (AC: #6–#10)
  - [x] Add `HabitListPage.test.tsx` and/or `CreateHabitModal.test.tsx`
  - [x] Mock `post` / habits API: success adds card to list; `409` shows limit message; network error shows connection copy
  - [x] Wrap with `BrowserRouter` + `AuthProvider` as in other page tests

- [x] Task 10: Verify end-to-end (all ACs)
  - [x] `npm run build` (client + server), `npm run lint`, `npm test`
  - [x] `docker compose build` if the project uses Docker in CI
  - [x] Manual: log in → `/habits` → create habit → appears in list → verify DB row `start_date` and `user_id`

## Dev Notes

### Story Scope

First **Epic 3** story: authenticated habit creation only. List/detail/edit/archive flows are later stories — keep this narrow.

### Project Structure Notes

- **Server:** New `habit.service.ts` + `habit.routes.ts` per [Source: Architecture §6 — `habit.service.ts`, `habit.routes.ts`]
- **Client:** Introduce `HabitListPage` and `CreateHabitModal` per [Source: Architecture §6 — Component Hierarchy]
- **Do not** implement `GET /api/habits` here unless you deliberately pull scope forward; epic **3-2** defines active/archived list endpoints and ordering

### Existing Code to Build On

- **`server/src/middleware/auth.middleware.ts`** — `authenticate` sets `res.locals.userId`
- **`server/src/middleware/timezone.middleware.ts`** — sets `res.locals.timezone` (defaults UTC + dev warning if header missing)
- **`client/src/services/api.ts`** — already sends `X-Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone`
- **`server/prisma/schema.prisma`** — `Habit` model with `name` (VarChar 100), `description` optional, `startDate` `@db.Date`, `isArchived` default false
- **`server/src/middleware/error-handler.ts`** — `ZodError` → `422` `VALIDATION_ERROR`; `AppError` for `409` / `422` business rules

### Critical Implementation Guardrails

1. **10 active habits** — count only `isArchived: false` for the authenticated `userId`
2. **Date validation** — “today” must use **`res.locals.timezone`**, not server local time [Source: Architecture §4 Timezone Strategy]
3. **No off-by-one on `DATE`** — construct Prisma `Date` from `YYYY-MM-DD` using UTC components
4. **Immutability of `startDate`** — creation path sets it once; do not add update endpoint here (E3-S3)
5. **Authorization** — every habit row must be scoped by `userId` from JWT; never trust client-sent `userId`
6. **Error format** — `{ error: { code, message } }` consistent with existing API

### JSON Response Shape (recommended)

Document and implement consistently, e.g.:

```json
{
  "id": "uuid",
  "name": "string",
  "description": null,
  "startDate": "2026-03-23",
  "isArchived": false,
  "createdAt": "2026-03-23T12:00:00.000Z",
  "updatedAt": "2026-03-23T12:00:00.000Z"
}
```

Use ISO strings for timestamps; `startDate` as `YYYY-MM-DD` string avoids timezone confusion in the UI.

### Previous Story Intelligence (Epic 2)

- Auth tests use isolated emails, `beforeAll` user creation, `jwt.sign` with `config.JWT_SECRET`
- Client `401` handling clears session and redirects when appropriate — habit endpoints require a valid token
- Prefer thin routes + fat services (`auth.routes.ts` / `auth.service.ts` pattern)

### What This Story Does NOT Include

- `GET /api/habits` or `GET /api/habits/archived` (E3-S2)
- `HabitCard` as a rich component with calendar links (E3-S2) — a minimal list row is enough
- Calendar, day entries, stats (Epic 4–5)
- Global app shell / `NavBar` (Epic 7)

### References

- [Source: Epics — E3-S1 acceptance criteria]
- [Source: PRD — FR6, FR11]
- [Source: Architecture §4 — Timezone Strategy, start_date immutability]
- [Source: Architecture §5 — Habits endpoints, create validation, error example `HABIT_LIMIT_REACHED`]
- [Source: Architecture §6 — Route structure, HabitListPage, CreateHabitModal]
- [Source: `server/prisma/schema.prisma` — `Habit` model]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking

### Debug Log References

- `ResetPasswordPage.tsx` had pre-existing TS error (`token` possibly undefined from `useParams`); fixed with non-null assertion since route guarantees the param
- `en-CA` locale in `Intl.DateTimeFormat` produces ISO `YYYY-MM-DD` format for calendar date helper
- `startDate` stored as UTC midnight via `Date.UTC()` to avoid Postgres DATE off-by-one

### Completion Notes List

- Manual E2E verified; code-review follow-up: real calendar validation for `startDate`, integration test, modal `role="dialog"` / backdrop + Escape close
- `habit.service.ts` + `habit.routes.ts` — thin-route/fat-service pattern
- 10 active habit limit enforced server-side with `HABIT_LIMIT_REACHED` 409
- Future start dates rejected using timezone-aware "today" calculation
- `HabitListPage` + `CreateHabitModal` (validation, errors, a11y basics)
- Server/client tests, lint, and builds passing at story close

### File List

- `server/src/lib/calendar-date.ts` — NEW: `getTodayInTimezone`, `parseCalendarDate`, `formatCalendarDate`, `isValidCalendarDateString`
- `server/src/services/habit.service.ts` — NEW: createHabit with limit check and date validation
- `server/src/routes/habit.routes.ts` — NEW: POST / with Zod schema and authenticate middleware
- `server/src/routes/index.ts` — MODIFIED: mounted /habits routes
- `server/src/__tests__/habits.create.test.ts` — NEW: habit create integration tests (incl. invalid calendar `startDate`)
- `client/src/types/habit.ts` — NEW: Habit and CreateHabitPayload interfaces
- `client/src/components/CreateHabitModal.tsx` — NEW: modal (form, validation, dialog semantics, backdrop/Escape close)
- `client/src/pages/HabitListPage.tsx` — NEW: habits page with empty state, habit list, create button
- `client/src/pages/HabitListPage.test.tsx` — NEW: 7 component tests
- `client/src/App.tsx` — MODIFIED: replaced HabitsPlaceholder with HabitListPage
- `client/src/pages/ResetPasswordPage.tsx` — MODIFIED: fixed TS error (token non-null assertion)


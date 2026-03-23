# Story 3.2: View Active and Archived Habit Lists

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my active habits and be able to view archived ones,
so that I can choose which habit to work on or review.

## Acceptance Criteria

1. `GET /api/habits` returns active habits (`is_archived = false`) for the authenticated user only (NFR9)
2. `GET /api/habits/archived` returns archived habits (`is_archived = true`) for the authenticated user only
3. Both list endpoints return `200` with a JSON array of habit objects; use the same field shape as create (see Story 3.1 / architecture): `id`, `name`, `description`, `startDate` (`YYYY-MM-DD`), `isArchived`, `createdAt`, `updatedAt`
4. Habits are ordered by **creation date, newest first** (`createdAt` descending)
5. `HabitListPage` at `/habits` loads the active list from `GET /api/habits` on mount (replace “local-only” initialization from 3.1)
6. After successful create (`POST /api/habits`), the new habit still appears immediately at the top of the list (consistent with newest-first ordering)
7. Active habits render as **`HabitCard`** components (extract from current inline list markup in `HabitListPage.tsx`)
8. Each **`HabitCard`** shows the habit **name** and a **link** to the calendar route **`/habits/:id`** (see Architecture §6)
9. **`ArchivedHabitsPage`** at **`/habits/archived`** lists archived habits from `GET /api/habits/archived` using the same card/list pattern as the active page (dedicated **`ArchivedHabitCard`** is **E3-S5** — not required here)
10. **Navigation** from the active list UI to archived: clear link (e.g. in header area) to **`/habits/archived`**; archived page should link back to **`/habits`**
11. **Empty state** when there are no active habits: primary message should match product intent — use **“Create your first habit”** (FR9 / epics); keep secondary CTA to open create modal
12. **Empty state** for archived page when none: friendly copy (e.g. “No archived habits”)
13. **Loading and error UX**: show loading while fetching; on failure show a clear message (reuse patterns from `CreateHabitModal` / other pages for `ApiError` vs network `TypeError`)
14. **`GET` without auth** returns **`401`** (existing `authenticate` middleware)
15. Register **`GET /archived` before any `/:id` route** when added later — literal path must not be captured as an id

## Tasks / Subtasks

- [x] Task 1: Service — list active and archived (AC: #1–#4, #14)
  - [x] Add `listActiveHabits(userId: string)` and `listArchivedHabits(userId: string)` in `server/src/services/habit.service.ts`
  - [x] Prisma: `where: { userId, isArchived: true | false }`, `orderBy: { createdAt: 'desc' }`, same `select` as `createHabit` for consistent JSON shape
  - [x] Map rows through `formatCalendarDate` for `startDate` (reuse `parseCalendarDate` / `formatCalendarDate` from `calendar-date.ts` — same contract as 3.1)

- [x] Task 2: Routes — GET handlers (AC: #1–#2, #14–#15)
  - [x] In `server/src/routes/habit.routes.ts`, under `router.use(authenticate)`, add **`router.get('/archived', ...)`** then **`router.get('/', ...)`** (order matters vs future `/:id`)
  - [x] Return `200` with array body (empty array is valid)

- [x] Task 3: Server integration tests (AC: #1–#4, #14)
  - [x] Add `server/src/__tests__/habits.list.test.ts` (or extend existing habits tests) following `habits.create.test.ts`: JWT + `X-Timezone`, isolated user cleanup
  - [x] Seed habits with mixed `isArchived`; assert active endpoint returns only non-archived, archived endpoint only archived, both scoped to user
  - [x] Assert ordering: newer `createdAt` appears first in JSON array
  - [x] Assert `401` without `Authorization`

- [x] Task 4: Client API helpers (AC: #5–#6)
  - [x] Add `fetchActiveHabits()` → `get<Habit[]>('/api/habits')` and `fetchArchivedHabits()` → `get<Habit[]>('/api/habits/archived')` — prefer a small `client/src/services/habitsApi.ts` (or colocate in `api.ts` if you keep a single module; **do not** duplicate `fetch`/`getAuthHeaders` logic)
  - [x] `get<T>` already sends `X-Timezone` via `getAuthHeaders()` — no extra headers required for these reads

- [x] Task 5: `HabitCard` + list wiring (AC: #7–#8, #11–#13)
  - [x] Create `client/src/components/HabitCard.tsx`: props `habit: Habit`, render name + optional description/start line as today; include `Link` from `react-router-dom` to **`/habits/${habit.id}`** (accessible name should include habit name for a11y)
  - [x] Refactor `HabitListPage.tsx`: `useEffect` fetch active habits on mount; loading/error state; map to `HabitCard`
  - [x] On create success: either **prepend** returned habit to state (already newest-first) **or** refetch — prepend is acceptable if it matches server order

- [x] Task 6: `ArchivedHabitsPage` + routes (AC: #9–#13, #15)
  - [x] New `client/src/pages/ArchivedHabitsPage.tsx`: same auth redirect pattern as `HabitListPage`; fetch archived list; reuse `HabitCard` or shared list item
  - [x] Update `client/src/App.tsx`: `<Route path="/habits/archived" element={<ArchivedHabitsPage />} />` **before** `<Route path="/habits/:id" ... />` if you define both (React Router v6 matches static segments correctly, but keep route declarations readable)
  - [x] Add **`/habits/:id`** route with a **minimal `HabitCalendarPage`** (or named per Architecture §6) so links from `HabitCard` do not 404 — **Epic 4** owns the real calendar; stub can show habit id or name from optional `GET /api/habits/:id` **or** a simple “Calendar coming next” placeholder with **Back to habits**. **Do not** implement `GET /api/habits/:id` in this story unless needed for the stub; a lightweight placeholder that only reads `useParams().id` is acceptable for navigation proof.

- [x] Task 7: Navigation between active and archived (AC: #10)
  - [x] On `HabitListPage` header (near Settings / title area): `Link` to `/habits/archived`
  - [x] On `ArchivedHabitsPage`: `Link` back to `/habits`

- [x] Task 8: Client tests (AC: #5–#13)
  - [x] Update `HabitListPage.test.tsx`: mock `get` for `/api/habits`; assert cards and links; empty state copy; loading
  - [x] Add `ArchivedHabitsPage.test.tsx` with mocked archived fetch
  - [x] Adjust tests that assumed habits only from POST — now include initial fetch behavior

- [x] Task 9: Verify (all ACs)
  - [x] `npm run lint`, `npm test`, builds for client and server

## Dev Notes

### Story scope

This story **owns** habit **list** APIs and **both** list UIs. It **does not** implement edit, archive, unarchive, delete, calendar grid, or `GET /api/habits/:id` unless you need it for a minimal stub page.

### Previous story intelligence (3.1)

- **`habit.service.ts`** / **`habit.routes.ts`** exist; extend them — do not duplicate create logic
- **JSON shape** for habits is established in 3.1 — list endpoints must match so the client `Habit` type stays one interface
- **`formatCalendarDate` / `parseCalendarDate`** — reuse for any `Date` ↔ `YYYY-MM-DD` serialization
- **`HabitListPage`** currently initializes `habits` to `[]` and only fills via POST — **must** load from server on mount so refresh/login shows full list
- **Tests** in `HabitListPage.test.tsx` mock `post` — add `get` mocks and async wait patterns
- **Dev Agent Record** from 3.1 notes: dialog semantics, backdrop, Escape on modal — keep consistency for any new UI

### Architecture compliance

- **Endpoints:** [Source: `_bmad-output/architecture.md` §5 — `GET /api/habits`, `GET /api/habits/archived`]
- **Routes/components:** [Source: `_bmad-output/architecture.md` §6 — `/habits` → `HabitListPage`, `/habits/archived` → `ArchivedHabitsPage`, `/habits/:id` → `HabitCalendarPage`]
- **Index:** `(user_id, is_archived)` supports these list queries [Source: Architecture §4 — `habits` table]
- **Errors:** `{ error: { code, message } }` for API failures; lists return `200` + `[]` when empty (not 404)
- **Security:** Always scope by `res.locals.userId` from JWT — never accept `userId` from client [Source: NFR9]

### Product references

- **FR9, FR10, FR30** — [Source: `_bmad-output/prd.md`]
- **E3-S2** acceptance criteria — [Source: `_bmad-output/epics-and-stories.md` — E3-S2]

### Git intelligence (recent commits)

- `feat(habits): create habit (story 3.1) + review fixes` — patterns: thin routes, fat service, Supertest + Prisma, Zod on mutating routes, `HabitListPage` + `CreateHabitModal`

### File structure (expected touches)

| Area | Files |
|------|--------|
| Server | `server/src/services/habit.service.ts`, `server/src/routes/habit.routes.ts`, `server/src/__tests__/habits.list.test.ts` (new or split) |
| Client | `client/src/components/HabitCard.tsx` (new), `client/src/pages/HabitListPage.tsx`, `client/src/pages/ArchivedHabitsPage.tsx` (new), `client/src/pages/HabitCalendarPage.tsx` or stub (new), `client/src/App.tsx`, `client/src/services/habitsApi.ts` (new, optional), tests |

### Testing standards

- Server: Jest + Supertest + real Prisma test DB pattern from `habits.create.test.ts`
- Client: Vitest + RTL; mock `get`/`post` from `api` module like existing page tests

### Latest tech notes

- Stack is already fixed (Express 5, Prisma, React 19, Vite) per repo — **no** dependency upgrades required for this story unless a security patch is mandatory in `package.json`.

### Project context

- No `project-context.md` found in repo — rely on this story + architecture + 3.1 artifact.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Added `listActiveHabits` and `listArchivedHabits` service functions with shared `habitSelectFields` constant; DRYed up the select from `createHabit`
- Task 2: Added `GET /archived` and `GET /` routes; `/archived` registered before `/` to avoid future `/:id` conflict
- Task 3: Created `habits.list.test.ts` with 9 integration tests covering user scoping, ordering, field shape, empty arrays, and 401 auth
- Task 4: Created `habitsApi.ts` with `fetchActiveHabits`/`fetchArchivedHabits` wrappers using existing `get<T>` from `api.ts`
- Task 5: Created `HabitCard` component with a11y-labeled Link to `/habits/:id`; refactored `HabitListPage` to fetch on mount with loading/error/empty states; empty state copy matches product intent ("Create your first habit")
- Task 6: Created `ArchivedHabitsPage` with same auth/fetch/error pattern; created stub `HabitCalendarPage` placeholder; added all three routes to `App.tsx`
- Task 7: Added "Archived" link in `HabitListPage` header; "Back to habits" link in `ArchivedHabitsPage`
- Task 8: Rewrote `HabitListPage.test.tsx` (10 tests) to mock `fetchActiveHabits` for mount-fetch behavior; created `ArchivedHabitsPage.test.tsx` (7 tests)
- Task 9: All linting clean, 66 server tests pass, 50 client tests pass, both builds succeed

### Change Log

- 2026-03-23: Implemented Story 3.2 — list active/archived habits API + UI (all 9 tasks)

### File List

- server/src/services/habit.service.ts (modified)
- server/src/routes/habit.routes.ts (modified)
- server/src/__tests__/habits.list.test.ts (new)
- client/src/services/habitsApi.ts (new)
- client/src/components/HabitCard.tsx (new)
- client/src/pages/HabitListPage.tsx (modified)
- client/src/pages/ArchivedHabitsPage.tsx (new)
- client/src/pages/HabitCalendarPage.tsx (new)
- client/src/App.tsx (modified)
- client/src/pages/HabitListPage.test.tsx (modified)
- client/src/pages/ArchivedHabitsPage.test.tsx (new)

# Story 3.4: Archive a Habit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to archive a habit I no longer actively track,
so that it's removed from my daily view but my history is preserved.

## Acceptance Criteria

1. **`PATCH /api/habits/:id/archive`** sets **`is_archived`** to **`true`** for the habit owned by the authenticated user (JWT **`userId`**)
2. Returns **`200`** with the **full habit JSON** (same shape as `GET` / `PUT` / list: `id`, `name`, `description`, `startDate` `YYYY-MM-DD`, `isArchived`, `createdAt`, `updatedAt`) and **`isArchived: true`**
3. **Ownership:** only the owning user may archive — **`404`** `NOT_FOUND` (same messaging pattern as `getHabitById` / `updateHabit`) if the habit does not exist or belongs to another user — **NFR9**
4. **Idempotency:** if the habit is **already archived**, **`PATCH`** may return **`200`** with the current row (still `isArchived: true`) — avoid **`500`** or confusing errors
5. **No request body required** (empty body is fine); do not use this endpoint to unarchive (**E3-S6**)
6. After archive, the habit **no longer appears** in **`GET /api/habits`** and **does appear** in **`GET /api/habits/archived`** (verify in tests)
7. Archiving **frees an active slot** toward the **10 active habits** limit — i.e. `createHabit` active count excludes archived rows (already true if counting `isArchived: false`; add a test that proves a user at the limit can create after archiving one)
8. **`401`** without auth
9. **`HabitCalendarPage`**: user can trigger **Archive** from **`HabitSettingsDropdown`** (Architecture §6)
10. **Confirmation** before the API call — browser **`confirm`**, dedicated modal, or equivalent; user must explicitly confirm destructive-ish action (copy should mention habit moves to archived / leaves active list)
11. On **success**, **`navigate('/habits', { replace: true })`** (or equivalent) so the user lands on the active list — **Epic E3-S4**
12. Show **clear errors** if the API fails (`ApiError` message vs network failure — match **`HabitCalendarPage`** / **`EditHabitModal`** patterns)
13. **Express route registration:** define **`router.patch('/:id/archive', ...)`** so it does not collide with **`/:id`** — registering **`/:id/archive` before `/:id`** is **not** required for different methods, but keep the file readable; **validate `id`** with the same **`z.string().uuid()`** as existing param parsing

## Tasks / Subtasks

- [x] Task 1: Service — `archiveHabit` (AC: #1–#7)
  - [x] Add **`archiveHabit(userId: string, habitId: string)`** in `server/src/services/habit.service.ts`
  - [x] **`findFirst`** where `{ id: habitId, userId }` — missing → **`AppError(404, 'NOT_FOUND', 'Habit not found')`**
  - [x] If **`isArchived` already true**, return serialized habit without error (**idempotent** — AC #4)
  - [x] Otherwise **`update`** with `{ isArchived: true }`, **`select: habitSelectFields`**, return with **`formatCalendarDate`**

- [x] Task 2: Route (AC: #1–#8, #13)
  - [x] **`router.patch('/:id/archive', async (req, res) => { ... })`** in `server/src/routes/habit.routes.ts`
  - [x] Parse **`req.params.id`** with **`habitIdParam`** (reuse existing **`habitIdParam`**)
  - [x] Call **`archiveHabit(res.locals.userId, id)`**, **`res.json(habit)`**

- [x] Task 3: Server integration tests (AC: #1–#8)
  - [x] New or extended **`server/src/__tests__/habits.archive.test.ts`**: auth + isolated user + habits
  - [x] **`PATCH`** success → **`isArchived: true`**; habit absent from active list query, present in archived list query (or hit **`GET`** endpoints)
  - [x] **`404`** wrong user / random UUID; **`401`** no token
  - [x] **Idempotent:** second **`PATCH`** → **`200`**, still archived
  - [x] **Limit:** seed **10** active habits for user → **`POST /api/habits`** returns **`409`** → archive one → **`POST`** succeeds with **`201`** (AC #7)

- [x] Task 4: Client API (AC: #1–#2)
  - [x] In **`client/src/services/habitsApi.ts`**: **`archiveHabit(id: string): Promise<Habit>`** → **`patch<Habit>(\`/api/habits/${id}/archive\`)`** (use existing **`patch`** from **`api.ts`**)

- [x] Task 5: UI — dropdown + confirm + redirect (AC: #9–#12)
  - [x] Extend **`HabitSettingsDropdown`**: add **`onArchive`** prop (or single **`onAction`** — keep simple); new **Archive** **`menuitem`** below **Edit**
  - [x] **`HabitCalendarPage`**: wire **Archive** → show **confirmation** → call **`archiveHabit(id)`** → **`navigate('/habits', { replace: true })`** on success; on failure set error state (banner/toast/inline — consistent with page)
  - [x] Only show **Archive** when **`habit && !habit.isArchived`** (defensive — server enforces too)

- [x] Task 6: Client tests
  - [x] **`HabitCalendarPage.test.tsx`** (or dropdown tests): mock **`archiveHabit`**; confirm flow; assert **`navigate`** called with **`/habits`** and **`replace: true`**

- [x] Task 7: Verify
  - [x] `npm run lint`, `npm test`, client + server builds

## Dev Notes

### Story scope

- **In scope:** archive API, calendar settings entry point, confirm + redirect.
- **Out of scope:** unarchive (**E3-S6**), archived read-only calendar (**E3-S5**), delete (**E3-S7**), real calendar grid (**Epic 4**).

### Previous story intelligence (3.3)

- **`getHabitById`**, **`updateHabit`**, **`habitIdParam`**, **`habitSelectFields`** — reuse patterns and error codes
- **`HabitSettingsDropdown`** currently only **Edit** — extend; keep **a11y** (`role="menu"`, **`menuitem`**, Escape, click-outside)
- **`HabitCalendarPage`** already loads **`habit`** and opens **`EditHabitModal`** — add archive flow alongside
- **`habitsApi.ts`** — add **`archiveHabit`** next to **`updateHabit`**

### Architecture compliance

- **Endpoint:** [Source: `_bmad-output/architecture.md` §5 — `PATCH /api/habits/:id/archive`]
- **Component hierarchy:** [Source: Architecture §6 — `HabitSettingsDropdown` (edit, archive)]

### Product references

- **FR8** — archive removes from active view, preserves history
- **FR11** — 10 active habits; archiving frees a slot
- **E3-S4** — [Source: `_bmad-output/epics-and-stories.md`]

### File structure (expected touches)

| Area | Files |
|------|--------|
| Server | `server/src/services/habit.service.ts`, `server/src/routes/habit.routes.ts`, `server/src/__tests__/habits.archive.test.ts` (new) |
| Client | `client/src/services/habitsApi.ts`, `client/src/components/HabitSettingsDropdown.tsx`, `client/src/pages/HabitCalendarPage.tsx`, tests |

### Latest tech notes

- No dependency upgrades required.

### Project context

- No `project-context.md` in repo — rely on this story + architecture + prior habit stories.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Added `archiveHabit` service function with ownership check, idempotent handling (returns current row if already archived), and `update` with `{ isArchived: true }`
- Task 2: Registered `PATCH /:id/archive` route with existing `habitIdParam` UUID validation
- Task 3: Created `habits.archive.test.ts` with 7 integration tests: success, idempotency, list verification, ownership 404, missing 404, 401, and the critical limit-frees-slot test (10 habits at limit -> 409 -> archive one -> 201 success)
- Task 4: Added `archiveHabit` client API helper using `patch<Habit>`
- Task 5: Extended `HabitSettingsDropdown` with optional `onArchive` prop (Archive menuitem styled red, only shown for active habits); added `handleArchive` to `HabitCalendarPage` with `window.confirm` confirmation and `navigate('/habits', { replace: true })` on success; error handling matches existing patterns
- Task 6: Added 5 archive-specific client tests: Archive option visible for active, hidden for archived, confirm+navigate flow, cancel prevents call, API error display
- Task 7: Lint clean, 90 server tests pass, 71 client tests pass, both builds succeed

### Change Log

- 2026-03-23: Implemented Story 3.4 — archive a habit (PATCH /:id/archive, dropdown + confirm + redirect)

### File List

- server/src/services/habit.service.ts (modified)
- server/src/routes/habit.routes.ts (modified)
- server/src/__tests__/habits.archive.test.ts (new)
- client/src/services/habitsApi.ts (modified)
- client/src/components/HabitSettingsDropdown.tsx (modified)
- client/src/pages/HabitCalendarPage.tsx (modified)
- client/src/pages/HabitCalendarPage.test.tsx (modified)

# Story 3.6: Unarchive a Habit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to unarchive a previously archived habit,
so that I can resume tracking it without losing my history.

## Acceptance Criteria

1. **`PATCH /api/habits/:id/unarchive`** sets **`is_archived`** to **`false`** for the habit owned by the authenticated user (JWT `userId`)
2. Returns **`200`** with the **full habit JSON** (same shape as all habit endpoints: `id`, `name`, `description`, `startDate` `YYYY-MM-DD`, `isArchived`, `createdAt`, `updatedAt`) with **`isArchived: false`**
3. **Ownership:** only the owning user may unarchive — **`404`** `NOT_FOUND` if habit missing or belongs to another user (same pattern as `archiveHabit` / `updateHabit`) — **NFR9**
4. **Active habit limit:** server enforces **≤10 active habits** before allowing unarchive — if the user already has 10 active habits, return **`409`** with **`HABIT_LIMIT_REACHED`** and message **"You can have up to 10 active habits."** (same code/message as `createHabit` — [Source: Architecture §5 — Unarchive validation])
5. **Idempotency:** if the habit is **already active** (`isArchived: false`), return **`200`** with current row — no error, no re-count (mirror `archiveHabit` idempotent pattern)
6. **No request body** required
7. After unarchive, the habit **appears** in **`GET /api/habits`** (active list) and is **removed** from **`GET /api/habits/archived`**
8. **`401`** without auth
9. **Frontend:** unarchive button accessible on the **archived habit's read-only calendar view** (`HabitCalendarPage` when `isArchived: true`) — E3-S5 currently hides `HabitSettingsDropdown` entirely for archived habits; this story **re-shows** it with an **Unarchive** action
10. On successful unarchive, **`navigate('/habits', { replace: true })`** so the user lands on the active list where the habit now appears
11. Shows **`HABIT_LIMIT_REACHED`** error message inline if the user already has 10 active habits (same UX as create-habit limit error)
12. **Confirmation** not required for unarchive — it is a non-destructive action (restoring to active)

## Tasks / Subtasks

- [x] Task 1: Service — `unarchiveHabit` (AC: #1–#8)
  - [x] Add **`unarchiveHabit(userId: string, habitId: string)`** in `server/src/services/habit.service.ts`
  - [x] **`findFirst`** where `{ id: habitId, userId }` — missing → `AppError(404, 'NOT_FOUND', 'Habit not found')`
  - [x] If **`isArchived` already false** (already active), return serialized habit without error (**idempotent** — AC #5)
  - [x] **Count active habits** (`isArchived: false`) for user — if **≥ `MAX_ACTIVE_HABITS`**, throw `AppError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.')` — reuse the exact same error code and message as `createHabit`
  - [x] **`update`** with `{ isArchived: false }`, `select: habitSelectFields`, return with `formatCalendarDate`

- [x] Task 2: Route (AC: #1, #8)
  - [x] **`router.patch('/:id/unarchive', ...)`** in `server/src/routes/habit.routes.ts`
  - [x] Parse **`req.params.id`** with **`habitIdParam`** (reuse existing)
  - [x] Call `unarchiveHabit(res.locals.userId, id)`, `res.json(habit)`
  - [x] Register alongside `/:id/archive` — order between `/archive` and `/unarchive` does not matter since they are distinct literal sub-paths

- [x] Task 3: Server integration tests (AC: #1–#8)
  - [x] New **`server/src/__tests__/habits.unarchive.test.ts`**: auth + isolated user + habits
  - [x] **`PATCH`** success → `isArchived: false`; habit appears in active list, absent from archived list
  - [x] **`404`** wrong user / random UUID; **`401`** no token
  - [x] **Idempotent:** `PATCH` on an already-active habit → `200`, still `isArchived: false`
  - [x] **Limit enforcement:** seed 10 active habits + 1 archived → `PATCH unarchive` on archived → `409` `HABIT_LIMIT_REACHED`; archive one active → `PATCH unarchive` → `200` (frees slot then succeeds)

- [x] Task 4: Client API (AC: #9)
  - [x] In **`client/src/services/habitsApi.ts`**: **`unarchiveHabit(id: string): Promise<Habit>`** → `patch<Habit>(\`/api/habits/${id}/unarchive\`)`

- [x] Task 5: UI — dropdown + unarchive flow (AC: #9–#12)
  - [x] Extend **`HabitSettingsDropdown`** props: add optional **`onUnarchive?: () => void`**; render **Unarchive** `menuitem` when provided (non-destructive action, use normal text color — not red like Archive)
  - [x] **`HabitCalendarPage`**: when `habit.isArchived === true`, **re-show** `HabitSettingsDropdown` with **only** `onUnarchive` (no `onEdit`, no `onArchive`) — replace the current `{habit && !habit.isArchived && ...}` guard
  - [x] `handleUnarchive`: call `unarchiveHabit(id)` → `navigate('/habits', { replace: true })` on success; on `ApiError` with code `HABIT_LIMIT_REACHED` show limit message; on other errors show generic connection error — match existing error patterns
  - [x] **No confirmation dialog** needed (non-destructive)

- [x] Task 6: Client tests
  - [x] **`HabitCalendarPage.test.tsx`**: mock archived habit → assert Unarchive button visible, Edit/Archive absent; click Unarchive → mock `unarchiveHabit` → assert `navigate('/habits')`; mock `409` → assert limit error shown
  - [x] Update any existing tests that assert dropdown is hidden for archived habits — it now shows with Unarchive only

- [x] Task 7: Verify
  - [x] `npm run lint`, `npm test`, client + server builds

## Dev Notes

### Story scope

- **In scope:** `PATCH /api/habits/:id/unarchive`, limit enforcement, `HabitSettingsDropdown` Unarchive action on archived calendar page.
- **Out of scope:** Delete (E3-S7), calendar grid (E4), stats (E5).

### Previous story intelligence (3.5)

- **`HabitCalendarPage`** currently hides `HabitSettingsDropdown` entirely when `habit.isArchived` (story 3.5 decided "prefer hiding until E3-S6 adds Unarchive") — this story **reverses** that: show dropdown for archived with `onUnarchive` only
- **`HabitSettingsDropdown`** has `onEdit` (required) + `onArchive` (optional) — adding `onUnarchive` (optional) means `onEdit` should also become optional so the dropdown can render with only Unarchive for archived habits
- **`archiveHabit` service** is the symmetrical reference for `unarchiveHabit` — same ownership check, idempotent pattern, `habitSelectFields`, `formatCalendarDate`
- **Story 3.4 completion notes** confirm the limit-frees-slot test pattern: seed 10 active → `409` → archive one → `201`; mirror for unarchive: seed 10 active + 1 archived → `409` on unarchive → archive one active → unarchive succeeds

### Architecture compliance

- **Endpoint:** [Source: `_bmad-output/architecture.md` §5 — `PATCH /api/habits/:id/unarchive`]
- **Unarchive validation:** enforce ≤10 active before allowing — [Source: Architecture §5]

### Product references

- **FR8a** — unarchive returns habit to active view, subject to 10-habit limit
- **FR11** — 10 active habit cap
- **E3-S6** — [Source: `_bmad-output/epics-and-stories.md`]

### File structure (expected touches)

| Area | Files |
|------|--------|
| Server | `server/src/services/habit.service.ts`, `server/src/routes/habit.routes.ts`, `server/src/__tests__/habits.unarchive.test.ts` (new) |
| Client | `client/src/services/habitsApi.ts`, `client/src/components/HabitSettingsDropdown.tsx`, `client/src/pages/HabitCalendarPage.tsx`, tests |

### Critical implementation guardrails

1. **`HabitSettingsDropdown` `onEdit` must become optional** — currently required in the `Props` interface; archived habits will pass only `onUnarchive`, not `onEdit`
2. **Limit check must count before update** — check `isArchived: false` count, not after toggling the flag
3. **Reuse `HABIT_LIMIT_REACHED` code exactly** so the client can match it for the error message (same as `createHabit`)

### Latest tech notes

- No dependency upgrades needed.

### Project context

- No `project-context.md` in repo — rely on this story + architecture + prior habit stories.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- No blocking issues. All tests passed on first run.

### Completion Notes List

- Added `unarchiveHabit` service function mirroring `archiveHabit` — ownership check, idempotent (returns 200 if already active), active habit limit enforcement (counts before update), same `HABIT_LIMIT_REACHED` error code/message as `createHabit`
- Added `PATCH /:id/unarchive` route alongside existing `/:id/archive`
- 8 server integration tests covering: success, idempotency, list membership, 404 wrong user/UUID, 401, 409 limit enforcement, and free-slot-then-succeed pattern
- Added `unarchiveHabit` client API helper
- Made `HabitSettingsDropdown.onEdit` optional (was required) so archived habits can render with only `onUnarchive`
- Added `onUnarchive` optional prop to `HabitSettingsDropdown` — renders "Unarchive" menuitem in normal text color (non-destructive action)
- `HabitCalendarPage` now re-shows `HabitSettingsDropdown` for archived habits with only `onUnarchive` (reversing S3.5's decision to hide entirely)
- `handleUnarchive` calls API, navigates to `/habits` on success, shows `HABIT_LIMIT_REACHED` message or generic error on failure — no confirmation dialog needed
- Updated 2 pre-existing tests that asserted dropdown was hidden for archived habits — now assert Unarchive is visible and Edit/Archive are absent
- Added 4 new client tests: successful unarchive + navigation, limit error, network error, Unarchive not shown for active habit
- Used CSS `first:rounded-t-lg last:rounded-b-lg` for dynamic menu item border radius

### Change Log

- `server/src/services/habit.service.ts` — added `unarchiveHabit` function
- `server/src/routes/habit.routes.ts` — added `PATCH /:id/unarchive` route, imported `unarchiveHabit`
- `server/src/__tests__/habits.unarchive.test.ts` — new test file (8 tests)
- `client/src/services/habitsApi.ts` — added `unarchiveHabit` helper
- `client/src/components/HabitSettingsDropdown.tsx` — made `onEdit` optional, added `onUnarchive` prop, refactored menu items with conditional rendering
- `client/src/pages/HabitCalendarPage.tsx` — added `handleUnarchive`, re-show dropdown for archived with `onUnarchive` only
- `client/src/pages/HabitCalendarPage.test.tsx` — updated 2 existing tests, added 4 new unarchive tests, added `unarchiveHabit` to mock

### File List

| File | Action |
|------|--------|
| `server/src/services/habit.service.ts` | Modified |
| `server/src/routes/habit.routes.ts` | Modified |
| `server/src/__tests__/habits.unarchive.test.ts` | Created |
| `client/src/services/habitsApi.ts` | Modified |
| `client/src/components/HabitSettingsDropdown.tsx` | Modified |
| `client/src/pages/HabitCalendarPage.tsx` | Modified |
| `client/src/pages/HabitCalendarPage.test.tsx` | Modified |

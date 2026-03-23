# Story 3.7: Delete a Habit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to permanently delete a habit and all its data,
so that I can remove test habits or ones I no longer want any record of.

## Acceptance Criteria

1. **`DELETE /api/habits/:id`** permanently removes the habit **and all associated `day_entries`** for the authenticated user (Prisma `onDelete: Cascade` on the `Habit → DayEntry` relation handles this automatically)
2. Returns **`200`** with **`{ deleted: true }`** (or `204` No Content — pick one and document; `200` with a body is easier for clients to assert)
3. **Ownership:** only the owning user may delete — **`404`** `NOT_FOUND` if the habit does not exist or belongs to another user (same pattern as all other habit endpoints) — **NFR9**
4. **Both active and archived** habits can be deleted — do not check `isArchived`
5. **`401`** without auth
6. **No request body** required
7. **Frontend confirmation dialog** with the habit name: **"Permanently delete '{name}'? This cannot be undone."**
8. **User must type the habit name** to confirm — prevents accidental deletion of the wrong habit (epics AC); the **Confirm** button is disabled until the typed text matches the habit name exactly
9. Delete action accessible from **both** the **active habit calendar** (`HabitCalendarPage` when `!isArchived`) and the **archived habit view** (`HabitCalendarPage` when `isArchived`)
10. After deletion, **`navigate('/habits', { replace: true })`** (or `/habits/archived` if the habit was archived — either is acceptable; prefer `/habits` for simplicity)
11. On API error, the modal stays open and shows the error inline (same pattern as `EditHabitModal` / future `ConfirmModal`)
12. Delete button uses **destructive styling** (red) to signal permanent action

## Tasks / Subtasks

- [x] Task 1: Service — `deleteHabit` (AC: #1–#6)
  - [x] Add **`deleteHabit(userId: string, habitId: string)`** in `server/src/services/habit.service.ts`
  - [x] **`findFirst`** where `{ id: habitId, userId }` — missing → `AppError(404, 'NOT_FOUND', 'Habit not found')`
  - [x] **`prisma.habit.delete({ where: { id: habitId } })`** — Prisma cascade deletes associated `day_entries` via schema relation (`onDelete: Cascade` on `DayEntry.habit`)
  - [x] Return `{ deleted: true }` (no need to serialize the habit — it's gone)

- [x] Task 2: Route (AC: #1, #5)
  - [x] **`router.delete('/:id', ...)`** in `server/src/routes/habit.routes.ts`
  - [x] Parse **`req.params.id`** with **`habitIdParam`**
  - [x] Call `deleteHabit(res.locals.userId, id)`, `res.json(result)`

- [x] Task 3: Server integration tests (AC: #1–#6)
  - [x] New **`server/src/__tests__/habits.delete.test.ts`**: auth + isolated user + habits
  - [x] **`DELETE`** success → `200`; subsequent `GET /api/habits/:id` → `404` (habit gone)
  - [x] **Cascade:** create habit + day_entries seed → delete habit → verify `day_entries` are also gone (query DB directly)
  - [x] **Active + archived:** delete both an active and an archived habit successfully
  - [x] **`404`** wrong user / random UUID; **`401`** no token
  - [x] **Freeing a slot:** seed 10 active habits → delete one → `POST /api/habits` succeeds with `201`

- [x] Task 4: Client API (AC: #1)
  - [x] In **`client/src/services/habitsApi.ts`**: **`deleteHabit(id: string): Promise<{ deleted: boolean }>`** → `del<{ deleted: boolean }>(\`/api/habits/${id}\`)` (use existing `del` from `api.ts`)

- [x] Task 5: `DeleteHabitModal` component (AC: #7–#8, #11–#12)
  - [x] New **`client/src/components/DeleteHabitModal.tsx`**
  - [x] Props: `habit: Habit`, `onClose: () => void`, `onDeleted: () => void`
  - [x] Match app modal shell: `fixed inset-0 bg-black/40`, centered card, `role="dialog"`, `aria-modal`, Escape + backdrop close
  - [x] Content: warning headline **"Permanently delete '{name}'?"**, explanatory text **"This will remove the habit and all its tracking data. This cannot be undone."**
  - [x] **Text input** for name confirmation: label **"Type the habit name to confirm"**, compare `inputValue.trim()` to `habit.name` (case-sensitive)
  - [x] **Delete** button: disabled until input matches; red/destructive styling (`bg-red-500 hover:bg-red-600 text-white` or `bg-red-600`); shows loading state during API call
  - [x] **Cancel** button: neutral styling
  - [x] On success: call `onDeleted()` callback
  - [x] On error: show inline error in modal (same pattern as `EditHabitModal`)

- [x] Task 6: Wire into `HabitCalendarPage` (AC: #9–#10)
  - [x] Add **Delete** action to `HabitSettingsDropdown` for **both active and archived** habits — new optional prop `onDelete?: () => void`; styled red like Archive
  - [x] `HabitCalendarPage`: add `showDeleteModal` state; wire `onDelete` → open `DeleteHabitModal`; `onDeleted` → `navigate('/habits', { replace: true })`
  - [x] **Active habits:** dropdown shows Edit, Archive, Delete
  - [x] **Archived habits:** dropdown shows Unarchive, Delete

- [x] Task 7: Client tests
  - [x] **`DeleteHabitModal.test.tsx`**: renders warning with habit name, Delete disabled until name typed, enabled after match, success calls `onDeleted`, error displayed inline, Escape/backdrop closes
  - [x] **`HabitCalendarPage.test.tsx`**: Delete option visible for active and archived habits; click opens modal; successful delete navigates to `/habits`

- [x] Task 8: Verify
  - [x] `npm run lint`, `npm test`, client + server builds

## Dev Notes

### Story scope

- **In scope:** `DELETE /api/habits/:id`, type-to-confirm `DeleteHabitModal`, dropdown integration on calendar page for both active and archived.
- **Out of scope:** Delete from the habit list card (E3-S8 handles card-level actions and may add a delete button there). Calendar grid (E4), stats (E5).

### Previous story intelligence (3.6)

- **`HabitSettingsDropdown`** has `onEdit?`, `onArchive?`, `onUnarchive?` — add `onDelete?`; uses `first:rounded-t-lg last:rounded-b-lg` for dynamic border radius on menu items
- **`HabitCalendarPage`** renders two `HabitSettingsDropdown` instances: one for active (`onEdit` + `onArchive`), one for archived (`onUnarchive`) — add `onDelete` to **both**
- **`habitsApi.ts`** has `get`, `put`, `patch` imports from `api.ts` — need to add `del` import for `deleteHabit`
- **Modal patterns:** `EditHabitModal` and `CreateHabitModal` — follow the same shell (backdrop, centering, Escape, error handling, loading state)
- **Cascade is schema-level:** `DayEntry` has `onDelete: Cascade` on the `habit` relation — Prisma handles this; no manual day_entries deletion needed

### Architecture compliance

- **Endpoint:** [Source: `_bmad-output/architecture.md` §5 — `DELETE /api/habits/:id`]
- **Cascade:** [Source: `server/prisma/schema.prisma` — `Habit` → `DayEntry` `onDelete: Cascade`]

### Product references

- **FR8b** — permanently delete a habit and all associated data, with confirmation step
- **E3-S7** — [Source: `_bmad-output/epics-and-stories.md`]

### File structure (expected touches)

| Area | Files |
|------|--------|
| Server | `server/src/services/habit.service.ts`, `server/src/routes/habit.routes.ts`, `server/src/__tests__/habits.delete.test.ts` (new) |
| Client | `client/src/services/habitsApi.ts`, `client/src/components/DeleteHabitModal.tsx` (new), `client/src/components/HabitSettingsDropdown.tsx`, `client/src/pages/HabitCalendarPage.tsx`, tests |

### Critical implementation guardrails

1. **Type-to-confirm must be case-sensitive** — `"Morning run"` ≠ `"morning run"`; this is the epics requirement and prevents accidental deletions
2. **Do not** soft-delete — this is a permanent `DELETE` with cascade; the whole point is irreversible removal
3. **Both active and archived** habits are deletable — do not gate on `isArchived`
4. **`del`** helper already exists in `api.ts` — import it in `habitsApi.ts`

### Interaction with E3-S8

Story 3-8 (Habit Card Actions & Confirm Modal) creates a `ConfirmModal` and adds action buttons to `HabitCard`. If 3-8 is implemented first, `DeleteHabitModal` can potentially reuse `ConfirmModal` as a base — but `DeleteHabitModal` has the extra **type-to-confirm** input, so it will need its own component regardless. If 3-7 lands first, 3-8 can extract the shared modal shell pattern.

### Latest tech notes

- No dependency upgrades needed.

### Project context

- No `project-context.md` in repo — rely on this story + architecture + prior habit stories.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- No blocking issues. All tests passed on first run across both server and client.

### Completion Notes List

- Added `deleteHabit` service — ownership check then `prisma.habit.delete` (cascade handles `day_entries` automatically via schema `onDelete: Cascade`)
- Returns `{ deleted: true }` (200) per AC #2
- Both active and archived habits can be deleted — no `isArchived` check per AC #4
- `DELETE /api/habits/:id` route added
- 8 server integration tests: success + GET 404 after delete, cascade day_entries removal, active + archived delete, 404 wrong user/UUID, 401, free-slot-then-create pattern
- `deleteHabit` client API helper using `del` from `api.ts`
- `DeleteHabitModal` component with type-to-confirm: user must type exact habit name (case-sensitive) to enable the red Delete button; shows loading state, inline errors on failure, Escape/backdrop close
- Added `onDelete` optional prop to `HabitSettingsDropdown` — red destructive styling, renders last in menu
- `HabitCalendarPage` now passes `onDelete` to **both** active and archived dropdown instances, opens `DeleteHabitModal`, navigates to `/habits` on success
- Active habits dropdown: Edit, Archive, Delete
- Archived habits dropdown: Unarchive, Delete
- 10 new `DeleteHabitModal` tests: warning text, disabled/enabled button, case-sensitivity, success callback, API/network errors, Cancel, Escape, loading state
- 4 new `HabitCalendarPage` tests: Delete visible for active, Delete visible for archived, open modal + type name + navigate on success

### Change Log

- `server/src/services/habit.service.ts` — added `deleteHabit` function
- `server/src/routes/habit.routes.ts` — added `DELETE /:id` route, imported `deleteHabit`
- `server/src/__tests__/habits.delete.test.ts` — new test file (8 tests)
- `client/src/services/habitsApi.ts` — added `deleteHabit` helper, imported `del`
- `client/src/components/DeleteHabitModal.tsx` — new component
- `client/src/components/DeleteHabitModal.test.tsx` — new test file (10 tests)
- `client/src/components/HabitSettingsDropdown.tsx` — added `onDelete` optional prop
- `client/src/pages/HabitCalendarPage.tsx` — added `showDeleteModal` state, wired Delete to both active/archived dropdowns, renders `DeleteHabitModal`
- `client/src/pages/HabitCalendarPage.test.tsx` — added `deleteHabit` to mock, 4 new delete tests

### File List

| File | Action |
|------|--------|
| `server/src/services/habit.service.ts` | Modified |
| `server/src/routes/habit.routes.ts` | Modified |
| `server/src/__tests__/habits.delete.test.ts` | Created |
| `client/src/services/habitsApi.ts` | Modified |
| `client/src/components/DeleteHabitModal.tsx` | Created |
| `client/src/components/DeleteHabitModal.test.tsx` | Created |
| `client/src/components/HabitSettingsDropdown.tsx` | Modified |
| `client/src/pages/HabitCalendarPage.tsx` | Modified |
| `client/src/pages/HabitCalendarPage.test.tsx` | Modified |

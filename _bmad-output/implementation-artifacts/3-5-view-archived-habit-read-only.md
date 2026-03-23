# Story 3.5: View Archived Habit (Read-Only)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to view an archived habit's details in read-only mode,
so that I can look back on my past progress without accidentally modifying anything.

## Acceptance Criteria

1. **`GET /api/habits/:id`** returns habit data even when **`isArchived: true`** (already works — `getHabitById` does not filter by archive status; add a server test to lock this in)
2. **`ArchivedHabitsPage`** renders archived habits as **`ArchivedHabitCard`** components instead of the generic **`HabitCard`** — [Source: Architecture §6 — `ArchivedHabitCard → read-only calendar`]
3. **`ArchivedHabitCard`** visually differentiates from active `HabitCard`: shows an **"Archived"** badge/label and distinct styling (e.g. muted color, subtle border change) so the user knows at a glance these are inactive
4. Clicking an **`ArchivedHabitCard`** navigates to **`/habits/:id`** (same `HabitCalendarPage`)
5. When **`HabitCalendarPage`** loads an **archived** habit (`isArchived: true`), it enters **read-only mode**:
   - Prominent **visual indicator** that the habit is archived (banner, badge, or label near the name)
   - **`HabitSettingsDropdown`** does **not** show **Edit** or **Archive** actions (no `onEdit`, no `onArchive` — those props must be omitted or undefined)
   - **No edit, mark/unmark, or re-archive** capabilities available (this story sets the contract; calendar grid from E4 and stats from E5 will respect `isArchived` when they arrive)
   - **"Back to archived"** link instead of (or in addition to) **"Back to habits"** when navigating from the archived list — or simply always show **"Back to habits"** with a consistent link (decide based on simplest UX)
6. **`HabitSettingsDropdown`** should render **nothing** (or hide the trigger entirely) when neither `onEdit` nor `onArchive` are provided, since it would be an empty menu for archived habits — alternatively keep the trigger for future **Unarchive** (E3-S6) and **Delete** (E3-S7) that will be added later; prefer the **keep-trigger, show empty menu placeholder** approach so the dropdown mount point is ready
7. Statistics and calendar grid are **not** part of this story — **Epic 4** builds the calendar grid, **Epic 5** builds the stats panel. This story ensures the **read-only mode infrastructure** is in place so E4/E5 can check `habit.isArchived` to disable interactive features.
8. **`401`** without auth (existing middleware — no change needed)

## Tasks / Subtasks

- [x] Task 1: Server test — verify GET /:id works for archived habits (AC: #1)
  - [x] In **`server/src/__tests__/habits.detail-update.test.ts`** (or a new file): create a habit, archive it via `prisma.habit.update`, then `GET /api/habits/:id` → assert `200` with `isArchived: true` and correct fields
  - [x] No service changes expected — `getHabitById` already works; this test cements the contract

- [x] Task 2: `ArchivedHabitCard` component (AC: #2–#4)
  - [x] New **`client/src/components/ArchivedHabitCard.tsx`**: props `habit: Habit`
  - [x] Render habit name as a **`Link`** to `/habits/${habit.id}` (same navigation as `HabitCard`) with a11y label including "archived"
  - [x] Show **"Archived"** badge: small pill/tag near the name (e.g. `<span className="...">Archived</span>`) in muted/gray styling
  - [x] Visual distinction from active `HabitCard`: muted text color, lighter border, or slight opacity change — keep subtle, not heavy-handed
  - [x] Show `description` (optional) and `startDate` like `HabitCard`

- [x] Task 3: Wire `ArchivedHabitsPage` to use `ArchivedHabitCard` (AC: #2)
  - [x] Replace `<HabitCard key={habit.id} habit={habit} />` with `<ArchivedHabitCard key={habit.id} habit={habit} />` in **`client/src/pages/ArchivedHabitsPage.tsx`**
  - [x] Import `ArchivedHabitCard` instead of (or alongside) `HabitCard`

- [x] Task 4: `HabitCalendarPage` — archived read-only mode (AC: #5–#6)
  - [x] When **`habit.isArchived === true`**: do **not** pass `onEdit` or `onArchive` to `HabitSettingsDropdown` (already partially done for `onArchive`; also omit `onEdit`)
  - [x] Show an **archived indicator** near the habit name in the header — e.g. `<span className="...">Archived</span>` pill next to `<h1>` or below it
  - [x] Optionally hide `HabitSettingsDropdown` entirely for archived habits (since no actions available yet — E3-S6/S7 will re-add) **or** keep the trigger but render empty menu with a placeholder like "No actions available" — **prefer hiding** until E3-S6 adds Unarchive
  - [x] Calendar placeholder area: no changes needed (E4 will build the grid); the existing "Calendar coming next" placeholder is fine

- [x] Task 5: Client tests (AC: #2–#6)
  - [x] **`ArchivedHabitCard.test.tsx`** (or inline in `ArchivedHabitsPage.test.tsx`): renders archived badge, link to `/habits/:id`, a11y label
  - [x] Update **`ArchivedHabitsPage.test.tsx`**: assert `ArchivedHabitCard` is rendered (not `HabitCard`)
  - [x] **`HabitCalendarPage.test.tsx`**: mock `fetchHabitById` returning `isArchived: true`; assert no Edit button, no Archive button, archived indicator visible

- [x] Task 6: Verify
  - [x] `npm run lint`, `npm test`, client + server builds

## Dev Notes

### Story scope

- **In scope:** `ArchivedHabitCard`, archived visual indicators on calendar page, hide Edit/Archive for archived habits, server test confirming `GET` works for archived.
- **Out of scope:** Calendar grid (Epic 4), stats panel (Epic 5), Unarchive button (E3-S6), Delete button (E3-S7). This story establishes the **read-only mode contract** that those later stories extend.

### Previous story intelligence (3.4)

- **`archiveHabit`** service + route + `HabitSettingsDropdown` with `onArchive` prop — already conditionally shown via `!habit.isArchived ? handleArchive : undefined` on `HabitCalendarPage`; this story also hides **`onEdit`** for archived habits
- **`ArchivedHabitsPage`** currently uses **`HabitCard`** — replace with **`ArchivedHabitCard`** per Architecture §6
- **`HabitCalendarPage`** loads habit via `fetchHabitById` and renders `HabitSettingsDropdown` only when `habit` is truthy — extend condition to also check `isArchived`
- **`HabitCard`** is a simple `<li>` with `Link` + name + description + startDate — `ArchivedHabitCard` follows the same shape with added badge and muted styling

### Architecture compliance

- **Component hierarchy:** [Source: Architecture §6 — `ArchivedHabitCard → read-only calendar`]
- **`GET /api/habits/:id`** returns data regardless of archive status — [Source: Architecture §5]
- **FR12** — view archived habit calendar and statistics read-only [Source: `_bmad-output/prd.md`]

### Product references

- **FR12** — archived habit read-only view
- **FR8** — archive preserves historical data
- **E3-S5** — [Source: `_bmad-output/epics-and-stories.md`]

### Git intelligence (recent commits)

- `feat(habits): archive habit endpoint + UI, post-review fixes` — patterns: `window.confirm`, conditional props on `HabitSettingsDropdown`, `navigate('/habits', { replace: true })`

### File structure (expected touches)

| Area | Files |
|------|--------|
| Server | `server/src/__tests__/habits.detail-update.test.ts` (or new test file) |
| Client | `client/src/components/ArchivedHabitCard.tsx` (new), `client/src/pages/ArchivedHabitsPage.tsx`, `client/src/pages/HabitCalendarPage.tsx`, tests |

### Critical implementation guardrails

1. **Do not** modify `getHabitById` to filter archived habits out — it must return data regardless of archive status
2. **Do not** add Unarchive or Delete actions — those belong to **E3-S6** and **E3-S7** respectively
3. **Do not** build calendar grid or stats — just ensure the `isArchived` flag is accessible in state so E4/E5 can use it
4. **Styling** for `ArchivedHabitCard` should be **subtle** differentiation (muted colors, badge), not drastically different from `HabitCard` — the archived list itself provides context

### Latest tech notes

- No dependency upgrades needed.

### Project context

- No `project-context.md` in repo — rely on this story + architecture + prior habit stories.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (via Cursor)

### Debug Log References

- Pre-existing test "does not show Archive option for already-archived habit" broke because the settings dropdown is now entirely hidden for archived habits (not just the Archive menu item). Updated test to assert the settings button itself is absent.

### Completion Notes List

- Server `getHabitById` already returns archived habits — added server integration test to cement the contract (archives and re-unarchives the test habit to avoid side-effects)
- Created `ArchivedHabitCard` component with "Archived" badge, muted styling (`opacity-80`, `text-muted`), and a11y label `"View archived habit {name}"`
- Replaced `HabitCard` with `ArchivedHabitCard` in `ArchivedHabitsPage`
- `HabitCalendarPage` now hides `HabitSettingsDropdown` entirely when `habit.isArchived` (no Edit, no Archive) and shows "Archived" badge pill next to the habit name
- Decided to hide dropdown entirely for archived habits per AC #6 preference ("prefer hiding until E3-S6 adds Unarchive")
- Updated pre-existing test that expected to find settings button for archived habit — changed to assert button is absent
- Added 5 new `ArchivedHabitCard` unit tests and 3 new `HabitCalendarPage` tests for archived read-only mode

### Change Log

- `server/src/__tests__/habits.detail-update.test.ts` — added test "returns 200 for an archived habit with isArchived true"
- `client/src/components/ArchivedHabitCard.tsx` — new component
- `client/src/components/ArchivedHabitCard.test.tsx` — new test file (5 tests)
- `client/src/pages/ArchivedHabitsPage.tsx` — swapped `HabitCard` → `ArchivedHabitCard`
- `client/src/pages/ArchivedHabitsPage.test.tsx` — updated link assertion for new a11y label, added Archived badge check
- `client/src/pages/HabitCalendarPage.tsx` — hide dropdown for archived, show Archived badge
- `client/src/pages/HabitCalendarPage.test.tsx` — updated pre-existing archive test, added 3 new archived read-only tests

### File List

| File | Action |
|------|--------|
| `server/src/__tests__/habits.detail-update.test.ts` | Modified |
| `client/src/components/ArchivedHabitCard.tsx` | Created |
| `client/src/components/ArchivedHabitCard.test.tsx` | Created |
| `client/src/pages/ArchivedHabitsPage.tsx` | Modified |
| `client/src/pages/ArchivedHabitsPage.test.tsx` | Modified |
| `client/src/pages/HabitCalendarPage.tsx` | Modified |
| `client/src/pages/HabitCalendarPage.test.tsx` | Modified |

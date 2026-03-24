# Story 4.6: Habit Switching on Calendar

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to switch between habits while viewing the calendar,
so that I can check on each habit without returning to the list.

## Acceptance Criteria

1. `HabitCalendarPage` at `/habits/:id` loads the selected habit's calendar
2. Navigation back to habit list is easily accessible
3. Switching habits via the list reloads the calendar with the new habit's data
4. The app preserves the user's last-viewed habit context within a session (FR32)
5. URL reflects the currently viewed habit

## Tasks / Subtasks

- [x] Task 1: Reset calendar state when habit ID changes (AC: #3)
  - [x] Add a `useEffect` in `HabitCalendarPage` that runs when `id` (from `useParams`) changes
  - [x] Reset `calYear` and `calMonth` to the current date (fresh `new Date()`)
  - [x] Clear `pendingDates` to an empty `Set`
  - [x] Clear `toastMessage` and `undoToastMessage` to `null`
  - [x] This ensures switching from `/habits/abc` to `/habits/def` gives a clean calendar starting at the current month

- [x] Task 2: Commit pending undo on habit switch (AC: #3)
  - [x] Add `habitId: string` field to the `UndoState` interface so the pending unmark tracks which habit it belongs to
  - [x] In `handleUnmark`: store `habitId: id!` in the undo state
  - [x] In the reset `useEffect` (from Task 1): if `undoStateRef.current` is non-null, clear the timer and fire a fire-and-forget `deleteEntry(undoState.habitId, undoState.dateStr)` for the OLD habit, then null the ref
  - [x] This prevents orphaned undo timers from the previous habit, and ensures the unmark the user initiated is committed rather than silently reverted

- [x] Task 3: Verify existing routing and navigation (AC: #1, #2, #4, #5)
  - [x] Verify `App.tsx` route: `<Route path="/habits/:id" element={<HabitCalendarPage />} />` — already exists
  - [x] Verify `HabitCard` links: `<Link to={`/habits/${habit.id}`}>` — already exist (habit name link + Eye icon link)
  - [x] Verify "Back to habits" link: `<Link to="/habits">` in `HabitCalendarPage` header — already exists
  - [x] Verify that the `useEffect([isAuthenticated, id])` in `HabitCalendarPage` re-fetches the habit when `id` changes — already works
  - [x] Verify that `entriesQueryKey = ['entries', id, monthStr]` changes when `id` changes, causing `useQuery` to refetch entries — already works
  - [x] Verify URL updates when navigating via `HabitCard` links — React Router handles this
  - [x] FR32 (session context): The URL `/habits/:id` preserves which habit the user is viewing. React Query caches previously fetched entry data (5-min `staleTime`), providing instant re-display when returning to a habit.

- [x] Task 4: Tests (AC: #1, #3, #5)
  - [x] Update `client/src/pages/HabitCalendarPage.test.tsx`:
  - [x] Test: switching habit ID resets calendar to current month — render with habit A (navigate to a past month), then re-render with habit B's ID, verify `fetchEntries` is called with the current month string for habit B
  - [x] Test: switching habit ID clears undo toast — render with habit A, trigger unmark (undo toast showing), switch to habit B, verify undo toast is gone
  - [x] Test: switching habit ID loads the new habit's name and data — mock `fetchHabitById` to return habit B on second call, verify the header shows habit B's name

- [x] Task 5: Verify
  - [x] `npm run lint` and `npm test` pass in client
  - [x] Client build succeeds

## Dev Notes

### Story scope

- **In scope:** Reset calendar state (month, pending dates, toasts, undo) on habit ID change. Commit pending undo for the old habit on switch. Tests for the switching flow.
- **Out of scope:** Adding a habit selector/dropdown on the calendar page itself — the switching mechanism is the habit list (navigate back → pick a different habit). DayCell visual states refinement (E4-S7). Persistent "last viewed habit" storage beyond URL-based routing.
- **Mostly verification:** The routing (`/habits/:id`), habit list links (`HabitCard`), "Back to habits" link, and data-fetching reactivity already work. The main NEW code is the state-reset `useEffect` and undo commitment on switch.
- **Frontend-only story:** No server modifications needed.

### What already works (verification checklist)

All of these are already implemented and just need verification, not new code:

1. **Route exists:** `<Route path="/habits/:id" element={<HabitCalendarPage />} />` in `App.tsx` (line 28)
2. **HabitCard navigates:** `<Link to={`/habits/${habit.id}`}>` in `HabitCard.tsx` (lines 17, 30)
3. **Back link exists:** `<Link to="/habits">` in `HabitCalendarPage.tsx` header (line 304)
4. **Habit fetch reacts to ID change:** `useEffect([isAuthenticated, id])` fetches `fetchHabitById(id!)` (line 59-92)
5. **Entries refetch on ID change:** `entriesQueryKey = ['entries', id, monthStr]` — when `id` changes, React Query auto-refetches (lines 51, 102-109)
6. **URL reflects habit:** React Router keeps `/habits/:id` in sync with the rendered component

### What needs to be built

1. **Reset `useEffect`:** When `id` changes, reset `calYear`/`calMonth` to current month, clear `pendingDates`, clear toasts. Without this, switching from habit A (viewing January) to habit B would show habit B's January calendar instead of the current month.

2. **Undo commitment:** If the user has a pending unmark (undo toast showing) for habit A and switches to habit B, the unmark must be committed for habit A. The `UndoState` interface needs a `habitId` field so the reset effect can fire `deleteEntry(oldHabitId, dateStr)`.

### Existing code to build on

**`HabitCalendarPage.tsx` (current state after E4-S5):**
- `const { id } = useParams<{ id: string }>()` — the habit ID from the URL, changes on navigation
- `const [calYear, setCalYear] = useState(now.getFullYear())` — mutable after E4-S5
- `const [calMonth, setCalMonth] = useState(now.getMonth() + 1)` — mutable after E4-S5
- `commitPendingUndo` — commits the undo for the CURRENT habit. Cannot be used for habit switching because by the time the reset `useEffect` runs, `id` has already changed. Must use `undoStateRef.current.habitId` + direct `deleteEntry` call instead.
- `deleteEntry` import from `habitsApi` — can be called directly for fire-and-forget on habit switch
- `UndoState` interface: `{ dateStr, timerId, previousEntries }` — needs `habitId: string` added

**`App.tsx`:**
- Routes are already defined. No changes needed.

**`HabitCard.tsx`:**
- Links to `/habits/${habit.id}`. No changes needed.

**`habitsApi.ts`:**
- `deleteEntry(habitId, date)` is a standalone function, can be called directly without hooks.

### Architecture compliance

- **Route Structure** per Architecture §6: `/habits/:id` → `HabitCalendarPage`. Already implemented.
- **Component Hierarchy** per Architecture §6: `HabitListPage > HabitCard` links to `HabitCalendarPage`. Already implemented.
- **State Management** per Architecture §6: "UI state: Component-local `useState` for modals, form inputs, selected month." The reset on habit change keeps state local and correctly scoped.
- **FR32** (session context): Satisfied by URL-based routing (`/habits/:id`) and React Query's 5-minute cache. The user can navigate back to a habit and see cached data instantly.

### Critical implementation guardrails

1. **Do NOT use `commitPendingUndo` in the reset effect.** `commitPendingUndo` calls `fireDelete` which captures the CURRENT `id` via closure. In the reset `useEffect`, `id` is the NEW habit's ID. Instead, read the old habit ID from `undoStateRef.current.habitId` and call `deleteEntry(oldHabitId, dateStr)` directly.
2. **Fire-and-forget DELETE on habit switch.** The user has navigated away from the old habit. There's no UI to show errors. Use `.catch(() => {})` to swallow errors silently. The old habit's entry cache may be stale, but `useQuery` will refetch when the user returns.
3. **Reset effect must NOT conflict with the existing habit-fetch effect.** The habit-fetch `useEffect` also depends on `[isAuthenticated, id]`. Both effects fire on `id` change. The reset effect clears transient state; the fetch effect loads the new habit. These are independent and safe to run in parallel.
4. **`useState` initial values don't reset on re-render with new params.** React Router re-renders the same component instance when only URL params change. `useState(initialValue)` only applies on mount, not on subsequent renders. This is why we need the explicit reset `useEffect`.
5. **The `now` variable.** Currently `const now = new Date()` is computed on every render (line 46). In the reset `useEffect`, use a fresh `new Date()` inside the effect body to get the accurate current date, not the `now` from the render closure.
6. **Don't store month per-habit.** The AC says "preserves the user's last-viewed habit context within a session," which is satisfied by URL routing. Caching which month the user was viewing per-habit is over-engineering for this story.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (modified) | `client/src/pages/HabitCalendarPage.tsx`, `client/src/pages/HabitCalendarPage.test.tsx` |

### Previous story intelligence

From story 4-5 (Month Navigation):
- `calYear`/`calMonth` now have setters. The reset effect calls `setCalYear`/`setCalMonth` to return to current month.
- `commitPendingUndo` was added for month navigation. It calls `fireDelete` which uses the current `id`. For HABIT switching, this is unsafe because `id` has changed. Use the stored `habitId` from `undoStateRef` instead.
- `isCurrentMonth` is derived from `calYear`/`calMonth` vs `now`. After reset, it will be `true` again (current month). The next button will be disabled.

From story 4-4 (Tap-to-Unmark):
- `undoStateRef` stores `{ dateStr, timerId, previousEntries }`. The `previousEntries` snapshot is for the old habit's entries query. On habit switch, we don't need to rollback (the user is committing the unmark), so `previousEntries` is irrelevant — just clear the ref after firing DELETE.
- The unmount cleanup `useEffect` (line 94-100) clears the timer on component unmount. This is a safety net for full navigation away (e.g., to `/settings`). For same-component re-renders (habit switch), the reset `useEffect` handles cleanup instead.

From story 4-3 (Tap-to-Mark):
- `markMutation` callbacks capture `entriesQueryKey`. An in-flight mark mutation for the old habit will use the old `entriesQueryKey` for `onSettled` invalidation. After habit switch, the key points to the new habit, so the old habit's cache won't be invalidated. This is a known minor issue — acceptable because the server write succeeds and the old cache refreshes on next visit.

### Key implementation pattern

**Modified `UndoState` interface:**
```typescript
interface UndoState {
  habitId: string;
  dateStr: string;
  timerId: ReturnType<typeof setTimeout>;
  previousEntries: Set<string> | undefined;
}
```

**Reset effect:**
```typescript
useEffect(() => {
  // Commit pending undo for the PREVIOUS habit
  if (undoStateRef.current) {
    const { timerId, dateStr, habitId: oldHabitId } = undoStateRef.current;
    clearTimeout(timerId);
    undoStateRef.current = null;
    deleteEntry(oldHabitId, dateStr).catch(() => {});
  }

  // Reset calendar to current month
  const current = new Date();
  setCalYear(current.getFullYear());
  setCalMonth(current.getMonth() + 1);

  // Clear transient state
  setPendingDates(new Set());
  setToastMessage(null);
  setUndoToastMessage(null);
}, [id]);
```

**Updated `handleUnmark` — store habitId:**
```typescript
undoStateRef.current = { habitId: id!, dateStr, timerId, previousEntries: snapshot };
```

### Git intelligence

Recent commits: `feat(calendar): month navigation with a11y and story closure (E4-S5)`. Continue with `feat(calendar):` prefix.

### References

- [Source: architecture.md §6 — Route Structure (/habits/:id), Component Hierarchy, State Management]
- [Source: epics-and-stories.md — E4-S6 acceptance criteria, FR20, FR32]
- [Source: prd.md — FR20 (switch between habits), FR32 (session context)]

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Implemented `useEffect([id])` to reset calendar month to today, clear pending dates and toasts, and commit any pending unmark via `deleteEntry(oldHabitId, dateStr)` using `UndoState.habitId` (not `commitPendingUndo`, which would use the new route param).
- Extended `UndoState` with `habitId`; `handleUnmark` stores it; added `id` to `handleUnmark` hook deps for exhaustive-deps.
- Added `renderCalendarWithRouter` plus three tests: month reset + `fetchEntries` for habit B’s current month, undo toast cleared + `deleteEntry` for previous habit, header shows new habit name after navigation (`createMemoryRouter` / `RouterProvider`).
- Task 3 verification: confirmed existing routes, `HabitCard` links, back link, habit/entries refetch on `id`, URL as source of truth for session context (no code changes).

### Change Log

- 2026-03-24: E4-S6 — habit switch resets calendar state; commit pending undo for previous habit; tests and story closure.

### File List

- client/src/pages/HabitCalendarPage.tsx
- client/src/pages/HabitCalendarPage.test.tsx
- _bmad-output/implementation-artifacts/4-6-habit-switching-on-calendar.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

# Story 4.5: Month Navigation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to navigate between months on the calendar,
so that I can review past months of my habit.

## Acceptance Criteria

1. `MonthNavigator` component shows current month/year label with prev/next arrows
2. Previous month button loads the prior month's calendar and entries
3. Next month button loads the next month (disabled when already at current month)
4. Page transitions between months complete within 300ms (NFR3)
5. Navigating months preserves the selected habit context
6. Month label uses clear format (e.g., "March 2026")

## Tasks / Subtasks

- [x] Task 1: Create `MonthNavigator` component (AC: #1, #3, #6)
  - [x] New `client/src/components/MonthNavigator.tsx`
  - [x] Props: `year: number`, `month: number`, `onPrev: () => void`, `onNext: () => void`, `canGoNext: boolean`
  - [x] Renders: centered row with previous button, month/year label, next button
  - [x] Month label format: full month name + year (e.g., "March 2026") using `new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })`
  - [x] Previous button: `ChevronLeft` icon from `lucide-react`, `aria-label="Previous month"`
  - [x] Next button: `ChevronRight` icon from `lucide-react`, `aria-label="Next month"`
  - [x] Next button disabled when `canGoNext` is `false`: native `disabled` (excluded from tab order, no activation), visually muted (`text-muted opacity-50 cursor-default` via Tailwind `disabled:` variants)
  - [x] Button styling: `p-2 rounded-lg hover:bg-gray-100 transition text-text-secondary` (matching project design language)
  - [x] Layout: `flex items-center justify-center gap-4 mb-4`

- [x] Task 2: Make `calYear`/`calMonth` navigable in `HabitCalendarPage` (AC: #2, #3, #4, #5)
  - [x] Change `const [calYear] = useState(...)` to `const [calYear, setCalYear] = useState(...)`
  - [x] Change `const [calMonth] = useState(...)` to `const [calMonth, setCalMonth] = useState(...)`
  - [x] Compute `isCurrentMonth`: `calYear === now.getFullYear() && calMonth === now.getMonth() + 1`
  - [x] Add `goToPrevMonth()`
  - [x] Add `goToNextMonth()`
  - [x] Guard: `goToNextMonth` is a no-op when already at current month

- [x] Task 3: Commit pending undo state on month navigation (AC: #4)
  - [x] In `goToPrevMonth` and `goToNextMonth`: if `undoStateRef.current` is non-null, commit the pending unmark immediately (clear timer, fire DELETE) before changing month
  - [x] This prevents stale closure issues where the undo timer fires after the `entriesQueryKey` has changed to a different month

- [x] Task 4: Render `MonthNavigator` in `HabitCalendarPage` (AC: #1, #2, #3)
  - [x] Place `<MonthNavigator>` above `<CalendarGrid>` inside the loaded-habit section
  - [x] Props: `year={calYear}`, `month={calMonth}`, `onPrev={goToPrevMonth}`, `onNext={goToNextMonth}`, `canGoNext={!isCurrentMonth}`

- [x] Task 5: Verify `useQuery` auto-refetches on month change (AC: #2, #4)
  - [x] The `entriesQueryKey` is already `useMemo(() => ['entries', id, monthStr], [id, monthStr])`
  - [x] When `calYear`/`calMonth` change → `monthStr` changes → `entriesQueryKey` changes → `useQuery` automatically fires a new fetch for the new month
  - [x] No additional fetch wiring needed — verified via tests
  - [x] Previously visited months are served from react-query cache (`staleTime: 5 * 60 * 1000` = 5 min) for instant navigation back

- [x] Task 6: MonthNavigator tests (AC: #1, #3, #6)
  - [x] New `client/src/components/MonthNavigator.test.tsx`
  - [x] Test: renders month/year label in "Month YYYY" format
  - [x] Test: previous button has correct aria-label and calls `onPrev` when clicked
  - [x] Test: next button has correct aria-label and calls `onNext` when clicked
  - [x] Test: next button is `disabled` and does NOT call `onNext` when `canGoNext` is false
  - [x] Test: label updates when props change (e.g., different month/year)

- [x] Task 7: HabitCalendarPage navigation tests (AC: #2, #3, #5)
  - [x] Update `client/src/pages/HabitCalendarPage.test.tsx`:
  - [x] Test: MonthNavigator is rendered with current month label when habit loads
  - [x] Test: clicking previous month changes the calendar grid (verify `fetchEntries` is called with the previous month string)
  - [x] Test: clicking next month button does nothing when already at current month (next is disabled)
  - [x] Test: navigating to a different month and back preserves the habit name (context preserved)

- [x] Task 8: Verify
  - [x] `npm run lint` and `npm test` pass in client
  - [x] Client build succeeds

## Dev Notes

### Story scope

- **In scope:** New `MonthNavigator` component, making `calYear`/`calMonth` navigable, committing pending undo on month change, auto-refetch via react-query, tests.
- **Out of scope:** Habit switching (E4-S6), DayCell visual states refinement (E4-S7). No backend changes — the `GET /api/habits/:id/entries?month=YYYY-MM` endpoint already supports arbitrary months.
- **Frontend-only story:** No server modifications needed.

### Existing code to build on

**`HabitCalendarPage.tsx` (current state after E4-S4):**
- `calYear`/`calMonth` are currently `useState` with no setters: `const [calYear] = useState(now.getFullYear())` and `const [calMonth] = useState(now.getMonth() + 1)`. This was by design — E4-S1 explicitly said "Do NOT add month navigation — E4-S5 handles that."
- `monthStr` is derived: `` `${calYear}-${String(calMonth).padStart(2, '0')}` ``
- `entriesQueryKey` is `useMemo(() => ['entries', id, monthStr], [id, monthStr])` — changing `monthStr` automatically triggers a new `useQuery` fetch. This is the key architectural enabler for month navigation. No additional fetch wiring is needed.
- `undoStateRef` holds pending unmark state with a 3-second timer. Must be committed on month change.
- `now` is computed once as `const now = new Date()` at render time (line 45).

**`CalendarGrid.tsx`:**
- Already accepts `year` and `month` as props and rebuilds the grid via `useMemo`. When these props change, the grid re-renders with the new month's days and leading blanks. No changes needed.

**`useQuery` cache behavior:**
- `QueryClient` in `main.tsx` is configured with `staleTime: 5 * 60 * 1000` (5 minutes). When the user navigates to March, the entries are fetched and cached under `['entries', id, '2026-03']`. If the user goes to April and back to March within 5 minutes, the March data is served instantly from cache. This gives excellent perceived performance for month navigation.

**`lucide-react`:**
- Already a project dependency (used for `Check` icon in `DayCell`). Use `ChevronLeft` and `ChevronRight` for navigation arrows.

### Architecture compliance

- **Component Hierarchy** per Architecture §6: `HabitCalendarPage > MonthNavigator (prev/next month) > CalendarGrid > DayCell`. MonthNavigator is a direct child of HabitCalendarPage, placed above CalendarGrid.
- **State Management** per Architecture §6: "UI state: Component-local `useState` for modals, form inputs, selected month." The `calYear`/`calMonth` state in HabitCalendarPage follows this pattern.
- **NFR3** per Architecture §10: "Page transitions < 300ms — Client-side routing (no full page reloads)." Month navigation is purely client-side: state change → CalendarGrid re-renders immediately with new month structure → entries load from cache or API. The grid skeleton renders instantly; entry data may take a server round-trip but the layout is immediate.

#### AC4 / NFR3 verification (post–code review)

- **Layout transition:** Changing `calYear`/`calMonth` is a synchronous React state update; `CalendarGrid` recomputes from `useMemo` on the same commit, so the visible month chrome and grid structure update within a single frame (well under 300ms).
- **Data:** `useQuery` refetches when `monthStr` changes; cached months (5-minute `staleTime`) return without a network wait, so returning to a recent month stays effectively instant. First-time month fetches are bounded by API latency (NFR3 applies to client transition work, not server RTT).
- **NFR1** per Architecture §10: "Calendar renders < 500ms — Fetch month entries in single API call; render via CSS Grid." Already satisfied by the existing architecture.

### Critical implementation guardrails

1. **Commit pending undo on month change.** If the undo toast is showing (3-second delayed DELETE) and the user navigates months, the `entriesQueryKey` changes. The undo timer's `fireDelete` callback captures `entriesQueryKey` via closure, which would now point to the wrong month. Committing the pending unmark (clearing timer + firing DELETE immediately) before changing month avoids this stale-closure bug. Implement by calling a `commitPendingUndo()` helper at the top of `goToPrevMonth`/`goToNextMonth`.
2. **Do NOT restrict previous-month navigation to the habit start month.** The AC says "Previous month button loads the prior month's calendar and entries" without a lower bound. Months before the habit's start date will simply show all days as inactive (before-start). This is correct behavior — the user can see the calendar but there's nothing to mark.
3. **`now` must be stable across the component lifecycle.** Currently `const now = new Date()` is computed on every render (line 45). For `isCurrentMonth` calculation this is fine because `calYear`/`calMonth` are integers and `now.getFullYear()`/`now.getMonth()` don't change within a session. If it causes issues in tests, wrap in `useMemo` or compute once.
4. **`MonthNavigator` should be a controlled component.** It receives `year`, `month`, `onPrev`, `onNext`, `canGoNext` as props and does not manage its own state. The parent (`HabitCalendarPage`) owns the calendar month state.
5. **Do NOT use `date-fns` `subMonths`/`addMonths` for month arithmetic.** Simple increment/decrement with year rollover is cleaner and avoids importing unnecessary functions. The `calMonth` is 1-indexed (1-12), matching the convention used throughout the project.
6. **The `aria-label` on CalendarGrid already updates** — it uses `new Date(year, month - 1).toLocaleDateString(...)`. When `year`/`month` props change, the label updates automatically.
7. **Tests should mock `Date` or use a fixed date** for testing `isCurrentMonth` logic. Or test indirectly: navigate to a past month, verify next button becomes enabled.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/components/MonthNavigator.tsx`, `client/src/components/MonthNavigator.test.tsx` |
| Client (modified) | `client/src/pages/HabitCalendarPage.tsx`, `client/src/pages/HabitCalendarPage.test.tsx` |

### Previous story intelligence

From story 4-4 (Tap-to-Unmark):
- `undoStateRef` stores `{ dateStr, timerId, previousEntries }`. On commit: `clearTimeout(timerId)`, call `fireDelete(dateStr)`, clear ref. The `commitPendingUndo` helper should follow this exact pattern — it's the same logic as the "commit existing pending unmark" block inside `handleUnmark`.
- `fireDelete` is a `useCallback` that uses `entriesQueryKey` from closure. On month change, this closure is stale. That's why we must commit BEFORE changing the month state.

From story 4-3 (Tap-to-Mark):
- `entriesQueryKey` is `useMemo(() => ['entries', id, monthStr], [id, monthStr])`. This was specifically designed for month navigation: "query key must include month — ensures month navigation will automatically refetch when month changes."
- `markMutation` callbacks also capture `entriesQueryKey`. In-flight mark mutations may use a stale key if the user navigates mid-mutation. This is a known edge case with minimal practical impact (the server write succeeds; the cache just misses the invalidation for the old month). Acceptable for now.

From story 4-1 (Calendar Grid):
- CalendarGrid's `useMemo` depends on `[year, month, habitStartDate]`. Changing `year`/`month` triggers a full grid recomputation — new `days`, `leadingBlanks`, same `startDate`. This is the designed re-render path.

### Key implementation pattern

**MonthNavigator component:**
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

export default function MonthNavigator({ year, month, onPrev, onNext, canGoNext }: Props) {
  const label = new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <button
        type="button"
        onClick={onPrev}
        className="p-2 rounded-lg hover:bg-gray-100 transition text-text-secondary"
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-lg font-semibold text-text min-w-[180px] text-center">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="p-2 rounded-lg transition text-text-secondary hover:bg-gray-100 disabled:text-muted disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent"
        aria-label="Next month"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
```

**Commit pending undo helper (in HabitCalendarPage):**
```typescript
const commitPendingUndo = useCallback(() => {
  if (!undoStateRef.current) return;
  const { timerId, dateStr } = undoStateRef.current;
  clearTimeout(timerId);
  setUndoToastMessage(null);
  fireDelete(dateStr);
}, [fireDelete]);
```

**Navigation functions (in HabitCalendarPage):**
```typescript
const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth() + 1;

const goToPrevMonth = useCallback(() => {
  commitPendingUndo();
  if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
  else { setCalMonth((m) => m - 1); }
}, [calMonth, commitPendingUndo]);

const goToNextMonth = useCallback(() => {
  if (isCurrentMonth) return;
  commitPendingUndo();
  if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
  else { setCalMonth((m) => m + 1); }
}, [calMonth, isCurrentMonth, commitPendingUndo]);
```

### Git intelligence

Recent commits: `feat(calendar): tap-to-unmark day with undo toast and optimistic UI (E4-S4)`. Continue with `feat(calendar):` prefix.

### References

- [Source: architecture.md §6 — Component Hierarchy (MonthNavigator), State Management (selected month)]
- [Source: architecture.md §10 — NFR3 (page transitions < 300ms), NFR1 (calendar renders < 500ms)]
- [Source: epics-and-stories.md — E4-S5 acceptance criteria, FR16, NFR3]
- [Source: prd.md — FR16 (navigate between months), NFR3 (page transitions < 300ms)]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking

### Debug Log References

- No errors encountered. Lint, TypeScript, tests, and build all passed on first attempt.

### Completion Notes List

- Frontend-only story — no backend changes needed. The `GET /api/habits/:id/entries?month=YYYY-MM` endpoint already supports arbitrary months.
- `MonthNavigator` is a controlled component: receives `year`, `month`, `canGoNext` as props, calls `onPrev`/`onNext` callbacks. Uses `ChevronLeft`/`ChevronRight` from `lucide-react`.
- `calYear`/`calMonth` now have setters. `isCurrentMonth` derived value gates the next-month button. Navigation functions handle year rollover (Jan ↔ Dec).
- `commitPendingUndo` helper clears the undo timer and fires the DELETE immediately before changing month — prevents stale-closure bugs where the timer fires after `entriesQueryKey` has changed.
- `useQuery` auto-refetch confirmed: changing `calYear`/`calMonth` → `monthStr` changes → `entriesQueryKey` updates via `useMemo` → `useQuery` automatically fetches the new month's entries. Previously visited months are served from react-query cache (5-minute `staleTime`).
- No lower bound on previous-month navigation — months before the habit's start date show all days as inactive (before-start), which is correct.
- Next-month control uses native `disabled` when at the current month (keyboard/accessibility); AC4/NFR3 rationale documented under Dev Notes.

### Change Log

- `client/src/components/MonthNavigator.tsx` — New controlled component with prev/next arrows and month/year label
- `client/src/components/MonthNavigator.test.tsx` — 5 tests covering label, buttons, disabled state, prop updates
- `client/src/pages/HabitCalendarPage.tsx` — Made calYear/calMonth navigable, added commitPendingUndo/goToPrevMonth/goToNextMonth, rendered MonthNavigator above CalendarGrid
- `client/src/pages/HabitCalendarPage.test.tsx` — 4 new tests for month navigation rendering and behavior

### File List

- `client/src/components/MonthNavigator.tsx` (new)
- `client/src/components/MonthNavigator.test.tsx` (new)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified)

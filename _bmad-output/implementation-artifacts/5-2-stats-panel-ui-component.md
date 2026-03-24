# Story 5.2: Stats Panel UI Component

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my streak and completion stats alongside the calendar,
so that I get both visual and numerical progress feedback.

## Acceptance Criteria

1. **StatsPanel component exists:** A new `StatsPanel` component displays current streak, longest streak, and completion rate.
2. **Positioned below the calendar:** StatsPanel renders below `CalendarGrid` on `HabitCalendarPage`, within the existing `max-w-2xl` layout. On wider viewports, it may display as a horizontal row of stat cards; on narrow viewports, it stacks or wraps gracefully.
3. **Completion rate as percentage:** Displayed as a percentage string (e.g., "95%"). The API returns a decimal (0.0–1.0); the component multiplies by 100 and rounds to the nearest integer.
4. **Streak values as day counts:** Displayed with a unit label (e.g., "22 days"). Singular "1 day" when the value is 1.
5. **Loading state:** A loading placeholder (skeleton or muted text) is shown while the stats API call is in flight.
6. **Visual cohesion:** The panel uses the app's pink/grey/white design system — surface background, border, pink accents for stat values, grey for labels.
7. **Stats API integration:** `HabitCalendarPage` fetches stats from `GET /api/habits/:id/stats` using React Query (`useQuery`), with a query key that will allow invalidation from story 5-3.
8. **Archived habits show stats:** The StatsPanel renders for both active and archived habits (read-only calendar view already displays entries; stats complement it).

## Tasks / Subtasks

- [x] Task 1: Add HabitStats type (AC: #7)
  - [x] In `client/src/types/habit.ts`, add:
    ```typescript
    export interface HabitStats {
      currentStreak: number;
      longestStreak: number;
      completionRate: number;
      totalDays: number;
      completedDays: number;
    }
    ```

- [x] Task 2: Add fetchHabitStats API function (AC: #7)
  - [x] In `client/src/services/habitsApi.ts`, add:
    ```typescript
    export function fetchHabitStats(habitId: string): Promise<HabitStats> {
      return get<HabitStats>(`/api/habits/${habitId}/stats`);
    }
    ```
  - [x] Import `HabitStats` from `../types/habit`

- [x] Task 3: Create StatsPanel component (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `client/src/components/StatsPanel.tsx`
  - [x] Props: `stats: HabitStats | undefined`, `isLoading: boolean`
  - [x] Three stat cards in a horizontal row (flex, gap): Current Streak, Longest Streak, Completion Rate
  - [x] Each card: label (muted text, small), value (prominent, pink-500 or text-text, larger)
  - [x] Streak values: `{n} day{n !== 1 ? 's' : ''}` format
  - [x] Completion rate: `Math.round(stats.completionRate * 100)` + "%" format
  - [x] Loading state: show placeholder text (e.g., "—") or subtle pulse animation for each stat card when `isLoading` is true or `stats` is undefined
  - [x] Container styling: `bg-surface rounded-lg border border-border p-4 mt-4` (below calendar with margin-top)
  - [x] Responsive: cards wrap on narrow screens (`flex-wrap` or grid)
  - [x] Stat values use `text-pink-500` for visual prominence; labels use `text-muted` or `text-text-secondary`

- [x] Task 4: Integrate StatsPanel into HabitCalendarPage (AC: #2, #7, #8)
  - [x] Import `fetchHabitStats` from `../services/habitsApi`
  - [x] Import `StatsPanel` from `../components/StatsPanel`
  - [x] Add a `useQuery` call for stats:
    ```typescript
    const statsQueryKey = useMemo(() => ['stats', id], [id]);
    const statsQuery = useQuery({
      queryKey: statsQueryKey,
      queryFn: () => fetchHabitStats(id!),
      enabled: !!habit && !!id,
    });
    ```
  - [x] Render `<StatsPanel stats={statsQuery.data} isLoading={statsQuery.isLoading} />` below the `<CalendarGrid>` component, before the description/start-date text
  - [x] StatsPanel renders for both active and archived habits (no `isArchived` guard)

- [x] Task 5: Write component test for StatsPanel (AC: #1, #3, #4, #5)
  - [x] Create `client/src/components/StatsPanel.test.tsx`
  - [x] Test: renders current streak with correct day/days label
  - [x] Test: renders longest streak with correct day/days label
  - [x] Test: renders completion rate as rounded percentage
  - [x] Test: shows loading state when isLoading=true
  - [x] Test: handles completionRate of 0 and 1 correctly ("0%" and "100%")
  - [x] Test: singular "1 day" for streak value of 1

- [x] Task 6: Update HabitCalendarPage test (AC: #7)
  - [x] In `client/src/pages/HabitCalendarPage.test.tsx`, mock `fetchHabitStats` to return sample stats
  - [x] Verify StatsPanel renders on the page with expected stat values

- [x] Task 7: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (all existing + new tests)
  - [x] Client build succeeds (`npm run build` in client)
  - [x] Visual check: stats panel displays below calendar, looks cohesive, shows correct values

## Dev Notes

### Architecture compliance

- **Component Hierarchy** per Architecture §6: `StatsPanel` is a direct child of `HabitCalendarPage`, positioned alongside `CalendarGrid` and `MonthNavigator`.
- **State Management** per Architecture §6: Use `@tanstack/react-query` for stats server state — consistent with how entries are already fetched. The query key `['stats', id]` allows targeted invalidation in story 5-3.
- **Design System** per Architecture §6: Use `bg-surface`, `border-border`, `text-pink-500`, `text-muted`, `text-text-secondary` from the established palette in `index.css`.

### Existing patterns to follow

**API function pattern:** Follow `habitsApi.ts` exactly — one-liner wrappers around `get<T>()` with typed return. Import `HabitStats` from types.

**React Query pattern in HabitCalendarPage:** The entries fetch uses `useQuery` with:
- `queryKey`: memoized array with `useMemo`
- `queryFn`: async function calling the API wrapper
- `enabled`: guards on `!!habit && !!id`

Follow this exact pattern for stats. The key difference: stats query key is `['stats', id]` (not month-scoped, since stats are habit-wide).

**Component pattern:** Follow `MonthNavigator.tsx` structure:
- TypeScript interface for Props
- Default export function component
- Tailwind utility classes for styling
- Lucide React icons if needed (optional — stat cards may not need icons)

**Page layout:** `HabitCalendarPage` renders inside `<main className="max-w-2xl mx-auto px-4 py-8">`. The StatsPanel goes below `CalendarGrid` and before the description/start-date text. Current order:
1. Loading entries message (conditional)
2. Entries error (conditional)
3. MonthNavigator
4. CalendarGrid
5. **StatsPanel** ← INSERT HERE
6. Habit description
7. "Started" date

### API response shape (from story 5-1)

```json
{
  "currentStreak": 22,
  "longestStreak": 34,
  "completionRate": 0.95,
  "totalDays": 60,
  "completedDays": 57
}
```

- `completionRate` is a decimal (0.0–1.0), clamped to max 1 by the server (defensive).
- `totalDays` can be 0 if habit start date is somehow in the future; `completionRate` will be 0 in that case.
- `X-Timezone` header is already sent automatically by `api.ts` → `getAuthHeaders()`.

### Critical implementation guardrails

1. **Do NOT create a `client/src/hooks/useStats.ts` file.** There is no `hooks/` directory in this project. Inline the `useQuery` call directly in `HabitCalendarPage`, matching the existing `entriesQuery` pattern.
2. **Do NOT use `useEffect` + manual state for stats.** Use React Query `useQuery` so the cache can be invalidated in story 5-3. This is a deliberate choice for the next story's requirements.
3. **The query key MUST be `['stats', id]`** (not `['stats', id, monthStr]`). Stats are habit-wide, not month-scoped. This is important for 5-3 invalidation — marking a day in any month should trigger a stats refetch.
4. **Do NOT round `completionRate` on the server.** The server returns a decimal. The StatsPanel component handles the `Math.round(rate * 100)` + "%" formatting.
5. **Do NOT add `totalDays` or `completedDays` to the StatsPanel display.** The epics specify only three visible stats: current streak, longest streak, and completion rate. `totalDays` and `completedDays` are in the API response for potential future use but are not displayed.
6. **Handle the error case gracefully.** If the stats fetch fails, the StatsPanel should either not render or show a non-intrusive error — it should NOT block the calendar from displaying. The calendar and stats are independent data fetches.
7. **Do NOT import `date-fns` in StatsPanel.** This is a pure display component with no date logic.
8. **Keep the StatsPanel simple and focused.** No interactive elements, no click handlers. This is a read-only display component.
9. **Singular/plural "day" vs "days":** Use `1 day` (singular) vs `0 days`, `2 days`, etc. (plural). This is a small detail but important for polish.

### Suggested StatsPanel visual structure

```
┌─────────────────────────────────────────────┐
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ Current   │ │ Longest   │ │Completion │ │
│  │ Streak    │ │ Streak    │ │   Rate    │ │
│  │           │ │           │ │           │ │
│  │  22 days  │ │  34 days  │ │    95%    │ │
│  └───────────┘ └───────────┘ └───────────┘ │
└─────────────────────────────────────────────┘
```

Three cards in a flex row, each with:
- Label text: `text-xs text-muted uppercase tracking-wide` (e.g., "Current Streak")
- Value text: `text-2xl font-bold text-pink-500` (e.g., "22 days")
- Card: `flex-1 text-center` with optional `bg-background rounded-lg p-3` for subtle card effect

### Previous story intelligence

From story 5-1 (Statistics Calculation API):
- `stats.service.ts` was created at `server/src/services/stats.service.ts` with `getHabitStats` function
- Route registered as `GET /:id/stats` in `habit.routes.ts` before `GET /:id`
- `HabitStats` interface already exists server-side — the client type should mirror it exactly
- `completionRate` is clamped to max 1 with `Math.min(1, completedDays / totalDays)` — safe to multiply by 100 on the client
- Integration tests confirm the endpoint returns the correct shape with proper auth

From story 4-8 (UI Polish):
- Color tokens are defined in `index.css` `@theme` block — use existing tokens, do not create new ones
- The `bg-surface` (`#F9FAFB`) is used for cards/panels throughout the app
- `text-muted` (`#9CA3AF`) for labels and secondary info
- `text-pink-500` (`#EC4899`) for primary accent/highlighted values

### Git intelligence

Recent commit pattern: `feat(category): description (E#-S#)`. For this story:
```
feat(stats): stats panel UI component on calendar page (E5-S2)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/components/StatsPanel.tsx`, `client/src/components/StatsPanel.test.tsx` |
| Client (modified) | `client/src/types/habit.ts` (add HabitStats), `client/src/services/habitsApi.ts` (add fetchHabitStats), `client/src/pages/HabitCalendarPage.tsx` (add useQuery + StatsPanel), `client/src/pages/HabitCalendarPage.test.tsx` (mock stats) |

### What this story does NOT include

- No real-time stats update on mark/unmark (that's story 5-3)
- No backend changes (stats API is complete from story 5-1)
- No new Tailwind theme tokens
- No changes to CalendarGrid, DayCell, or MonthNavigator
- No stats on HabitListPage or ArchivedHabitsPage (StatsPanel only appears on HabitCalendarPage)

### References

- [Source: architecture.md §5 — Statistics endpoints, response shape]
- [Source: architecture.md §6 — Component Hierarchy (StatsPanel under HabitCalendarPage)]
- [Source: architecture.md §6 — State Management (@tanstack/react-query)]
- [Source: architecture.md §6 — Design System & Color Palette]
- [Source: epics-and-stories.md — E5-S2 acceptance criteria]
- [Source: prd.md — FR21, FR22, FR23 (current streak, longest streak, completion rate)]
- [Source: server/src/services/stats.service.ts — HabitStats interface and response shape]
- [Source: client/src/services/habitsApi.ts — API wrapper pattern]
- [Source: client/src/pages/HabitCalendarPage.tsx — React Query pattern, page layout]
- [Source: client/src/index.css — Tailwind theme tokens]

## Dev Agent Record

### Agent Model Used

Cursor Composer

### Debug Log References

(none)

### Completion Notes List

- Added `HabitStats` and `fetchHabitStats`; `StatsPanel` shows three read-only cards with `flex-wrap`, `bg-surface` / inner `bg-background` cards, muted uppercase labels, pink values, `—` + pulse while loading.
- `HabitCalendarPage` uses `useQuery` with `queryKey: ['stats', id]`; `StatsPanel` is omitted when `statsQuery.isError` so a failed stats request does not block the calendar.
- Tests: `StatsPanel.test.tsx` (formatting + loading); `HabitCalendarPage.test.tsx` mocks `fetchHabitStats` and asserts panel content after async settle.
- Verified: `npm test` (202 tests), `npm run lint`, `npm run build` in `client/`.

### File List

- `client/src/types/habit.ts` (modified)
- `client/src/services/habitsApi.ts` (modified)
- `client/src/components/StatsPanel.tsx` (new)
- `client/src/components/StatsPanel.test.tsx` (new)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified)

## Change Log

- **2026-03-24:** Story 5.2 implemented — stats panel UI, API wiring, tests; sprint status → review.

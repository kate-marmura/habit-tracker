# Story 5.3: Real-Time Stats Update on Mark/Unmark

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my statistics to update immediately when I mark or unmark a day,
so that I see the impact of my action right away.

## Acceptance Criteria

1. **Mark triggers stats refetch:** Marking a day as done causes the StatsPanel to display updated statistics without a page reload.
2. **Unmark triggers stats refetch:** Unmarking a day (after the 3-second undo window expires and the DELETE succeeds) causes the StatsPanel to display updated statistics without a page reload.
3. **No visible delay:** The stats update should feel near-instantaneous from the user's perspective — the refetch fires as soon as the mutation settles (FR24).
4. **Undo does not corrupt stats:** If the user taps "Undo" during the unmark toast window, stats remain unchanged (the DELETE never fires, so server stats haven't changed).

## Tasks / Subtasks

- [x] Task 1: Invalidate stats on mark settle (AC: #1, #3)
  - [x] In `HabitCalendarPage.tsx`, in the `markMutation` `onSettled` callback, add `queryClient.invalidateQueries({ queryKey: statsQueryKey })` alongside the existing entries invalidation

- [x] Task 2: Invalidate stats on unmark (delete) success (AC: #2, #3, #4)
  - [x] In `HabitCalendarPage.tsx`, in the `fireDelete` function, after the successful `deleteEntry` call (same block that invalidates `entriesQueryKey`), add `queryClient.invalidateQueries({ queryKey: statsQueryKey })`

- [x] Task 3: Add `statsQueryKey` to dependency arrays (AC: #1, #2)
  - [x] Verify `statsQueryKey` is in the `useCallback` dependency array of `fireDelete` (it currently depends on `[id, queryClient, entriesQueryKey]` — add `statsQueryKey`)
  - [x] The `markMutation` object does not use `useCallback` so no dependency array change is needed there, but verify `statsQueryKey` is accessible in its `onSettled` closure

- [x] Task 4: Update tests (AC: #1, #2, #4)
  - [x] In `client/src/pages/HabitCalendarPage.test.tsx`:
    - [x] Test: marking a day triggers a stats refetch (verify `fetchHabitStats` is called again after mark)
    - [x] Test: unmarking a day (after undo expires) triggers a stats refetch
    - [x] If existing tests mock `fetchHabitStats`, verify they still pass with the additional calls

- [x] Task 5: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (all existing + new tests)
  - [x] Client build succeeds
  - [x] Manual test: mark a day → stats panel values update; unmark a day → wait for undo toast to expire → stats panel values update; unmark + undo → stats remain unchanged

## Dev Notes

### This is a small wiring story

The infrastructure is fully in place from stories 5-1 and 5-2. The only code changes are adding two `queryClient.invalidateQueries({ queryKey: statsQueryKey })` calls to existing callbacks in `HabitCalendarPage.tsx`, and updating one dependency array.

### Exact locations to modify

**File:** `client/src/pages/HabitCalendarPage.tsx`

**Change 1 — `markMutation.onSettled` (line ~177-179):**

Current:
```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: entriesQueryKey });
},
```

After:
```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: entriesQueryKey });
  queryClient.invalidateQueries({ queryKey: statsQueryKey });
},
```

**Change 2 — `fireDelete` success path (line ~187-188):**

Current:
```typescript
await deleteEntry(id!, dateStr);
queryClient.invalidateQueries({ queryKey: entriesQueryKey });
```

After:
```typescript
await deleteEntry(id!, dateStr);
queryClient.invalidateQueries({ queryKey: entriesQueryKey });
queryClient.invalidateQueries({ queryKey: statsQueryKey });
```

**Change 3 — `fireDelete` dependency array (line ~201):**

Current:
```typescript
[id, queryClient, entriesQueryKey],
```

After:
```typescript
[id, queryClient, entriesQueryKey, statsQueryKey],
```

### Why refetch instead of optimistic recalculation

Optimistic stats recalculation would require replicating the server's streak algorithm on the client (current streak counting backward, longest streak walking sorted dates, completion rate with timezone-resolved "today"). This is:
- **Complex:** The streak algorithm has edge cases (gap detection, start-date boundary, yesterday-if-not-today logic)
- **Error-prone:** Client and server could diverge, leading to flicker when the refetch returns different values
- **Unnecessary:** The `GET /api/habits/:id/stats` call is lightweight (single DB query, trivial computation) and completes in <100ms on local dev. The `onSettled` callback fires after the mutation succeeds, so the stats refetch runs in parallel with the entries refetch — the user sees updated stats within ~100-200ms of the mark/unmark action settling.

React Query's `invalidateQueries` triggers a background refetch. If the existing data is stale, the UI updates when the new data arrives. This is the established pattern in this codebase (used for entries).

### Why stats invalidate on `onSettled` (not `onSuccess`) for mark

`onSettled` fires after both success and error. If the mark fails:
- Entries are reverted in `onError`
- `onSettled` invalidates both entries and stats queries
- The stats refetch returns the same values (nothing changed on the server) — no visible flicker

This is safe and consistent with the existing entries invalidation pattern.

### Why stats invalidate only on success for unmark

The unmark flow has the 3-second undo toast. The DELETE request only fires in `fireDelete` after the toast expires. If the DELETE succeeds, we invalidate stats. If it fails, we revert entries and show an error toast — stats are unchanged. If the user clicks "Undo," `handleUndo` fires instead: entries are restored from the snapshot, no DELETE is sent, and stats are never invalidated (they're still correct).

### Critical implementation guardrails

1. **Do NOT add stats invalidation to `handleUnmark`.** The `handleUnmark` function fires immediately when the user taps a marked day, but the actual DELETE is deferred 3 seconds. Stats should only update after the DELETE confirms.
2. **Do NOT add stats invalidation to `handleUndo`.** The undo restores entries and cancels the DELETE — stats haven't changed on the server.
3. **Do NOT implement client-side optimistic stats recalculation.** Use `invalidateQueries` for a server refetch. See rationale above.
4. **Do NOT create new files.** This story modifies only `HabitCalendarPage.tsx` (and its test file).
5. **Do NOT change StatsPanel.tsx.** The component already handles loading/data states correctly.
6. **Do NOT change the stats query key.** It must remain `['stats', id]` (habit-wide, not month-scoped).
7. **Remember the `statsQueryKey` dependency.** The `fireDelete` `useCallback` must include `statsQueryKey` in its dependency array since it now uses it inside the callback body.

### Previous story intelligence

From story 5-2 (Stats Panel UI Component):
- `statsQueryKey` is `useMemo(() => ['stats', id], [id])` — already defined and accessible in the component
- `statsQuery` uses `useQuery` with `enabled: !!habit && !!id`
- StatsPanel is hidden when `statsQuery.isError` — a failed stats refetch won't break the UI
- StatsPanel shows loading placeholder (`—` + pulse) during fetches — brief loading flash during refetch is acceptable but unlikely to be visible given <100ms response time

From story 5-1 (Statistics Calculation API):
- `GET /api/habits/:id/stats` is a lightweight endpoint — single ownership check + single `findMany` + in-memory computation
- Response is cached by React Query with default `staleTime: 5 * 60 * 1000` (5 minutes) — `invalidateQueries` marks the cache as stale and triggers an immediate refetch

### Git intelligence

Recent commit pattern: `feat(category): description (E#-S#)`. For this story:
```
feat(stats): real-time stats update on mark/unmark (E5-S3)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (modified) | `client/src/pages/HabitCalendarPage.tsx` (add 2 invalidation calls + 1 dependency), `client/src/pages/HabitCalendarPage.test.tsx` (add/update tests for stats refetch) |

### What this story does NOT include

- No backend changes
- No new components or files
- No changes to StatsPanel, CalendarGrid, or DayCell
- No optimistic stats recalculation
- No changes to the stats query key or query options
- This is the last story in Epic 5 — after completion, epic-5 can be marked done

### References

- [Source: epics-and-stories.md — E5-S3 acceptance criteria]
- [Source: prd.md — FR24 (statistics update immediately when day marked/unmarked)]
- [Source: architecture.md §6 — State Management (@tanstack/react-query)]
- [Source: client/src/pages/HabitCalendarPage.tsx — markMutation.onSettled (line ~177), fireDelete (line ~182)]
- [Source: 5-2-stats-panel-ui-component.md — statsQueryKey pattern, StatsPanel error/loading handling]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

(none)

### Completion Notes List

- Added `queryClient.invalidateQueries({ queryKey: statsQueryKey })` to `markMutation.onSettled` and `fireDelete` success path.
- Added `statsQueryKey` to `fireDelete` `useCallback` dependency array.
- Two new tests: "marking a day triggers a stats refetch" and "unmarking a day (after undo expires) triggers a stats refetch". All 204 client tests pass; existing `fetchHabitStats` mock in `vi.mock` ensures prior tests are unaffected.
- Verified: `npm test` (204 tests), `npm run lint`, `npm run build` in `client/`.

### File List

- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified)

## Change Log

- **2026-03-24:** Story 5.3 implemented — stats invalidation on mark/unmark, tests; sprint status → review.

# Story 4.4: Tap-to-Unmark a Day (Optimistic UI)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to tap a marked day to unmark it,
so that I can correct a mistake.

## Acceptance Criteria

1. Tapping a marked day immediately removes the checkmark (visual feedback within 200ms)
2. An undo toast appears for 3 seconds with an "Undo" button; the DELETE request is delayed until the toast expires
3. If user taps "Undo" within the toast window, the unmark is cancelled — checkmark is restored, no DELETE is sent
4. If the toast expires without undo, `DELETE /api/habits/:id/entries/:date` fires
5. Server deletes the `day_entries` row for that habit/date
6. On API failure: revert visual state and show brief error toast
7. CSS transition/animation on the unmark action
8. Per-cell mutation lock: same as E4-S3 — further taps ignored while a mutation is in-flight

## Tasks / Subtasks

- [x] Task 1: Add `deleteEntry` to `entry.service.ts` (AC: #4, #5)
  - [x] New function `deleteEntry(userId, habitId, date)` in `server/src/services/entry.service.ts`
  - [x] Verify habit ownership: `prisma.habit.findFirst({ where: { id: habitId, userId } })` → 404 NOT_FOUND if not found
  - [x] Use idempotent delete: `prisma.dayEntry.deleteMany({ where: { habitId, entryDate: parseCalendarDate(date) } })` — returns count 0 or 1, never throws if not found
  - [x] No return value needed (void)

- [x] Task 2: Add `DELETE /:date` route to `entry.routes.ts` (AC: #4)
  - [x] New Zod param schema for `:date`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidCalendarDateString)` — reuse the same regex/refine pattern already used in `createEntryBody.date`
  - [x] Route handler: validate `:id` as UUID, validate `:date`, call `deleteEntry(userId, id, date)`, respond with `204`
  - [x] Type the handler: `Request<{ id: string; date: string }>`

- [x] Task 3: Backend tests (AC: #4, #5)
  - [x] New `server/src/__tests__/entries.delete.test.ts`
  - [x] Test: 204 — successfully deletes an existing entry
  - [x] Test: 204 — idempotent — deleting a non-existent entry for an owned habit still returns 204
  - [x] Test: 404 — habit belongs to another user
  - [x] Test: 401 — no authorization
  - [x] Test: 422 — invalid date format (e.g., `not-a-date`, `2026-13-01`)
  - [x] Follow existing test pattern from `entries.create.test.ts`

- [x] Task 4: Add `deleteEntry` API function (AC: #4)
  - [x] In `client/src/services/habitsApi.ts`: add `deleteEntry(habitId: string, date: string): Promise<void>` calling `del<void>(`/api/habits/${habitId}/entries/${date}`)`

- [x] Task 5: Create `UndoToast` component (AC: #2, #3)
  - [x] New `client/src/components/UndoToast.tsx`
  - [x] Props: `message: string | null`, `onUndo: () => void`
  - [x] Renders when `message` is non-null: a fixed-bottom toast with the message text and an "Undo" button
  - [x] Styled: `fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm z-50 flex items-center gap-3`
  - [x] Undo button: `text-pink-300 font-semibold hover:text-white transition` — calls `onUndo` on click
  - [x] Accessible: `role="status"`, `aria-live="polite"` (informational, not urgent like error toast)
  - [x] Timer management stays in the PARENT (HabitCalendarPage), not in this component — the toast is purely presentational
  - [x] Must not conflict with `ErrorToast` — same z-level (`z-50`) and position, but only one should be visible at a time (parent controls which is shown)

- [x] Task 6: Allow clicks on marked days in `CalendarGrid` (AC: #1, #8)
  - [x] In `CalendarGrid.tsx`: remove the `!isMarked` guard from the `onClick` condition
  - [x] Before (from E4-S3): `onClick={!dayIsInactive && !isMarked && onDayClick ? () => onDayClick(dateStr) : undefined}`
  - [x] After: `onClick={!dayIsInactive && onDayClick ? () => onDayClick(dateStr) : undefined}`
  - [x] The per-cell mutation lock (`isMutating` / `pendingDates`) already prevents clicks on in-flight cells — no change needed there
  - [x] DayCell already has `pointer-events-none` when `isMutating`, providing defense-in-depth

- [x] Task 7: Add cursor-pointer to marked clickable cells in `DayCell` (AC: #1, #7)
  - [x] Currently only the default-eligible branch adds `cursor-pointer` conditionally on `onClick`. Marked cells don't get it.
  - [x] Refactor: remove `${onClick ? ' cursor-pointer' : ''}` from the else (eligible) branch
  - [x] Add a single global cursor-pointer assignment after all styling branches: `if (!inactive && !isMutating && onClick) { cellClasses += ' cursor-pointer'; }`
  - [x] This gives cursor-pointer to all clickable cells consistently (marked, today, eligible)

- [x] Task 8: Add unmark flow to `HabitCalendarPage` (AC: #1, #2, #3, #4, #6, #8)
  - [x] New state: `undoState: { dateStr: string; timerId: ReturnType<typeof setTimeout>; previousEntries: Set<string> | undefined } | null` — tracks pending unmark
  - [x] New state: `undoToastMessage: string | null` — controls UndoToast visibility
  - [x] Rename `handleMarkDay` to `handleDayClick` — it now handles both mark and unmark
  - [x] In `handleDayClick(dateStr)`:
    - If `pendingDates.has(dateStr)` → return (mutation lock)
    - If `markedDates.has(dateStr)` → call `handleUnmark(dateStr)`
    - Else → call `markMutation.mutate(dateStr)` (unchanged from E4-S3)
  - [x] `handleUnmark(dateStr)`:
    1. If there's an existing `undoState` → commit it immediately: clear its timer, fire `fireDelete(undoState.dateStr, undoState.previousEntries)`, clear undoState
    2. Snapshot current entries from query cache
    3. Optimistically remove `dateStr` from entries cache via `queryClient.setQueryData`
    4. Add `dateStr` to `pendingDates`
    5. Set `undoToastMessage` (e.g., `"Day unmarked"`)
    6. Start 3-second `setTimeout` → on expiry calls `fireDelete(dateStr, snapshot)`
    7. Store in `undoState`
  - [x] `handleUndo()`:
    1. If no `undoState` → return
    2. `clearTimeout(undoState.timerId)`
    3. Restore entries cache from `undoState.previousEntries`
    4. Remove `dateStr` from `pendingDates`
    5. Clear `undoToastMessage`
    6. Clear `undoState`
  - [x] `fireDelete(dateStr, previousEntries)`:
    1. Clear `undoToastMessage` and `undoState`
    2. Call `deleteEntry(id!, dateStr)` (the API function)
    3. On success: `queryClient.invalidateQueries({ queryKey: entriesQueryKey })`
    4. On error: restore `previousEntries` to cache, set `toastMessage` (error toast) with error text
    5. On finally: remove `dateStr` from `pendingDates`
  - [x] Cleanup: `useEffect` that clears `undoState.timerId` on unmount (prevents memory leaks and dangling timers)
  - [x] Render `<UndoToast message={undoToastMessage} onUndo={handleUndo} />` alongside `<ErrorToast />`
  - [x] Update the `onDayClick` prop passed to CalendarGrid: `onDayClick={!habit.isArchived ? handleDayClick : undefined}`

- [x] Task 9: Client tests (AC: #1, #2, #3, #4, #6, #7, #8)
  - [x] New `client/src/components/UndoToast.test.tsx`: renders message + Undo button when message non-null, hidden when null, Undo button calls onUndo, accessible role/aria
  - [x] Update `client/src/components/DayCell.test.tsx`: verify cursor-pointer on clickable marked cells; verify cursor-pointer on clickable today/eligible cells
  - [x] Update `client/src/components/CalendarGrid.test.tsx`: verify `onDayClick` fires for marked cells (was previously blocked); verify it still does NOT fire for inactive cells
  - [x] Update `client/src/pages/HabitCalendarPage.test.tsx`:
    - Mock `deleteEntry` in the habitsApi mock
    - Test: clicking a marked day optimistically removes mark (bg-pink-500 disappears)
    - Test: undo toast appears after clicking a marked day
    - Test: clicking Undo restores the mark (bg-pink-500 reappears) — verify `deleteEntry` was NOT called
    - Test: after 3-second timeout, `deleteEntry` is called
    - Test: error toast appears when DELETE fails (use `vi.useFakeTimers` to advance past undo window, then reject `deleteEntry`)

- [x] Task 10: Verify
  - [x] `npm run lint` and `npm test` pass in both client and server
  - [x] Client build succeeds

## Dev Notes

### Story scope

- **In scope:** Backend DELETE entry endpoint, frontend undo toast with delayed DELETE, optimistic unmark, cursor-pointer on marked cells, per-cell mutation lock during unmark flow, cleanup on unmount.
- **Out of scope:** Month navigation (E4-S5), habit switching (E4-S6). No changes to the mark flow (E4-S3) beyond renaming the handler and allowing CalendarGrid clicks on marked cells.

### Existing code to build on

**Backend:**
- **`entry.service.ts`** — already has `listEntriesByMonth` and `createEntry`. Add `deleteEntry` in the same file. The ownership check pattern is established: `prisma.habit.findFirst({ where: { id: habitId, userId } })` → 404 if null.
- **`entry.routes.ts`** — already has `GET /` and `POST /` with `mergeParams: true`. Add `DELETE /:date` route. The `habitIdParam` Zod schema and `isValidCalendarDateString` import are already available. The `createEntryBody.date` field uses the same regex+refine pattern needed for the new date param — extract to a shared `dateSchema` or define inline.
- **`calendar-date.ts`** — `parseCalendarDate(dateStr)` converts YYYY-MM-DD to UTC Date for Prisma. `isValidCalendarDateString(dateStr)` validates YYYY-MM-DD format. Both already imported in `entry.routes.ts`.
- **`error-handler.ts`** — catches Prisma `P2025` (RecordNotFound) and returns 404. But since we use `deleteMany` (idempotent), P2025 won't be thrown.
- **`routes/index.ts`** — entry routes already mounted at `/habits/:id/entries`. The `DELETE /:date` route will be available as `DELETE /api/habits/:id/entries/:date` automatically via `mergeParams`.

**Frontend:**
- **`habitsApi.ts`** — has `fetchEntries`, `createEntry`. The `del` function from `api.ts` is already imported. Add `deleteEntry(habitId, date)` calling `del<void>(...)`.
- **`api.ts`** — `del<void>(path)` correctly handles 204 (empty body): `handleResponse` returns `undefined as T` when response text is empty, which works for `Promise<void>`.
- **`HabitCalendarPage.tsx`** — already has `@tanstack/react-query` setup from E4-S3: `useQuery` for entries, `useMutation` for marking, `pendingDates` state, `ErrorToast` component. The unmark flow adds parallel state management (undo state) alongside the existing mark mutation.
- **`CalendarGrid.tsx`** — has `onDayClick`, `pendingDates`, `markedDates` props from E4-S3. Currently guards `onClick` against marked cells (`!isMarked`). This guard needs removal.
- **`DayCell.tsx`** — has `onClick`, `isMutating`, `isMarked` props. Has `transition-all duration-150` on base classes. Currently only adds `cursor-pointer` in the eligible-default branch. Needs global cursor-pointer for all clickable cells.
- **`ErrorToast.tsx`** — auto-dismissing error toast at `z-50` bottom-center. Will coexist with the new `UndoToast` — only one shows at a time in normal flow.

### Architecture compliance

- **DELETE endpoint** matches Architecture §5: `DELETE /api/habits/:id/entries/:date` — Unmark a day.
- **Undo toast** per Architecture §6: "When a day is unmarked, a brief toast notification appears (3 seconds) with an 'Undo' action. If the user taps Undo, the DELETE is cancelled (or reversed with a POST) and the checkmark is restored. This prevents accidental loss of check-ins, which carry emotional weight in this product."
- **Per-cell mutation lock** per Architecture §6: "disable the day cell's click handler while a mutation for that cell is in-flight, or use a per-cell mutation lock." The `pendingDates` mechanism from E4-S3 is reused — dateStr is added to pendingDates during the entire unmark flow (undo window + DELETE request).
- **Optimistic UI** per Architecture §6: "User taps DayCell → UI immediately toggles → On failure: revert + error toast."
- **Service layer pattern** per Architecture §7: thin route → service function → Prisma.

### Critical implementation guardrails

1. **Do NOT use `useMutation` for the DELETE call.** The DELETE is delayed by 3 seconds (undo window). `useMutation`'s `onMutate` → `mutationFn` flow assumes the API call happens immediately after `onMutate`. Instead, manage optimistic state manually: update query cache directly on tap, then call `deleteEntry()` after the timer fires. The existing `markMutation` (for marking) remains unchanged.
2. **Idempotent DELETE — use `deleteMany`, not `delete`.** `prisma.dayEntry.delete` throws P2025 if the record doesn't exist (e.g., already deleted from another tab). `prisma.dayEntry.deleteMany` returns `{ count: 0 }` silently. Return 204 regardless of count. This prevents spurious 404s in the undo-expiry flow.
3. **Only one pending unmark at a time.** If user taps a second marked day while the first undo toast is active, commit the first unmark immediately (fire DELETE), then start the new undo flow. This avoids UI complexity of stacking multiple undo toasts.
4. **Cleanup timer on unmount.** Store the `setTimeout` ID in `undoState` and clear it in a `useEffect` cleanup. Without this, navigating away during the undo window causes a dangling timer that tries to update unmounted component state.
5. **`undoToastMessage` and `toastMessage` (error) must not show simultaneously.** In normal flow they are sequential: undo toast → timer fires → DELETE → error toast (if fails). But if the user navigates or something unexpected happens, guard against both being non-null. The parent should clear `undoToastMessage` before setting `toastMessage` in `fireDelete`'s error handler.
6. **CalendarGrid must now fire `onDayClick` for marked cells.** Remove the `!isMarked` guard from the `onClick` assignment. The page handler `handleDayClick` dispatches to mark or unmark based on whether `markedDates.has(dateStr)`.
7. **DayCell cursor-pointer must work for all clickable states** — not just the eligible-default branch. Move cursor-pointer to a global check: `if (!inactive && !isMutating && onClick)`.
8. **Tests must use `vi.useFakeTimers` for unmark tests** — the 3-second delay needs to be controlled. Use `vi.advanceTimersByTime(3000)` wrapped in `act()` to trigger the timer expiry.
9. **Keep `markMutation` unchanged.** The existing `useMutation` for marking works correctly. The unmark flow is additive — it doesn't change the mark flow.
10. **Entry routes already handle the `:date` param via `mergeParams`.** The `DELETE /:date` route receives both `:id` (from parent) and `:date` (from its own path). Type the handler as `Request<{ id: string; date: string }>`.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Server (modified) | `server/src/services/entry.service.ts`, `server/src/routes/entry.routes.ts` |
| Server (new) | `server/src/__tests__/entries.delete.test.ts` |
| Client (new) | `client/src/components/UndoToast.tsx`, `client/src/components/UndoToast.test.tsx` |
| Client (modified) | `client/src/services/habitsApi.ts`, `client/src/components/DayCell.tsx`, `client/src/components/CalendarGrid.tsx`, `client/src/pages/HabitCalendarPage.tsx`, `client/src/components/DayCell.test.tsx`, `client/src/components/CalendarGrid.test.tsx`, `client/src/pages/HabitCalendarPage.test.tsx` |

### Previous story intelligence

From story 4-3 (Tap-to-Mark a Day):
- `pendingDates` uses `useState<Set<string>>` — must create a NEW Set on each update for React re-render. Same pattern applies for the unmark flow when adding/removing dates.
- `markMutation.onError` rolls back by deleting the date from the cache Set. The unmark flow's `fireDelete` error handler must do the reverse — re-add the date.
- CalendarGrid explicitly blocked clicks on marked cells (`!isMarked` guard). This must now be removed.
- `ErrorToast` auto-dismisses after 3s via internal `useEffect + setTimeout`. The new `UndoToast` should NOT have an internal timer — its timer is managed by the parent (HabitCalendarPage) because the parent needs to control when the DELETE fires.
- Client test for optimistic mark used `vi.waitFor` to assert class changes. Same pattern works for unmark (assert bg-pink-500 disappears).
- `fetchEntries` mock needed `.mockResolvedValue([])` as a default in test setup. Similarly, `deleteEntry` needs a default mock.
- `Request<{ id: string }>` typing pattern in route handlers — extend to `Request<{ id: string; date: string }>` for the DELETE route.

From story 4-2 (Fetch and Display Day Entries):
- Entry routes use `Router({ mergeParams: true })` — the parent route provides `:id`, the entry router can define its own params like `:date`.

### Key implementation patterns

**Idempotent delete service:**
```typescript
export async function deleteEntry(userId: string, habitId: string, date: string) {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });
  if (!habit) {
    throw new AppError(404, 'NOT_FOUND', 'Habit not found');
  }
  await prisma.dayEntry.deleteMany({
    where: { habitId, entryDate: parseCalendarDate(date) },
  });
}
```

**Undo toast flow (simplified pseudocode):**
```typescript
function handleUnmark(dateStr: string) {
  // Commit any existing pending unmark first
  if (undoState) { commitUnmark(undoState); }

  const snapshot = queryClient.getQueryData<Set<string>>(queryKey);
  queryClient.setQueryData<Set<string>>(queryKey, (old) => {
    const next = new Set(old);
    next.delete(dateStr);
    return next;
  });
  setPendingDates((prev) => new Set([...prev, dateStr]));
  setUndoToastMessage('Day unmarked');

  const timerId = setTimeout(() => fireDelete(dateStr, snapshot), 3000);
  setUndoState({ dateStr, timerId, previousEntries: snapshot });
}

function handleUndo() {
  clearTimeout(undoState.timerId);
  queryClient.setQueryData(queryKey, undoState.previousEntries);
  setPendingDates((prev) => { const n = new Set(prev); n.delete(undoState.dateStr); return n; });
  setUndoToastMessage(null);
  setUndoState(null);
}

async function fireDelete(dateStr: string, previousEntries: Set<string> | undefined) {
  setUndoToastMessage(null);
  setUndoState(null);
  try {
    await deleteEntryApi(id!, dateStr);
    queryClient.invalidateQueries({ queryKey });
  } catch (err) {
    if (previousEntries) queryClient.setQueryData(queryKey, previousEntries);
    setToastMessage(err instanceof Error ? err.message : 'Could not unmark day.');
  } finally {
    setPendingDates((prev) => { const n = new Set(prev); n.delete(dateStr); return n; });
  }
}
```

**DELETE route:**
```typescript
const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
  .refine(isValidCalendarDateString, 'Date is not a valid calendar date');

router.delete('/:date', async (req: Request<{ id: string; date: string }>, res) => {
  const id = habitIdParam.parse(req.params.id);
  const date = dateParam.parse(req.params.date);
  await deleteEntry(res.locals.userId, id, date);
  res.status(204).send();
});
```

### Git intelligence

Recent commits: `feat(calendar): tap-to-mark a day with optimistic UI (E4-S3)`. Continue with `feat(calendar):` prefix.

### References

- [Source: architecture.md §5 — Day Entries DELETE endpoint]
- [Source: architecture.md §6 — Optimistic UI for Day Marking, Unmark undo toast, Mutation queueing]
- [Source: architecture.md §7 — Service Layer Pattern]
- [Source: epics-and-stories.md — E4-S4 acceptance criteria, FR15, NFR2]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking

### Debug Log References

- Lint caught `undoState` useState being set but never read — removed the useState in favor of `undoStateRef` only, since undo state doesn't need to trigger re-renders (the `undoToastMessage` and `pendingDates` states handle that).
- Lint warned about `entriesQueryKey` array causing useCallback dependency churn — wrapped with `useMemo`.
- CalendarGrid test "does not fire onDayClick for already-marked days" now correctly expects clicks on marked days to fire (behavior change per Task 6).

### Completion Notes List

- Backend `deleteEntry` uses idempotent `prisma.dayEntry.deleteMany` — returns 204 regardless of whether the entry existed, preventing spurious 404s in the undo-expiry flow.
- Unmark flow does NOT use `useMutation` (per guardrail #1) — the DELETE is delayed by 3 seconds for the undo window. State is managed manually: optimistic cache update on tap, delayed `fireDelete` via `setTimeout`.
- Only one pending unmark at a time: tapping a second marked day commits the first immediately, then starts a new undo window.
- `undoStateRef` used instead of `undoState` useState to avoid unnecessary re-renders and stale closure issues in `setTimeout` callbacks.
- Cleanup `useEffect` clears timer on unmount to prevent dangling timers.
- CalendarGrid `!isMarked` guard removed — `handleDayClick` in the page dispatches mark vs unmark based on `markedDates.has(dateStr)`.
- DayCell cursor-pointer moved to a global check after all styling branches, giving consistent cursor-pointer to all clickable cells (marked, today, eligible).
- `entriesQueryKey` wrapped in `useMemo` to fix exhaustive-deps lint warnings on useCallback hooks.

### Change Log

- `server/src/services/entry.service.ts` — Added `deleteEntry` function with ownership check and idempotent deleteMany
- `server/src/routes/entry.routes.ts` — Added `DELETE /:date` route with Zod date param validation
- `server/src/__tests__/entries.delete.test.ts` — 6 integration tests for DELETE endpoint
- `client/src/services/habitsApi.ts` — Added `deleteEntry` API function
- `client/src/components/UndoToast.tsx` — New presentational undo toast component
- `client/src/components/DayCell.tsx` — Moved cursor-pointer to global check for all clickable cells
- `client/src/components/CalendarGrid.tsx` — Removed `!isMarked` guard from onClick condition
- `client/src/pages/HabitCalendarPage.tsx` — Full unmark flow: handleDayClick dispatching, handleUnmark with undo window, handleUndo, fireDelete, timer cleanup, UndoToast integration, entriesQueryKey useMemo
- `client/src/components/UndoToast.test.tsx` — 4 tests for UndoToast
- `client/src/components/DayCell.test.tsx` — Added 3 tests for cursor-pointer on marked/today cells
- `client/src/components/CalendarGrid.test.tsx` — Updated test to expect onDayClick fires for marked days
- `client/src/pages/HabitCalendarPage.test.tsx` — Added deleteEntry mock + 4 unmark flow tests (optimistic remove, undo toast, undo restores mark, deleteEntry called after timeout)

### File List

- `server/src/services/entry.service.ts` (modified)
- `server/src/routes/entry.routes.ts` (modified)
- `server/src/__tests__/entries.delete.test.ts` (new)
- `client/src/services/habitsApi.ts` (modified)
- `client/src/components/UndoToast.tsx` (new)
- `client/src/components/UndoToast.test.tsx` (new)
- `client/src/components/DayCell.tsx` (modified)
- `client/src/components/CalendarGrid.tsx` (modified)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/components/DayCell.test.tsx` (modified)
- `client/src/components/CalendarGrid.test.tsx` (modified)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified)

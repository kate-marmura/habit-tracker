# Story 4.3: Tap-to-Mark a Day (Optimistic UI)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to tap a calendar day to mark it as done,
so that tracking my habit is instant and satisfying.

## Acceptance Criteria

1. Tapping an unmarked eligible day immediately shows it as marked (visual feedback within 200ms — NFR2)
2. `POST /api/habits/:id/entries` fires in the background with `{ date: "YYYY-MM-DD" }` and `X-Timezone` header
3. Server validates: date >= habit `start_date` and <= today (resolved via client timezone, NFR15); returns `422` if invalid (FR19)
4. Server enforces unique constraint — returns `409` if already marked
5. On API success: no-op (UI already correct)
6. On API failure: revert visual state and show brief error toast
7. CSS transition/animation on the mark action for a satisfying micro-interaction
8. `@tanstack/react-query` mutation with optimistic update
9. Per-cell mutation lock: if a mutation is in-flight for a day cell, further taps on that cell are ignored until the mutation settles (prevents race conditions from rapid taps)

## Tasks / Subtasks

- [x] Task 1: Add `createEntry` to `entry.service.ts` (AC: #2, #3, #4)
  - [x] New function `createEntry(userId, habitId, date, timezone)` in `server/src/services/entry.service.ts`
  - [x] Verify habit ownership: `prisma.habit.findFirst({ where: { id: habitId, userId } })` → 404 if not found
  - [x] Retrieve `startDate` from the habit to validate against
  - [x] Validate `date >= startDate` (YYYY-MM-DD string comparison) → `AppError(422, 'INVALID_DATE', 'Date is before habit start date')` if invalid
  - [x] Validate `date <= getTodayInTimezone(timezone)` → `AppError(422, 'INVALID_DATE', 'Cannot mark future dates')` if invalid
  - [x] Create `day_entries` row: `prisma.dayEntry.create({ data: { habitId, entryDate: parseCalendarDate(date) } })`
  - [x] On Prisma P2002 (unique constraint violation): throw `AppError(409, 'ALREADY_MARKED', 'This day is already marked')`
  - [x] Return `{ id, entryDate }` with `formatCalendarDate`

- [x] Task 2: Add `POST /` route to `entry.routes.ts` (AC: #2, #3)
  - [x] Zod body schema: `z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidCalendarDateString) })`
  - [x] Route handler: validate `:id` as UUID, parse body, call `createEntry(userId, id, date, timezone)`, respond with `201`
  - [x] Timezone comes from `res.locals.timezone` (already set by `timezoneMiddleware`)

- [x] Task 3: Backend tests (AC: #2, #3, #4)
  - [x] New `server/src/__tests__/entries.create.test.ts`
  - [x] Test: 201 — successfully marks a valid date, returns `{ id, entryDate }` shape
  - [x] Test: 422 — date before habit start_date
  - [x] Test: 422 — date in the future
  - [x] Test: 409 — marking the same date twice (unique constraint)
  - [x] Test: 404 — habit belongs to another user
  - [x] Test: 401 — no authorization
  - [x] Test: 422 — invalid date format (`2026-13-01`, `not-a-date`)
  - [x] Follow existing test pattern from `entries.list.test.ts`

- [x] Task 4: Add `createEntry` API function (AC: #2)
  - [x] In `client/src/services/habitsApi.ts`: add `createEntry(habitId: string, date: string): Promise<DayEntry>` calling `POST /api/habits/${habitId}/entries` with body `{ date }`

- [x] Task 5: Refactor entry fetching to `useQuery` (AC: #8)
  - [x] In `HabitCalendarPage`: replace the manual `useEffect` + `useState` entry-fetching logic with `@tanstack/react-query` `useQuery`
  - [x] Query key: `['entries', habitId, monthStr]` — enables automatic cache invalidation
  - [x] Query function: calls `fetchEntries(habitId, monthStr)` and maps to `Set<string>`
  - [x] `enabled: !!habit && !!id` — only runs after habit loads
  - [x] Remove `entries`, `entriesLoading`, `entriesError` useState — use query return values instead
  - [x] The `entriesLoading` / `entriesError` UI stays the same, just sourced from query state

- [x] Task 6: Add `useMutation` for mark-day with optimistic update (AC: #1, #5, #6, #8, #9)
  - [x] `useMutation` calling `createEntry(habitId, dateStr)`
  - [x] `onMutate(dateStr)`: snapshot previous entries query data, optimistically add `dateStr` to the `Set<string>`, track the date in a `pendingDates` ref (`Set<string>`) for mutation lock
  - [x] `onSuccess`: no-op (optimistic UI is already correct), remove date from `pendingDates`
  - [x] `onError`: rollback to snapshot via `queryClient.setQueryData`, remove date from `pendingDates`, set toast error message
  - [x] `onSettled`: `queryClient.invalidateQueries(['entries', habitId, monthStr])` to ensure cache stays fresh, remove date from `pendingDates` if not already removed

- [x] Task 7: Wire `onDayClick` from `CalendarGrid` through `DayCell` (AC: #1, #9)
  - [x] Add `onDayClick?: (dateStr: string) => void` prop to `CalendarGrid`
  - [x] In CalendarGrid's day rendering: pass `onClick={() => onDayClick?.(format(day, 'yyyy-MM-dd'))}` to each eligible DayCell
  - [x] Add `isMutating?: boolean` prop to `DayCell` — when true, disable click and show reduced-opacity or subtle pulse
  - [x] In CalendarGrid: pass `isMutating={pendingDates?.has(format(day, 'yyyy-MM-dd'))}` to DayCell
  - [x] Add `pendingDates?: Set<string>` prop to `CalendarGrid`
  - [x] In `HabitCalendarPage`: pass `onDayClick={handleMarkDay}` and `pendingDates` to CalendarGrid
  - [x] `handleMarkDay(dateStr)`: if date is already marked or in pendingDates, return early; otherwise call `markMutation.mutate(dateStr)`

- [x] Task 8: Add CSS transition for mark animation (AC: #7)
  - [x] Add `transition-all duration-150` to DayCell base classes so color/background changes animate smoothly
  - [x] The transition from white/border to pink-500 fill creates a satisfying visual effect on mark

- [x] Task 9: Create `ErrorToast` component (AC: #6)
  - [x] New `client/src/components/ErrorToast.tsx` — simple auto-dismissing toast
  - [x] Props: `message: string | null`, `onDismiss: () => void`
  - [x] Renders a fixed-bottom toast with error message when `message` is non-null
  - [x] Auto-dismisses after 3 seconds via `useEffect` + `setTimeout`
  - [x] Styled: `fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm`
  - [x] Accessible: `role="alert"`, `aria-live="assertive"`
  - [x] Integrate into `HabitCalendarPage` — show on mutation error, clear on dismiss

- [x] Task 10: Client tests (AC: #1, #5, #6, #8, #9)
  - [x] Update `client/src/components/DayCell.test.tsx`: test `isMutating` prop disables click; transition classes present
  - [x] Update `client/src/components/CalendarGrid.test.tsx`: test `onDayClick` callback fires with correct date string; test `pendingDates` disables mutating cells
  - [x] New `client/src/components/ErrorToast.test.tsx`: renders message, auto-dismisses, calls onDismiss
  - [x] Update `client/src/pages/HabitCalendarPage.test.tsx`: mock `createEntry`, test optimistic mark (clicking a day shows it as marked before API resolves), test error reverts mark and shows toast

- [x] Task 11: Verify
  - [x] `npm run lint` and `npm test` pass in both client and server
  - [x] Client build succeeds

## Dev Notes

### Story scope

- **In scope:** Backend POST entry endpoint with validation, frontend `@tanstack/react-query` refactor for entries, optimistic mutation for marking, per-cell mutation lock, CSS transition, error toast.
- **Out of scope:** DELETE entries / unmark (E4-S4), undo toast for unmark (E4-S4), month navigation (E4-S5). This story only handles marking — tapping a **marked** day should do nothing (unmark comes in E4-S4).

### Existing code to build on

**Backend:**
- **`entry.service.ts`** — already has `listEntriesByMonth`. Add `createEntry` in the same file.
- **`entry.routes.ts`** — already has `GET /` with zod validation and `mergeParams`. Add `POST /` route.
- **`calendar-date.ts`** — `getTodayInTimezone(timezone)` returns today as YYYY-MM-DD in the given timezone. `parseCalendarDate(dateStr)` converts YYYY-MM-DD to UTC Date for Prisma. `formatCalendarDate(date)` converts Date back to YYYY-MM-DD. `isValidCalendarDateString(dateStr)` validates YYYY-MM-DD format. All already used in `habit.routes.ts` and `habit.service.ts`.
- **`error-handler.ts`** — catches `Prisma.PrismaClientKnownRequestError` with code `P2002` and returns 409. However, for a friendlier error message, catch P2002 in the service and throw a custom `AppError(409, 'ALREADY_MARKED', ...)` instead of relying on the generic handler.
- **Habit service pattern** — `createHabit` in `habit.service.ts` shows the established pattern: validate with `getTodayInTimezone`, use `parseCalendarDate` for storage, use `formatCalendarDate` for response.

**Frontend:**
- **`main.tsx`** — `QueryClientProvider` already wraps the app with `QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } } })`. React Query is ready to use.
- **`HabitCalendarPage.tsx`** — currently uses manual `useEffect` for entry fetching (lines 71-100). This needs refactoring to `useQuery` so optimistic mutations can use `queryClient.setQueryData` to update the cache.
- **`CalendarGrid.tsx`** — accepts `markedDates?: Set<string>` and passes `isMarked={markedDates?.has(format(day, 'yyyy-MM-dd'))}` to DayCell. Does NOT yet accept `onDayClick` or `pendingDates`.
- **`DayCell.tsx`** — accepts `onClick?: () => void` prop (from E4-S1). The click handler fires on eligible (non-inactive) cells. Does NOT yet accept `isMutating`.
- **`habitsApi.ts`** — has `fetchEntries(habitId, month)`. Need to add `createEntry(habitId, date)`. Uses `post` from `api.ts` which already sends `X-Timezone` header.
- **`api.ts`** — `post<T>(path, data)` sends `Authorization` + `X-Timezone` headers automatically.

### Architecture compliance

- **POST endpoint** matches Architecture §5: `POST /api/habits/:id/entries` with body `{ date }`.
- **Mark day validation** per Architecture §5: "Date must be >= habit start_date and <= today (FR19). Today resolved using X-Timezone header. Return 422 if invalid."
- **Optimistic UI** per Architecture §6: "User taps DayCell → UI immediately toggles → API request fires in background → On success: no-op → On failure: revert + error toast." This is described as "the single most important UX interaction in the app."
- **`@tanstack/react-query` mutation** per Architecture §6: "react-query's optimistic mutation support handles this pattern cleanly."
- **Per-cell mutation lock** per Architecture §6: "disable the day cell's click handler while a mutation for that cell is in-flight, or use a per-cell mutation lock."
- **Service layer pattern** per Architecture §7: thin route → service function → Prisma.

### Critical implementation guardrails

1. **Do NOT implement unmark/DELETE** — that's E4-S4. When a marked day is tapped, do nothing. The `handleMarkDay` function should return early if `markedDates.has(dateStr)` or `pendingDates.has(dateStr)`.
2. **Catch P2002 in the service, not the error handler** — the generic error handler returns `"A record with this value already exists"` which is confusing for users. Catch the `PrismaClientKnownRequestError` with code `P2002` in `createEntry` and throw `AppError(409, 'ALREADY_MARKED', 'This day is already marked')` for a clear error message.
3. **Date validation order** — validate ownership FIRST, then date range. Don't leak information about whether a habit exists by returning date errors for non-owned habits.
4. **String comparison for dates** — `date >= startDate` works correctly for YYYY-MM-DD strings since lexicographic order matches chronological order. Same for `date <= today`. Use this approach (matching `habit.service.ts` pattern) rather than parsing to Date objects.
5. **`useQuery` query key must include month** — `['entries', habitId, monthStr]` ensures month navigation (E4-S5) will automatically refetch when month changes. The optimistic update must target this exact key.
6. **Optimistic update must create a NEW Set** — React won't re-render if you mutate the existing Set. In `onMutate`, create `new Set([...previousEntries, dateStr])` and set it via `queryClient.setQueryData`.
7. **`pendingDates` should be a `useRef<Set<string>>`** — not `useState`. Mutations are async and we don't want re-renders just from tracking pending state. However, DayCell needs to know about it for the visual lock, so either: (a) use a state that updates sparingly, or (b) pass a callback. Recommendation: use `useState<Set<string>>` and update it in `onMutate`/`onSettled` — the re-renders are minimal (one cell changes) and needed for visual feedback.
8. **CalendarGrid `onDayClick` should NOT fire for inactive or already-marked cells** — the guard should be in the CalendarGrid or the page handler, not just DayCell. DayCell already guards `onClick` for inactive cells. CalendarGrid should add the `isMarked` guard. Page handler should add the `pendingDates` guard.
9. **ErrorToast must not interfere with ConfirmModal or other modals** — use `z-50` or similar to layer correctly. Position at bottom-center, not overlapping modal backdrops.
10. **Tests must wrap components in `QueryClientProvider`** — any component using `useQuery`/`useMutation` needs the provider. Create a test utility or wrap inline.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Server (modified) | `server/src/services/entry.service.ts`, `server/src/routes/entry.routes.ts` |
| Server (new) | `server/src/__tests__/entries.create.test.ts` |
| Client (new) | `client/src/components/ErrorToast.tsx`, `client/src/components/ErrorToast.test.tsx` |
| Client (modified) | `client/src/services/habitsApi.ts`, `client/src/components/DayCell.tsx`, `client/src/components/CalendarGrid.tsx`, `client/src/pages/HabitCalendarPage.tsx`, `client/src/components/DayCell.test.tsx`, `client/src/components/CalendarGrid.test.tsx`, `client/src/pages/HabitCalendarPage.test.tsx` |

### Previous story intelligence

From story 4-2 (Fetch and Display Day Entries):
- `req.params.id` TypeScript error with `mergeParams` — fixed by typing route handler with `Request<{ id: string }>`. Apply the same typing for the new POST route.
- HabitCalendarPage test failure when `fetchEntries` wasn't mocked — any new API functions (`createEntry`) also need mocking in page tests.
- DayCell marked state uses: `bg-pink-500 text-white font-bold` with `Check` icon. Marked+today: `bg-pink-500 ring-2 ring-pink-700`. These are established and should not change.
- CalendarGrid uses `format(day, 'yyyy-MM-dd')` for Set lookup — the `onDayClick` callback should pass the same format string so the date key is consistent.
- Entries fetching uses `useEffect` with `cancelled` flag pattern — this will be replaced by `useQuery` in this story.

From story 4-1 (Calendar Grid Component):
- DayCell `onClick` prop already exists and fires only on non-inactive cells. This is the hook point for tap-to-mark.
- CalendarGrid does NOT currently pass `onClick` to DayCell — the prop exists but is never wired. This story wires it.

### Git intelligence

Recent commits: `feat(calendar): fetch and display day entries on calendar (E4-S2)`. Continue with `feat(calendar):` prefix.

### Latest tech notes

- **`@tanstack/react-query` v5.91.3**: `useQuery` takes `{ queryKey, queryFn, enabled }`. `useMutation` takes `{ mutationFn, onMutate, onSuccess, onError, onSettled }`. Optimistic updates use `queryClient.setQueryData(queryKey, updater)` in `onMutate` and `queryClient.invalidateQueries({ queryKey })` in `onSettled`. Access `queryClient` via `useQueryClient()`.
- **`@tanstack/react-query` v5 optimistic update pattern:**

```typescript
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (dateStr: string) => createEntry(habitId, dateStr),
  onMutate: async (dateStr) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<Set<string>>(queryKey);
    queryClient.setQueryData<Set<string>>(queryKey, (old) => new Set([...(old ?? []), dateStr]));
    return { previous };
  },
  onError: (_err, _dateStr, context) => {
    if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey });
  },
});
```

- **Prisma P2002 catch pattern:**

```typescript
import { Prisma } from '../generated/prisma/client.js';
try {
  const entry = await prisma.dayEntry.create({ ... });
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new AppError(409, 'ALREADY_MARKED', 'This day is already marked');
  }
  throw err;
}
```

- **date-fns v4**: `format(day, 'yyyy-MM-dd')` — already used in CalendarGrid. Consistent key format across lookup and callback.

### References

- [Source: architecture.md §5 — Day Entries POST endpoint, Mark day validation]
- [Source: architecture.md §6 — Optimistic UI for Day Marking, Mutation queueing, State Management]
- [Source: architecture.md §7 — Service Layer Pattern]
- [Source: epics-and-stories.md — E4-S3 acceptance criteria, FR14, FR19, NFR2, NFR15]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking

### Debug Log References

- Client test for optimistic mark initially failed: `onSettled` invalidated the query cache which refetched from the mock returning `[]`, reverting the optimistic update before assertion. Fixed by making `fetchEntries` mock return the entry on subsequent calls.

### Completion Notes List

- Backend `createEntry` service validates ownership first, then date range (start date, future), then catches P2002 for duplicate constraint — all per guardrails.
- Refactored `HabitCalendarPage` entry fetching from manual `useEffect`/`useState` to `@tanstack/react-query` `useQuery` with key `['entries', id, monthStr]`.
- `useMutation` with full optimistic update pattern: `onMutate` snapshots + optimistically adds to Set, `onError` rolls back + shows toast, `onSettled` invalidates cache.
- `pendingDates` tracked via `useState<Set<string>>` for per-cell mutation lock — `DayCell` receives `isMutating` prop showing `opacity-60 pointer-events-none`.
- CalendarGrid guards `onClick` for already-marked days (no-op for tapping marked cells — unmark comes in E4-S4).
- `ErrorToast` auto-dismisses after 3s, positioned at `z-50` bottom-center to avoid modal interference.
- `transition-all duration-150` on DayCell provides smooth color/background animation on mark.

### Change Log

- `server/src/services/entry.service.ts` — Added `createEntry` function with ownership, date range, and unique constraint validation
- `server/src/routes/entry.routes.ts` — Added `POST /` route with Zod body validation (`date` as YYYY-MM-DD)
- `server/src/__tests__/entries.create.test.ts` — 8 integration tests for POST endpoint
- `client/src/services/habitsApi.ts` — Added `createEntry` API function, imported `post`
- `client/src/components/DayCell.tsx` — Added `isMutating` prop, `transition-all duration-150` classes
- `client/src/components/CalendarGrid.tsx` — Added `onDayClick` and `pendingDates` props, guards onClick for marked/inactive days
- `client/src/pages/HabitCalendarPage.tsx` — Refactored to useQuery/useMutation, added optimistic marking, pendingDates state, ErrorToast integration
- `client/src/components/ErrorToast.tsx` — New auto-dismissing error toast component
- `client/src/components/ErrorToast.test.tsx` — 4 tests for ErrorToast
- `client/src/components/DayCell.test.tsx` — Added 3 tests for isMutating and transition classes
- `client/src/components/CalendarGrid.test.tsx` — Added 3 tests for onDayClick and pendingDates
- `client/src/pages/HabitCalendarPage.test.tsx` — Added createEntry mock, 2 tests for optimistic mark and error toast

### File List

- `server/src/services/entry.service.ts` (modified)
- `server/src/routes/entry.routes.ts` (modified)
- `server/src/__tests__/entries.create.test.ts` (new)
- `client/src/services/habitsApi.ts` (modified)
- `client/src/components/DayCell.tsx` (modified)
- `client/src/components/CalendarGrid.tsx` (modified)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/components/ErrorToast.tsx` (new)
- `client/src/components/ErrorToast.test.tsx` (new)
- `client/src/components/DayCell.test.tsx` (modified)
- `client/src/components/CalendarGrid.test.tsx` (modified)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified)

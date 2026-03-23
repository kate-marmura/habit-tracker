# Story 4.2: Fetch and Display Day Entries

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see which days I've marked as done on the calendar,
so that I can visualize my consistency.

## Acceptance Criteria

1. `GET /api/habits/:id/entries?month=YYYY-MM` returns all entries for the specified month
2. Frontend sends `X-Timezone` header with IANA timezone identifier on all date-sensitive requests (NFR15) — already implemented in `api.ts`
3. Frontend fetches entries when calendar mounts and when month changes
4. Marked days display with a checkmark/filled visual state (pink-500 fill with white checkmark per Architecture §6)
5. Unmarked eligible days display as neutral empty squares — no negative indicators (FR18) — already implemented in E4-S1
6. Days before habit `start_date` are visually distinct (grayed/disabled) — already implemented in E4-S1
7. Future days are visually distinct (not markable) — already implemented in E4-S1
8. Loading state shown while entries are being fetched

## Tasks / Subtasks

- [x] Task 1: Create `entry.service.ts` (AC: #1)
  - [x] New `server/src/services/entry.service.ts`
  - [x] `listEntriesByMonth(userId, habitId, month)`: verify habit ownership, query `day_entries` for the given month range, return `{ id, entryDate }[]` with dates formatted as YYYY-MM-DD
  - [x] Month range: `entry_date >= first_day_of_month AND entry_date <= last_day_of_month` using UTC dates
  - [x] Reuse `formatCalendarDate` from `lib/calendar-date.ts` for date formatting
  - [x] Throw `AppError(404, 'NOT_FOUND', 'Habit not found')` if habit doesn't belong to user

- [x] Task 2: Create `entry.routes.ts` (AC: #1)
  - [x] New `server/src/routes/entry.routes.ts`
  - [x] Use `Router({ mergeParams: true })` to access `:id` from parent mount
  - [x] Apply `authenticate` middleware
  - [x] `GET /` — validates `:id` as UUID, validates `month` query param as `YYYY-MM` format via zod, calls `listEntriesByMonth`, returns JSON array
  - [x] Zod schema for `month` query: `z.string().regex(/^\d{4}-\d{2}$/)` with refinement to reject invalid months (e.g., `2026-13`)

- [x] Task 3: Register entry routes (AC: #1)
  - [x] In `server/src/routes/index.ts`: import `entryRoutes` and mount at `/habits/:id/entries`

- [x] Task 4: Backend tests (AC: #1)
  - [x] New `server/src/__tests__/entries.list.test.ts`
  - [x] Setup: create test user, habit, and seed day_entries for a known month
  - [x] Test: returns 200 with correct entries for a given month
  - [x] Test: returns empty array for a month with no entries
  - [x] Test: does not return entries from other months (boundary check)
  - [x] Test: returns 404 for habit belonging to another user
  - [x] Test: returns 401 without authorization
  - [x] Test: returns 422 for invalid month format
  - [x] Test: response shape — each entry has `id` (UUID) and `entryDate` (YYYY-MM-DD)
  - [x] Follow existing test patterns from `habits.list.test.ts`: beforeAll setup, afterAll cleanup, signToken helper

- [x] Task 5: Add `DayEntry` type and API function (AC: #2, #3)
  - [x] In `client/src/types/habit.ts`: add `DayEntry` interface `{ id: string; entryDate: string }`
  - [x] In `client/src/services/habitsApi.ts`: add `fetchEntries(habitId: string, month: string): Promise<DayEntry[]>` calling `GET /api/habits/${habitId}/entries?month=${month}`

- [x] Task 6: Update `DayCell` with marked state (AC: #4)
  - [x] Add `isMarked?: boolean` prop to `DayCell`
  - [x] Marked state styling: `bg-pink-500 text-white font-bold` — most visually prominent cell
  - [x] Render `lucide-react` `Check` icon (16px, `stroke-[3]`) inside the cell when marked, replacing the day number, OR overlay a small checkmark alongside the number (choose: overlay is better for readability)
  - [x] Marked + today: combine `bg-pink-500 text-white ring-2 ring-pink-700` to show both states
  - [x] Ensure marked state takes precedence over default eligible state in the styling cascade

- [x] Task 7: Update `CalendarGrid` to pass `markedDates` to `DayCell` (AC: #4)
  - [x] The `markedDates` prop already exists as `Set<string>` — wire it through
  - [x] In the day rendering loop: `isMarked={markedDates?.has(formatDateString(day))}` where `formatDateString` produces YYYY-MM-DD
  - [x] Use `date-fns` `format(day, 'yyyy-MM-dd')` to convert each day to the lookup key

- [x] Task 8: Integrate entry fetching into `HabitCalendarPage` (AC: #3, #8)
  - [x] Add state: `entries: Set<string>` (set of YYYY-MM-DD strings), `entriesLoading: boolean`
  - [x] Add a `useEffect` that fetches entries when `habit` loads — calls `fetchEntries(id, currentMonth)` where `currentMonth` is derived from the displayed year/month as YYYY-MM
  - [x] Convert response `DayEntry[]` to `Set<string>` of `entryDate` values
  - [x] Pass `markedDates={entries}` to `CalendarGrid`
  - [x] Show loading indicator (subtle spinner or "Loading entries..." text) while `entriesLoading` is true — render the CalendarGrid immediately (skeleton from E4-S1) and overlay or show inline
  - [x] Handle fetch errors gracefully — show error message but still display the empty calendar grid
  - [x] The effect should re-run when month changes (forward-compatible for E4-S5 month navigation)

- [x] Task 9: Client tests (AC: #4, #8)
  - [x] Update `client/src/components/DayCell.test.tsx`: add tests for `isMarked` prop — marked styling applied, checkmark visible
  - [x] Update `client/src/components/CalendarGrid.test.tsx`: add test passing `markedDates` — verify marked days receive marked styling
  - [x] Update `client/src/pages/HabitCalendarPage.test.tsx`: mock `fetchEntries` API call, verify entries are fetched on mount, verify marked dates are passed to CalendarGrid

- [x] Task 10: Verify
  - [x] `npm run lint` and `npm test` pass in both client and server
  - [x] Client build succeeds

## Dev Notes

### Story scope

- **In scope:** Backend GET entries endpoint + service, frontend entry fetching, DayCell marked visual state, CalendarGrid marked-dates wiring, loading state during fetch.
- **Out of scope:** POST entries / tap-to-mark (E4-S3), DELETE entries / tap-to-unmark (E4-S4), month navigation (E4-S5), full DayCell visual state polish and accessibility refinements (E4-S7). This story builds the read path only.

### Existing code to build on

**Backend:**
- **`habit.service.ts`** — pattern to follow: verify ownership via `prisma.habit.findFirst({ where: { id, userId } })`, throw `AppError(404)` if not found. Use `formatCalendarDate` for date output.
- **`habit.routes.ts`** — pattern: zod validation on params/query, `authenticate` middleware, thin route handler delegating to service.
- **`calendar-date.ts`** — has `formatCalendarDate(date: Date): string` (returns YYYY-MM-DD) and `parseCalendarDate(dateStr: string): Date` (parses YYYY-MM-DD to UTC midnight Date). Use these for converting Prisma Date objects.
- **`error-handler.ts`** — `AppError` class for throwing HTTP errors. Also catches `Prisma.PrismaClientKnownRequestError` for P2002 (conflict) and P2025 (not found).
- **`auth.middleware.ts`** — sets `res.locals.userId` from JWT. Already applied in `habit.routes.ts` via `router.use(authenticate)`.
- **`timezone.middleware.ts`** — sets `res.locals.timezone`. Already applied globally in `app.ts`.
- **Prisma schema** — `DayEntry` model: `id` (UUID), `habitId` (UUID FK), `entryDate` (Date), `createdAt` (Timestamptz). Unique constraint on `(habitId, entryDate)`. Index on `(habitId, entryDate)`.
- **Test pattern** from `habits.list.test.ts`: `beforeAll` creates test user with `bcrypt.hash`, generates JWT via `jwt.sign`, seeds test data; `afterAll` cleans up. Supertest against `app`.

**Frontend:**
- **`api.ts`** — `get<T>(path)` already sends `X-Timezone` header and `Authorization: Bearer` header automatically. Use this for the entries fetch.
- **`habitsApi.ts`** — add `fetchEntries` here following the same pattern as `fetchActiveHabits`.
- **`CalendarGrid.tsx`** — already accepts `markedDates?: Set<string>` prop but doesn't use it. Props interface at line 16-21. The prop just needs to be threaded to `DayCell`.
- **`DayCell.tsx`** — currently has props `date, isToday, isBeforeStart, isFuture, onClick`. Add `isMarked`. The styling cascade is: inactive → today → eligible. Insert marked state into this cascade.
- **`HabitCalendarPage.tsx`** — currently fetches habit on mount via `useEffect`. Add a second `useEffect` for entries that depends on `habit` being loaded (need `id` and to know the current month). Currently passes `year={now.getFullYear()} month={now.getMonth() + 1}` — the month string for the API call is `${year}-${String(month).padStart(2, '0')}`.
- **`types/habit.ts`** — add `DayEntry` interface alongside existing `Habit` type.

### Architecture compliance

- **API endpoint** matches Architecture §5 exactly: `GET /api/habits/:id/entries?month=YYYY-MM`
- **Response shape**: array of `{ id, entryDate }` — keep it minimal. The `entryDate` is YYYY-MM-DD string.
- **Indexed query**: the `(habit_id, entry_date)` composite index on `day_entries` powers the month range query efficiently per Architecture §10.
- **Marked visual state** per Architecture §6: "Pink-500 fill with white checkmark — the most prominent element." Use `bg-pink-500 text-white` with a `Check` icon from `lucide-react`.
- **Service layer pattern** per Architecture §7: "Routes are thin — they parse/validate the request and delegate to service functions."
- **File locations** per Architecture §7: `entry.routes.ts` in `server/src/routes/`, `entry.service.ts` in `server/src/services/`.

### Critical implementation guardrails

1. **Entry routes MUST use `mergeParams: true`** — the `:id` param is defined at the mount point (`/habits/:id/entries`), not in the entry router itself. Without `mergeParams`, `req.params.id` will be undefined.
2. **Month query parameter validation** — validate `YYYY-MM` format AND that it's a real month (not `2026-13`). Parse the year and month numbers and verify month is 1-12.
3. **Date range query** — use `gte` (first day of month UTC) and `lte` (last day of month UTC). Compute last day via `new Date(Date.UTC(year, month, 0))` (day 0 of next month = last day of current month). Do NOT use `lt` with first day of next month — Prisma DATE comparison with `lte` on the last day is cleaner and matches the presence-based model.
4. **Do NOT create POST/DELETE entry endpoints** — those belong to E4-S3 and E4-S4. Only create the GET endpoint in this story.
5. **Do NOT introduce `@tanstack/react-query` for entry fetching yet** — use simple `useEffect` + `useState` pattern matching the existing `HabitCalendarPage` habit-loading pattern. E4-S3 will refactor to react-query for optimistic mutations.
6. **DayCell `isMarked` styling must not break existing states** — the priority should be: inactive (before-start/future) > marked > today > eligible. An inactive day should never appear marked. A marked+today day should show a combined state.
7. **Format dates for the `markedDates` Set lookup** — use `date-fns` `format(day, 'yyyy-MM-dd')` to generate the key, matching the YYYY-MM-DD strings returned by the API. Do NOT use `toISOString().slice(0, 10)` on local Date objects (timezone mismatch risk).
8. **Entry route mount order** — in `routes/index.ts`, mount entry routes BEFORE the general habit routes to avoid `:id` catching `entries` as a route segment. Actually, since entries are mounted at `/habits/:id/entries` and habits at `/habits`, there's no conflict — just mount entries via: `router.use('/habits/:id/entries', entryRoutes)` before `router.use('/habits', habitRoutes)`.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Server (new) | `server/src/services/entry.service.ts`, `server/src/routes/entry.routes.ts`, `server/src/__tests__/entries.list.test.ts` |
| Server (modified) | `server/src/routes/index.ts` |
| Client (new) | — |
| Client (modified) | `client/src/types/habit.ts`, `client/src/services/habitsApi.ts`, `client/src/components/DayCell.tsx`, `client/src/components/CalendarGrid.tsx`, `client/src/pages/HabitCalendarPage.tsx`, `client/src/components/DayCell.test.tsx`, `client/src/components/CalendarGrid.test.tsx`, `client/src/pages/HabitCalendarPage.test.tsx` |

### Previous story intelligence

From story 4-1 (Calendar Grid Component):
- `CalendarGrid` already accepts `markedDates?: Set<string>` prop — was added for forward compatibility
- `DayCell` accepts optional `onClick?: () => void` — also forward-compatible
- Date comparison uses local Date objects: `new Date(year, month - 1, day)` — NOT UTC. The CalendarGrid constructs month dates in local time. When generating YYYY-MM-DD keys for the `markedDates` Set, use `date-fns` `format()` which respects the Date's local components.
- Comprehensive ARIA: `role="grid"`, `role="gridcell"`, `role="columnheader"` — maintain this when adding marked state (add `aria-label` annotation like "(marked)" for marked cells)
- All tests passed on first attempt — maintain this standard

### Git intelligence

Most recent commit: `feat(calendar): add CalendarGrid and DayCell components (E4-S1)`. Continue the `feat(calendar):` prefix for this story.

### Latest tech notes

- **date-fns v4**: `format(date, 'yyyy-MM-dd')` returns a YYYY-MM-DD string using the Date's local components (not UTC). This is correct for matching against the `markedDates` Set since CalendarGrid constructs dates in local time via `new Date(year, month - 1, day)`.
- **lucide-react v0.577**: `Check` icon available for the checkmark indicator on marked days. Import as `import { Check } from 'lucide-react'`.
- **Prisma DayEntry queries**: `prisma.dayEntry.findMany({ where: { habitId, entryDate: { gte, lte } } })` — the `entryDate` field is `@db.Date` which maps to PostgreSQL `DATE`. Prisma accepts JavaScript Date objects for comparison. Use UTC midnight dates for the range bounds.
- **Express 5 + mergeParams**: `Router({ mergeParams: true })` is required for sub-routers that need to access parent route parameters. This is standard Express behavior.

### References

- [Source: architecture.md §5 — Day Entries endpoints]
- [Source: architecture.md §6 — DayCell visual states, Design System & Color Palette]
- [Source: architecture.md §7 — Service Layer Pattern, Project Structure]
- [Source: architecture.md §10 — Backend Performance, indexed query]
- [Source: epics-and-stories.md — E4-S2 acceptance criteria]
- [Source: prd.md — FR17, FR18, FR19, NFR15]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus-high-thinking

### Debug Log References

- Server lint caught unused `otherToken` variable — removed it.
- `req.params.id` TypeScript error with `mergeParams` — fixed by typing route handler with `Request<{ id: string }>`.
- HabitCalendarPage test failure — ConfirmModal archive error test failed because `fetchEntries` wasn't mocked and caused an extra `role="alert"` in the DOM. Fixed by adding `fetchEntries: vi.fn().mockResolvedValue([])` to the mock.

### Completion Notes List

- **Backend**: Created `entry.service.ts` with `listEntriesByMonth` — verifies habit ownership, queries `day_entries` for the specified month range using UTC date bounds, returns `{ id, entryDate }[]`
- **Backend**: Created `entry.routes.ts` with `Router({ mergeParams: true })`, Zod validation for UUID `:id` and `YYYY-MM` month query param (rejects invalid months like `2026-13`), mounted at `/habits/:id/entries`
- **Backend**: 9 integration tests covering: correct entries for month, empty month, boundary exclusion, response shape, other-user 404, auth 401, invalid format 422, invalid month number 422, missing param 422
- **Frontend**: Added `DayEntry` type and `fetchEntries` API function
- **Frontend**: Updated `DayCell` with `isMarked` prop — marked state: `bg-pink-500 text-white font-bold` with `Check` icon overlay; marked+today: `bg-pink-500 ring-2 ring-pink-700`; inactive cells never show marked state
- **Frontend**: Wired `CalendarGrid` to pass `markedDates` to `DayCell` using `date-fns` `format(day, 'yyyy-MM-dd')` for Set lookup
- **Frontend**: `HabitCalendarPage` fetches entries via `useEffect` when habit loads, converts `DayEntry[]` to `Set<string>`, passes to CalendarGrid. Shows "Loading entries..." during fetch, inline error alert on failure, renders grid immediately
- ARIA: marked cells include `(marked)` annotation in aria-label

### Change Log

| File | Change |
|------|--------|
| `server/src/services/entry.service.ts` | Created — `listEntriesByMonth` service |
| `server/src/routes/entry.routes.ts` | Created — GET `/` with Zod validation, `mergeParams: true` |
| `server/src/routes/index.ts` | Modified — mounted entry routes at `/habits/:id/entries` |
| `server/src/__tests__/entries.list.test.ts` | Created — 9 integration tests |
| `client/src/types/habit.ts` | Modified — added `DayEntry` interface |
| `client/src/services/habitsApi.ts` | Modified — added `fetchEntries` function |
| `client/src/components/DayCell.tsx` | Modified — added `isMarked` prop with marked/marked+today visual states and Check icon |
| `client/src/components/DayCell.test.tsx` | Modified — added 5 marked-state tests |
| `client/src/components/CalendarGrid.tsx` | Modified — wired `markedDates` prop to DayCell via `format()` |
| `client/src/components/CalendarGrid.test.tsx` | Modified — added markedDates test |
| `client/src/pages/HabitCalendarPage.tsx` | Modified — added entry fetching useEffect, entries state, loading/error display |
| `client/src/pages/HabitCalendarPage.test.tsx` | Modified — added fetchEntries mock, 2 new tests (entries display, loading state) |

### File List

- `server/src/services/entry.service.ts` (new)
- `server/src/routes/entry.routes.ts` (new)
- `server/src/routes/index.ts` (modified)
- `server/src/__tests__/entries.list.test.ts` (new)
- `client/src/types/habit.ts` (modified)
- `client/src/services/habitsApi.ts` (modified)
- `client/src/components/DayCell.tsx` (modified)
- `client/src/components/DayCell.test.tsx` (modified)
- `client/src/components/CalendarGrid.tsx` (modified)
- `client/src/components/CalendarGrid.test.tsx` (modified)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified)

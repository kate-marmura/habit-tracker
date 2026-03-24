# Story 5.1: Statistics Calculation API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a statistics endpoint that computes streaks and completion rate from day_entries,
so that the frontend can display accurate per-habit stats.

## Acceptance Criteria

1. **Stats endpoint exists:** `GET /api/habits/:id/stats` returns `{ currentStreak, longestStreak, completionRate, totalDays, completedDays }`.
2. **Current streak calculation:** Count backward from today (if marked) or yesterday (if today not marked but yesterday was); stop at first gap or `start_date`. Habit created today with no marks = 0. Uses client timezone via `X-Timezone` header to resolve "today" (NFR15).
3. **Longest streak calculation:** Sort all entry dates ascending, walk the list counting consecutive days, track the maximum run. No entries = 0.
4. **Completion rate:** `completedDays / totalDays` where `totalDays` = days from `start_date` through today (inclusive, resolved via client timezone) and `completedDays` = count of `day_entries` for this habit. Return as a decimal (e.g., `0.95`). If `totalDays` is 0, return `0`.
5. **Ownership check:** Returns `404` if habit doesn't belong to the authenticated user.
6. **Computation is query-time only:** Uses `day_entries` rows directly — no separate streak table, no caching layer (Architecture §4 Design Decisions).

## Tasks / Subtasks

- [x] Task 1: Create stats service (AC: #1, #2, #3, #4, #6)
  - [x] Create `server/src/services/stats.service.ts`
  - [x] Implement `getHabitStats(userId: string, habitId: string, timezone: string)` function
  - [x] Ownership check: `prisma.habit.findFirst({ where: { id: habitId, userId } })` — throw `AppError(404, 'NOT_FOUND', 'Habit not found')` if missing
  - [x] Fetch all entry dates: `prisma.dayEntry.findMany({ where: { habitId }, select: { entryDate: true }, orderBy: { entryDate: 'asc' } })`
  - [x] Convert entry dates to `YYYY-MM-DD` strings via `formatCalendarDate()`
  - [x] Implement `currentStreak` using `getTodayInTimezone(timezone)`, counting backward from today/yesterday through consecutive dates, stopping at gap or `startDate`
  - [x] Implement `longestStreak` by walking sorted dates and tracking max consecutive run
  - [x] Compute `totalDays` as days from `startDate` through today (inclusive) — use UTC date math to avoid off-by-one
  - [x] Compute `completedDays` as `entries.length`
  - [x] Compute `completionRate` as `totalDays > 0 ? completedDays / totalDays : 0`
  - [x] Return `{ currentStreak, longestStreak, completionRate, totalDays, completedDays }`

- [x] Task 2: Create stats route (AC: #1, #5)
  - [x] Add route handler in `server/src/routes/habit.routes.ts` (stats is a sub-resource of habits)
  - [x] `GET /:id/stats` — validate `:id` with existing `habitIdParam` zod schema
  - [x] Call `getHabitStats(res.locals.userId, id, res.locals.timezone)`
  - [x] Return 200 with stats JSON
  - [x] Route must be placed BEFORE the generic `GET /:id` handler to avoid param collision

- [x] Task 3: Write unit tests for stats service (AC: #2, #3, #4)
  - [x] Create `server/src/__tests__/stats.service.test.ts`
  - [x] Test: habit with no entries → `{ currentStreak: 0, longestStreak: 0, completionRate: 0, totalDays: ?, completedDays: 0 }`
  - [x] Test: habit with today marked → currentStreak starts from today
  - [x] Test: habit with yesterday marked but not today → currentStreak starts from yesterday
  - [x] Test: habit with gap in entries → streak stops at gap
  - [x] Test: habit with all days marked → streak equals totalDays
  - [x] Test: longestStreak with multiple runs → returns the longest
  - [x] Test: completionRate calculation accuracy
  - [x] Test: habit created today with zero marks → currentStreak 0, totalDays 1, completionRate 0
  - [x] Test: timezone affects "today" resolution (mock different timezone)
  - [x] Test: `totalDays` is 0 edge case (shouldn't happen naturally but guard against division by zero)

- [x] Task 4: Write integration tests for stats route (AC: #1, #5)
  - [x] Create `server/src/__tests__/stats.integration.test.ts` (or add to existing entries test file if appropriate)
  - [x] Test: authenticated request returns 200 with correct stats shape
  - [x] Test: unauthenticated request returns 401
  - [x] Test: request for another user's habit returns 404
  - [x] Test: request for non-existent habit returns 404
  - [x] Test: X-Timezone header is respected

- [x] Task 5: Verify
  - [x] `npm run lint` passes in server
  - [x] `npm test` passes in server (all existing + new tests)
  - [x] Server build succeeds (`npm run build` in server)
  - [x] Manual test: `GET /api/habits/:id/stats` returns correct JSON shape with proper values

## Dev Notes

### Architecture references

- **Streak algorithm:** Architecture §7 provides pseudocode for `currentStreak` and `longestStreak` — follow it exactly.
- **No separate streaks table:** Architecture §4 Design Decisions — compute from `day_entries` at query time. At ≤3,650 rows/user/year, this is trivial.
- **API contract:** Architecture §5 Statistics endpoints — response shape is `{ currentStreak, longestStreak, completionRate, totalDays, completedDays }`.
- **Timezone strategy:** Architecture §4 Timezone Strategy — use `X-Timezone` header via `res.locals.timezone` (already wired by `timezoneMiddleware` in `app.ts`).

### Existing patterns to follow

**Service structure:** Follow `entry.service.ts` exactly:
- Import `prisma` from `../lib/prisma.js`
- Import `AppError` from `../middleware/error-handler.js`
- Import `formatCalendarDate`, `getTodayInTimezone` from `../lib/calendar-date.js`
- Ownership check via `prisma.habit.findFirst({ where: { id: habitId, userId } })` before any operation
- All entry dates come from Prisma as `Date` objects → convert with `formatCalendarDate()` to `YYYY-MM-DD` strings for comparison

**Route structure:** The stats endpoint is a sub-resource of habits. Add it to `habit.routes.ts` (NOT a separate `stats.routes.ts`), since it follows the pattern `GET /api/habits/:id/stats`. Place the route BEFORE `GET /:id` to avoid Express treating "stats" as an `:id` parameter.

**Date arithmetic:** Use `parseCalendarDate()` from `calendar-date.ts` for UTC date construction. For computing day differences, use UTC-based math:
```typescript
const start = parseCalendarDate(startDateStr);
const end = parseCalendarDate(todayStr);
const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
```

**Zod validation:** The `habitIdParam` schema already exists in `habit.routes.ts` — reuse it for the `:id` param.

### Critical implementation guardrails

1. **Do NOT create a `stats.routes.ts` file.** Add the route to `habit.routes.ts` to match the existing pattern where stats is a habit sub-resource.
2. **Do NOT create a streak cache or materialized view.** Compute from `day_entries` on every request per Architecture §4.
3. **Do NOT add new Prisma models or migration.** This story uses existing `day_entries` and `habits` tables only.
4. **Do NOT add `parseCalendarDate` to an npm library or import `date-fns` in the server.** Use the existing `calendar-date.ts` utilities.
5. **`completionRate` must be a decimal (0.0–1.0),** not a percentage (0–100). The frontend will format it.
6. **Handle division by zero:** If `totalDays` is 0 (edge case: habit start date is in the future somehow), return `completionRate: 0`.
7. **Consecutive day check:** When walking sorted dates for streak calculation, "consecutive" means the next date is exactly 1 calendar day after the previous. Use UTC date math to avoid timezone drift.
8. **Route ordering matters:** Express matches routes top-down. `GET /:id/stats` must be registered before `GET /:id` in `habit.routes.ts`, otherwise `:id` will capture "stats" literally. Looking at the current file, place it after `GET /archived` but before `GET /:id`.
9. **Entry dates from Prisma are UTC midnight `Date` objects.** Always use `formatCalendarDate()` to convert to `YYYY-MM-DD` strings before any comparison or calculation.
10. **`startDate` from Prisma is also a `Date` object** (`@db.Date`) — convert with `formatCalendarDate()` before comparison.

### Streak algorithm (from Architecture §7)

```
currentStreak(habitId, timezone):
  today = getTodayInTimezone(timezone)  // YYYY-MM-DD string
  entries = getAllEntryDates(habitId) sorted descending  // YYYY-MM-DD strings

  if today is in entries:
    cursor = today
  else if yesterday is in entries:
    cursor = yesterday
  else:
    return 0

  streak = 0
  while cursor is in entries AND cursor >= habit.startDate:
    streak++
    cursor = cursor - 1 day

  return streak

longestStreak(habitId):
  entries = getAllEntryDates(habitId) sorted ascending  // YYYY-MM-DD strings
  if empty: return 0

  longest = 1, current = 1
  for i = 1 to entries.length - 1:
    if entries[i] == entries[i-1] + 1 day:
      current++
      longest = max(longest, current)
    else:
      current = 1

  return longest
```

**Implementation tip:** For the "cursor in entries" lookup and "entries[i-1] + 1 day" comparison, convert `YYYY-MM-DD` strings to a `Set<string>` for O(1) lookups. For "cursor - 1 day" and "+1 day", parse to Date, adjust, then format back.

### Previous story intelligence

From the most recent story (4-8 UI Polish):
- `formatCalendarDate` in `calendar-date.ts` is used throughout the server for all date formatting — this is the only way dates should be converted
- `getTodayInTimezone` is already used in `entry.service.ts` — same pattern for stats
- Test patterns: server tests use Jest with Supertest for integration tests, with test database setup in `server/src/__tests__/setup.ts`
- Ownership checks are consistently done before any data operation

### Git intelligence

Recent commit pattern: `feat(category): description (E#-S#)`. For this story, use:
```
feat(stats): statistics calculation API endpoint (E5-S1)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Server (new) | `server/src/services/stats.service.ts`, `server/src/__tests__/stats.service.test.ts`, `server/src/__tests__/stats.integration.test.ts` |
| Server (modified) | `server/src/routes/habit.routes.ts` (add GET /:id/stats route) |

### What this story does NOT include

- No frontend changes (StatsPanel UI is story 5-2)
- No client-side API functions (added in 5-2)
- No React Query hooks for stats (added in 5-2/5-3)
- No new database tables or migrations
- No caching layer

### References

- [Source: architecture.md §4 — Design Decisions (no streaks table, presence-based day_entries)]
- [Source: architecture.md §4 — Timezone Strategy]
- [Source: architecture.md §5 — Statistics endpoints, response shape]
- [Source: architecture.md §7 — Streak Calculation Algorithm pseudocode]
- [Source: architecture.md §7 — Backend Project Structure (stats.service.ts)]
- [Source: epics-and-stories.md — E5-S1 acceptance criteria]
- [Source: prd.md — FR21, FR22, FR23 (streak, longest streak, completion rate)]
- [Source: server/src/services/entry.service.ts — ownership check and date handling patterns]
- [Source: server/src/lib/calendar-date.ts — date utilities]
- [Source: server/src/routes/habit.routes.ts — route registration patterns]

## Dev Agent Record

### Agent Model Used

Cursor Composer

### Debug Log References

(none)

### Completion Notes List

- Added `stats.service.ts` with `getHabitStats`, calendar helpers, `computeCurrentStreak`, and `computeLongestStreak`; ownership via `habit.findFirst`, entries via `dayEntry.findMany`; `completionRate` is 0 when `totalDays === 0`.
- Registered `GET /:id/stats` in `habit.routes.ts` before `GET /:id`, using `habitIdParam` and `res.locals.timezone`.
- Unit tests in `stats.service.test.ts` cover pure date/streak logic; `stats.integration.test.ts` covers HTTP contract, ownership, `completionRate` / streaks against real data, habit with no entries, and `X-Timezone` acceptance (Jest ESM + `jest.mock` for Prisma did not yield stable `jest.fn()` instances for isolated `getHabitStats` tests).
- Verified in `server/`: `npm test`, `npm run lint`, `npm run build`.
- **Post–code review:** `computeCompletionRate` clamps `completionRate` to at most `1` when `completedDays > totalDays` (defensive against inconsistent data); unit tests added.

### File List

- `server/src/services/stats.service.ts` (new)
- `server/src/routes/habit.routes.ts` (modified)
- `server/src/__tests__/stats.service.test.ts` (new)
- `server/src/__tests__/stats.integration.test.ts` (new)

## Change Log

- **2026-03-24:** Story 5.1 implemented — statistics API, tests, sprint status → review.

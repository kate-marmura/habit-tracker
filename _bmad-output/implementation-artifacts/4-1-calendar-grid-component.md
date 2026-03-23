# Story 4.1: Calendar Grid Component

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a monthly calendar grid for my habit,
so that I can view my progress at a glance.

## Acceptance Criteria

1. `CalendarGrid` component renders a 7-column CSS Grid layout (Sun–Sat)
2. Uses `date-fns` for month boundary calculations (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`)
3. Leading/trailing empty cells provide correct weekday alignment
4. Day-of-week headers displayed (S, M, T, W, T, F, S)
5. Current day has a distinct visual highlight (pink-50 background with pink-500 border ring per Architecture §6)
6. Calendar renders within 500ms including all day markers (NFR1)
7. Calendar grid is usable and readable at phone screen widths (375px)
8. Touch targets are ≥44x44px on mobile

## Tasks / Subtasks

- [x] Task 1: Create `DayCell` component (AC: #5, #7, #8)
  - [x] New `client/src/components/DayCell.tsx`
  - [x] Props: `date: Date`, `isToday: boolean`, `isBeforeStart: boolean`, `isFuture: boolean`
  - [x] Render day number from `date` using `getDate()`
  - [x] Today state: `bg-pink-50 ring-2 ring-pink-500` — most distinctive cell
  - [x] Before-start and future states: `bg-surface text-muted` — clearly inactive, not interactive
  - [x] Eligible (default) state: `bg-background border border-border` — neutral, interactive
  - [x] Min size 44x44px via `min-h-[44px] min-w-[44px]` — meets touch target requirement
  - [x] `aspect-square` for consistent cell proportions
  - [x] `cursor-default` on inactive cells, no pointer events

- [x] Task 2: Create `CalendarGrid` component (AC: #1–#4, #6, #7)
  - [x] New `client/src/components/CalendarGrid.tsx`
  - [x] Props: `year: number`, `month: number` (1-indexed, January=1), `habitStartDate: string` (YYYY-MM-DD)
  - [x] Compute month days using `date-fns`: `startOfMonth`, `endOfMonth`, `eachDayOfInterval`
  - [x] Compute leading empty cells: `getDay(startOfMonth(date))` gives 0-6 for Sun-Sat
  - [x] Render header row: `['S','M','T','W','T','F','S']` in a `grid-cols-7` grid
  - [x] Render leading empty `div` cells, then a `DayCell` for each day of the month
  - [x] Determine `isToday` via `date-fns` `isToday()`
  - [x] Determine `isBeforeStart` by comparing day to parsed `habitStartDate`
  - [x] Determine `isFuture` by comparing day to today
  - [x] Use CSS Grid: `grid grid-cols-7 gap-1`
  - [x] Memoize day list computation with `useMemo` to ensure <500ms render

- [x] Task 3: Integrate `CalendarGrid` into `HabitCalendarPage` (AC: #1, #6)
  - [x] Replace the `"Calendar coming next"` placeholder `div` with `CalendarGrid`
  - [x] Pass current year/month as defaults (today's year/month)
  - [x] Pass `habit.startDate` as `habitStartDate`
  - [x] Wrap in `max-w-2xl` container consistent with page layout

- [x] Task 4: Client tests
  - [x] `client/src/components/DayCell.test.tsx`: renders day number; today styling; before-start styling; future styling; eligible default styling
  - [x] `client/src/components/CalendarGrid.test.tsx`: renders 7 day-of-week headers; renders correct number of day cells for a known month; leading empty cells align first day correctly; today is highlighted; before-start-date days are inactive-styled
  - [x] Update `client/src/pages/HabitCalendarPage.test.tsx`: verify CalendarGrid renders when habit loads successfully (no more "Calendar coming next" text)

- [x] Task 5: Verify
  - [x] `npm run lint`, `npm test`, client build all pass

## Dev Notes

### Story scope

- **In scope:** `CalendarGrid` layout component, `DayCell` presentational component, integration into `HabitCalendarPage`, basic day states (today, before-start, future, eligible).
- **Out of scope:** Data fetching for day entries (E4-S2), tap-to-mark/unmark (E4-S3/S4), month navigation arrows (E4-S5), habit switching (E4-S6), full visual state system for marked/unmarked days (E4-S7). The grid should be **ready to accept** entry data and click handlers in future stories — use extensible props but don't implement unused functionality.

### Existing code to build on

- **`HabitCalendarPage.tsx`** already loads the habit via `fetchHabitById(id)` and displays `habit.name`, `habit.description`, `habit.startDate`. Replace the placeholder section (lines ~142–148: the `text-center py-16` div with "Calendar coming next") with the new `CalendarGrid`.
- **`date-fns` v4.1.0** already installed in client — import from `'date-fns'` directly (tree-shakeable). Key functions: `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `getDay`, `isToday`, `isBefore`, `isAfter`, `getDate`, `parseISO`.
- **`@tanstack/react-query` v5.91.3** already installed — not needed for this story (no data fetching), but will be used in E4-S2/S3.
- **Tailwind CSS v4** with custom theme in `client/src/index.css` — use the project's custom color tokens (`bg-background`, `bg-surface`, `text-muted`, `border-border`, `bg-pink-50`, `ring-pink-500`, etc.). Do NOT use raw hex colors; use the theme tokens.
- **Habit type** in `client/src/types/habit.ts`: `{ id, name, description, startDate, isArchived, createdAt, updatedAt }`. The `startDate` is a `string` in YYYY-MM-DD format.

### Architecture compliance

- **Custom CSS Grid** — Architecture §6 explicitly states: "The calendar grid is custom-built (not a third-party calendar library) for full control over the visual experience." Do NOT install react-calendar, FullCalendar, or any third-party calendar package.
- **date-fns for date math** — Architecture §2 specifies date-fns. Do NOT use moment.js, dayjs, or native Date arithmetic for month boundaries.
- **DayCell visual states** per Architecture §6 color palette:
  - Today: `bg-pink-50` background with `ring-2 ring-pink-500` border ring
  - Before start date / future: `bg-surface` (grey-50) background, `text-muted` (grey-400) text
  - Eligible (default): `bg-background` (white), `border border-border` (grey-200)
  - Hover on eligible: `hover:bg-pink-50` transition (prepare for future tap-to-mark)
- **Touch targets** — Architecture §6: "Touch targets ≥ 44x44px (responsive design requirement)". Enforce with Tailwind min-height/width.
- **Component hierarchy** — CalendarGrid → DayCell matches Architecture §6 component tree under `HabitCalendarPage`.

### Critical implementation guardrails

1. **Do NOT add month navigation** — E4-S5 handles that. The CalendarGrid receives year/month as props and renders that single month. HabitCalendarPage passes today's year/month as the initial default.
2. **Do NOT add click/tap handlers on DayCell** — E4-S3 handles tap-to-mark. DayCell should accept an optional `onClick` prop typed as `(() => void) | undefined` for forward compatibility, but do not wire any handler logic.
3. **Do NOT fetch day entries** — E4-S2 handles data loading. CalendarGrid should accept an optional `markedDates?: Set<string>` prop (set of YYYY-MM-DD strings) for forward compatibility, defaulting to an empty Set, but don't fetch or display marks yet.
4. **Parse `startDate` carefully** — The habit's `startDate` is a YYYY-MM-DD string. Use `date-fns` `parseISO` to convert it. Compare dates by constructing Date objects at UTC midnight to avoid timezone-induced off-by-one errors. Use a consistent approach: `parseISO('2026-03-01')` gives midnight UTC which is safe for date-only comparisons.
5. **Use `date-fns` `startOfDay` for today comparison** — When checking `isToday`, use `date-fns` `isToday()` which handles local time correctly. For `isBefore`/`isAfter` comparisons against start date, compare at date-only granularity (strip time components).
6. **Component file naming** — Follow existing pattern: `client/src/components/CalendarGrid.tsx` and `client/src/components/DayCell.tsx`. Tests as `CalendarGrid.test.tsx` and `DayCell.test.tsx` co-located in the same directory.
7. **Do NOT remove** the habit description and start date display below the calendar — keep them or incorporate them into the calendar page layout.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/components/CalendarGrid.tsx`, `client/src/components/DayCell.tsx`, `client/src/components/CalendarGrid.test.tsx`, `client/src/components/DayCell.test.tsx` |
| Client (modified) | `client/src/pages/HabitCalendarPage.tsx`, `client/src/pages/HabitCalendarPage.test.tsx` |

### Previous story intelligence

From story 3-8 (most recent completed story):
- Modal shell pattern established: `fixed inset-0 bg-black/40`, centered card, `role="dialog"`, `aria-modal`, Escape/backdrop close
- State-driven UI pattern: parent page manages modal state via `useState`, passes callbacks to child components
- Test pattern: Vitest + React Testing Library with `@testing-library/user-event` for interactions
- All lint, tests, and builds passed on first attempt — maintain this standard
- `lucide-react` v0.577 available for icons if needed

### Git intelligence

Recent commits follow the pattern: `feat(habits): <description>`. The calendar work would be `feat(calendar): <description>`.

Key files modified in Epic 3:
- Components are standalone `.tsx` files in `client/src/components/`
- Pages use `useEffect` for data loading with `cancelled` flag pattern for cleanup
- API functions are thin wrappers in `client/src/services/habitsApi.ts`
- Test files co-located with components as `*.test.tsx`

### Latest tech notes

- **date-fns v4**: Import all functions directly from `'date-fns'`. No sub-path imports needed (e.g., `import { startOfMonth, endOfMonth } from 'date-fns'`). v4 is fully ESM and tree-shakeable.
- **React 19**: No special considerations for this story. Standard function components with hooks.
- **Tailwind CSS v4**: Custom theme defined in `@theme` block in `index.css`. Use `bg-pink-50`, `ring-pink-500`, `bg-surface`, `text-muted`, `border-border`, `bg-background`, `text-text`, `text-text-secondary` tokens.

### Responsive design notes

- At 375px width with `max-w-2xl mx-auto px-4` layout, available grid width is ~343px. With 7 columns and `gap-1` (4px), each cell gets ~45px — just above the 44px touch target minimum.
- Use `text-sm` or `text-xs` for day numbers to fit within cells at small widths.
- Day-of-week headers should use single-letter abbreviations (S, M, T, W, T, F, S) to conserve space.

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus-high-thinking

### Debug Log References

None — all lint, tests, and builds passed on first attempt.

### Completion Notes List

- Created `DayCell` component with four visual states: today (pink-50 + ring-pink-500), before-start (surface/muted/cursor-default), future (surface/muted), eligible (background/border with hover:bg-pink-50 transition)
- All cells enforce 44x44px minimum touch targets via `min-h-[44px] min-w-[44px]` and use `aspect-square`
- `DayCell` accepts optional `onClick` prop for forward compatibility with E4-S3 tap-to-mark
- Created `CalendarGrid` component using `date-fns` for month boundary calculation (startOfMonth, endOfMonth, eachDayOfInterval)
- CalendarGrid renders 7-column CSS Grid with S/M/T/W/T/F/S headers and correct leading blank cells for weekday alignment
- Day list computation memoized with `useMemo`
- CalendarGrid accepts optional `markedDates?: Set<string>` prop for forward compatibility with E4-S2
- Integrated CalendarGrid into HabitCalendarPage, replacing the "Calendar coming next" placeholder
- Passes current year/month and habit.startDate; preserves description and start date display below calendar
- Comprehensive ARIA: `role="grid"`, `role="gridcell"`, `role="columnheader"`, aria-labels with month/year context and "(today)" annotation

### Change Log

| File | Change |
|------|--------|
| `client/src/components/DayCell.tsx` | Created — single-day cell with visual states |
| `client/src/components/DayCell.test.tsx` | Created — 8 tests |
| `client/src/components/CalendarGrid.tsx` | Created — monthly grid component |
| `client/src/components/CalendarGrid.test.tsx` | Created — 8 tests |
| `client/src/pages/HabitCalendarPage.tsx` | Modified — replaced placeholder with CalendarGrid |
| `client/src/pages/HabitCalendarPage.test.tsx` | Modified — added CalendarGrid rendering test |

### File List

- `client/src/components/DayCell.tsx` (new)
- `client/src/components/DayCell.test.tsx` (new)
- `client/src/components/CalendarGrid.tsx` (new)
- `client/src/components/CalendarGrid.test.tsx` (new)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified)

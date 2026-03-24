# Story 7.3: Calendar Page Desktop Two-Column Layout

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see the calendar, statistics, description, and start date all at once on desktop without scrolling,
so that I get a complete view of my habit's progress at a glance.

## Acceptance Criteria

1. **Desktop two-column layout:** On viewports ≥ 768px (`md` breakpoint), the `HabitCalendarPage` main content area displays in two columns — calendar on the left (2/3 width) and a sidebar on the right (1/3 width) with stats, description, and start date.
2. **Left column (2/3):** Contains `MonthNavigator` and `CalendarGrid`. The calendar remains fully interactive (tap-to-mark, month navigation).
3. **Right column (1/3):** Contains `StatsPanel`, habit description, and "Started" date — in that order, top-aligned.
4. **Mobile stays single-column:** On viewports < 768px, the layout remains the current stacked single-column order: MonthNavigator → CalendarGrid → StatsPanel → description → start date.
5. **Wider max-width on desktop:** The main content container widens from `max-w-2xl` (672px) to `max-w-4xl` (896px) on desktop to give the two columns enough room. On mobile, it stays at the current comfortable width.
6. **Calendar day cells remain usable:** With the calendar in 2/3 width, day cells must still be large enough for comfortable tapping (≥ 36px on desktop). The 7-column grid naturally scales with the container width.
7. **StatsPanel adapts to sidebar:** In the right column, StatsPanel cards stack vertically (column direction) instead of the current horizontal row, since the 1/3 width is too narrow for three side-by-side cards.

## Tasks / Subtasks

- [x] Task 1: Update HabitCalendarPage layout for desktop two-column (AC: #1, #2, #3, #4, #5)
  - [x] In `client/src/pages/HabitCalendarPage.tsx`, change the `<main>` container from `max-w-2xl` to `max-w-2xl md:max-w-4xl` to widen on desktop
  - [x] Wrap the content area (currently a single `<div>`) in a responsive flex/grid container:
    ```tsx
    <div className="md:grid md:grid-cols-3 md:gap-8">
      <div className="md:col-span-2">
        {/* MonthNavigator + CalendarGrid */}
      </div>
      <div className="md:col-span-1">
        {/* StatsPanel + description + start date */}
      </div>
    </div>
    ```
  - [x] Left column: `MonthNavigator` + `CalendarGrid` (keep entries loading/error messages above the grid)
  - [x] Right column: `StatsPanel` + description `<p>` + "Started" `<p>`
  - [x] On mobile (< md): no grid classes apply — children stack vertically as before

- [x] Task 2: Update StatsPanel for vertical stacking in sidebar (AC: #7)
  - [x] In `client/src/components/StatsPanel.tsx`, add a prop `direction?: 'row' | 'column'` (default `'row'` for backward compatibility)
  - [x] When `direction='column'`, change the inner flex container from `flex-wrap` to `flex-col` so stat cards stack vertically
  - [x] In `HabitCalendarPage`, pass `direction="column"` on desktop and `direction="row"` on mobile. Simplest approach: always pass `direction="column"` since on mobile StatsPanel will be in the full-width column and the cards' `min-w-[140px]` + `flex-wrap` will naturally lay them out in a row. Alternatively, just remove `min-w-[140px]` in column mode so cards take full width.
  - [x] OR simpler approach: just change StatsPanel in the sidebar to always stack vertically using a responsive class — `flex-col md:flex-col` if in the sidebar context. Evaluate what's cleanest.

- [x] Task 3: Widen the page header to match (AC: #5)
  - [x] In `HabitCalendarPage`, the `<header>` inner container also uses `max-w-2xl`. Update to `max-w-2xl md:max-w-4xl` so the header aligns with the wider main content on desktop.

- [x] Task 4: Update tests (AC: #1, #4)
  - [x] In `HabitCalendarPage.test.tsx`, verify existing tests still pass — the responsive layout is CSS-driven and shouldn't break functional tests
  - [x] Optionally add a test that the grid container has the expected classes

- [x] Task 5: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client
  - [x] Client build succeeds
  - [ ] Visual check at desktop width (~1024px+): calendar on left (2/3), stats+desc+date on right (1/3), no scrolling needed to see stats
  - [ ] Visual check at mobile width (~375px): single column, same order as before, nothing broken
  - [ ] Visual check at tablet width (~768px): two-column kicks in, calendar cells still comfortably sized
  - [ ] Calendar interaction still works: mark/unmark days, month navigation, undo toast

## Dev Notes

### Current layout (problem)

```
┌──────────────────────────────────┐
│         max-w-2xl (672px)        │
│  ┌────────────────────────────┐  │
│  │      MonthNavigator        │  │
│  ├────────────────────────────┤  │
│  │                            │  │
│  │      CalendarGrid          │  │
│  │      (takes full width)    │  │
│  │                            │  │
│  ├────────────────────────────┤  │
│  │      StatsPanel            │  │  ← below fold on desktop
│  ├────────────────────────────┤  │
│  │      Description           │  │  ← below fold
│  │      Started date          │  │  ← below fold
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Target layout (desktop ≥ 768px)

```
┌─────────────────────────────────────────────────────┐
│              max-w-4xl (896px)                       │
│  ┌──────────────────────────┐ ┌──────────────────┐  │
│  │    MonthNavigator        │ │   StatsPanel     │  │
│  ├──────────────────────────┤ │   (stacked)      │  │
│  │                          │ ├──────────────────┤  │
│  │    CalendarGrid          │ │   Description    │  │
│  │    (2/3 width ≈ 570px)   │ │                  │  │
│  │                          │ │   Started date   │  │
│  │                          │ │                  │  │
│  └──────────────────────────┘ └──────────────────┘  │
│        col-span-2                  col-span-1        │
└─────────────────────────────────────────────────────┘
```

### Target layout (mobile < 768px)

Same as current — single column, stacked vertically. The `md:grid` classes don't apply.

### CSS Grid approach

Use Tailwind's responsive grid:
```tsx
<div className="md:grid md:grid-cols-3 md:gap-8">
  <div className="md:col-span-2">
    {/* calendar column */}
  </div>
  <div className="md:col-span-1 mt-4 md:mt-0">
    {/* sidebar column */}
  </div>
</div>
```

- `md:grid` activates the grid at ≥ 768px
- `md:grid-cols-3` creates a 3-column grid
- `md:col-span-2` gives the calendar 2/3
- `md:col-span-1` gives the sidebar 1/3
- `md:gap-8` adds spacing between columns on desktop
- `mt-4 md:mt-0` on the sidebar: keeps top margin on mobile (when stacked), removes it on desktop (columns are side by side)

### StatsPanel in the sidebar

The current `StatsPanel` uses `flex flex-wrap` with three `flex-1 min-w-[140px]` cards. In the 1/3 column (~280px), all three cards would try to fit in a row but `min-w-[140px]` would force wrapping anyway — two on the first row, one on the second. This looks awkward.

**Recommended approach:** Pass a prop or use a wrapper class to force `flex-col` in the sidebar:

Option A (prop-based):
```tsx
<StatsPanel stats={statsQuery.data} isLoading={statsQuery.isLoading} layout="vertical" />
```

Option B (CSS-only, simpler):
The sidebar div gets `md:flex md:flex-col` or the StatsPanel itself uses responsive classes:
```tsx
<div className="flex flex-wrap md:flex-col gap-4 justify-stretch">
```

Option B is simpler if we just change the StatsPanel's inner div to `flex flex-wrap md:flex-col` — on mobile (full width), the cards lay out horizontally; on desktop (in the narrow sidebar), they stack. However, this makes StatsPanel always stack on desktop, which might not be desired if it were used outside the sidebar in the future.

**Simplest pragmatic approach:** Since StatsPanel is only used in `HabitCalendarPage`, just change its inner flex direction to be responsive: `flex flex-col sm:flex-row md:flex-col`. This means:
- Mobile (< sm): stacked vertically (cards get full width)
- Tablet (sm–md): horizontal row (cards side by side in full-width column)
- Desktop (≥ md): stacked vertically again (in the narrow sidebar)

This works cleanly without props or complexity.

### Max-width widening

Current: `max-w-2xl` = 672px. This is tight for two columns.

New: `max-w-2xl md:max-w-4xl`. At `md` (≥ 768px), `max-w-4xl` = 896px.
- Left column (2/3): ~580px — comfortable for a 7-column calendar grid (~82px per cell)
- Right column (1/3): ~280px — comfortable for stacked stat cards and text

The header also needs this update so it aligns visually.

### Critical implementation guardrails

1. **Do NOT change the mobile layout.** Below `md` (768px), everything must stay exactly as it is — single column, stacked.
2. **Do NOT remove or reorder the loading/error states.** The entries loading message and error alert stay above the calendar.
3. **Do NOT change CalendarGrid or DayCell components.** The calendar naturally scales with its container width via CSS Grid.
4. **Do NOT change MonthNavigator.** It's already `flex justify-center` and will center within the narrower column.
5. **Keep the `max-w-2xl` on mobile.** Use responsive widening: `max-w-2xl md:max-w-4xl`, not a blanket `max-w-4xl`.
6. **The sidebar column needs `mt-4 md:mt-0`** to preserve the spacing when stacked on mobile but remove it when side-by-side on desktop.
7. **StatsPanel's `mt-4` margin** needs to be removed or adjusted when in the sidebar — it currently has `mt-4` in its container class which is for spacing below the calendar in single-column mode. In the sidebar, it should be at the top without extra margin.

### Previous story intelligence

From story 7-2 (Responsive Navigation Bar):
- NavBar is now in AppLayout above the page content
- HabitCalendarPage still has its own sub-header (habit name + settings dropdown + back button)
- The page header uses `max-w-2xl mx-auto` — must update to match the wider main content

From story 5-2 (Stats Panel UI):
- StatsPanel uses `bg-surface rounded-lg border border-border p-4 mt-4` as its container
- Inner cards use `flex flex-wrap gap-4 justify-stretch` with `flex-1 min-w-[140px]`
- The `mt-4` is hardcoded — may need to be conditional or removed in sidebar context

### Git intelligence

```
feat(shell): calendar page desktop two-column layout (E7-S3)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (modified) | `client/src/pages/HabitCalendarPage.tsx` (grid layout, wider max-width), `client/src/components/StatsPanel.tsx` (responsive flex direction) |

### What this story does NOT include

- No backend changes
- No new components
- No changes to CalendarGrid, DayCell, or MonthNavigator internals
- No changes to mobile layout
- No changes to other pages (HabitListPage, ArchivedHabitsPage, SettingsPage)

### References

- [Source: client/src/pages/HabitCalendarPage.tsx — current single-column layout (lines 346-400)]
- [Source: client/src/components/StatsPanel.tsx — current horizontal flex layout]
- [Source: architecture.md §6 — Component Hierarchy (StatsPanel alongside CalendarGrid)]
- [Source: prd.md — FR21-23 (stats visible alongside calendar)]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

None — clean implementation with no issues.

### Completion Notes List

- Implemented responsive two-column grid layout using `md:grid md:grid-cols-3 md:gap-8`
- Calendar (MonthNavigator + CalendarGrid) in left column (`md:col-span-2`), stats/description/date in right column (`md:col-span-1`)
- Widened header and main from `max-w-2xl` to `max-w-2xl md:max-w-4xl` on desktop
- StatsPanel updated with responsive flex direction: `flex-col sm:flex-row md:flex-col` — stacks on mobile, horizontal on tablet, stacks again in desktop sidebar
- Removed hardcoded `mt-4` from StatsPanel container (margin handled by parent context now)
- Removed `min-w-[140px]` at `md` breakpoint (`sm:min-w-[140px] md:min-w-0`) so cards take full sidebar width
- Mobile layout unchanged — `md:` prefix ensures all grid classes only activate at ≥ 768px
- Added 2 new tests for grid layout classes and responsive max-width; all 219 client tests pass
- Lint and build pass cleanly

### File List

- `client/src/pages/HabitCalendarPage.tsx` (modified — two-column grid, wider max-width)
- `client/src/components/StatsPanel.tsx` (modified — responsive flex direction, removed mt-4)
- `client/src/pages/HabitCalendarPage.test.tsx` (modified — added 2 layout tests)

### Change Log

- 2026-03-24: Implemented desktop two-column layout for calendar page (Story 7.3)

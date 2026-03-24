# Story 7.4: UI Consistency Polish

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a visually consistent, polished UI across the app,
so that the design feels cohesive and professional.

## Acceptance Criteria

### AC1: Consistent content/header width alignment

The NavBar header inner container and all page content containers must use the same max-width so content aligns visually with the header on every page.

- [ ] NavBar inner container widens from `max-w-2xl` to `max-w-2xl md:max-w-4xl`
- [ ] HabitListPage main container widens from `max-w-2xl` to `max-w-2xl md:max-w-4xl`
- [ ] HabitCalendarPage header and main containers already use `max-w-2xl md:max-w-4xl` (no change needed)
- [ ] All containers align at both mobile and desktop breakpoints

### AC2: NavBar hover/focus styles

- [ ] **Logo link:** Remove hover highlight entirely — no background change on hover/focus. The logo area should have no interactive visual feedback (it still navigates on click).
- [ ] **Nav buttons (Archived, Settings, Log out):** On hover/focus, instead of a grey background (`hover:bg-gray-100`), keep the background unchanged and change the text/icon color to pink (`hover:text-pink-500`).
- [ ] Active route styling (`bg-pink-50 text-pink-500`) remains unchanged.

### AC3: Move "Started" date to habit sub-header, remove description

- [ ] On the HabitCalendarPage, the "Started {date}" text moves from the right-column sidebar into the page sub-header, displayed directly beneath the habit title (h1).
- [ ] The habit description paragraph is removed entirely from the HabitCalendarPage.
- [ ] The right-column sidebar now contains only the `StatsPanel` (no description, no start date).
- [ ] On mobile (single-column), the start date is still in the sub-header, and StatsPanel follows the calendar.

### AC4: Delete icon hover color on HabitCard

- [ ] The Delete (Trash2) button on `HabitCard` uses `hover:text-pink-500` instead of `hover:text-red-500`, matching all other action buttons (View, Edit, Archive).

## Tasks / Subtasks

- [ ] Task 1: Align widths across NavBar and HabitListPage (AC: #1)
  - [ ] In `client/src/components/NavBar.tsx` line 21, change `max-w-2xl` to `max-w-2xl md:max-w-4xl`
  - [ ] In `client/src/pages/HabitListPage.tsx` line 73, change `max-w-2xl` to `max-w-2xl md:max-w-4xl`

- [ ] Task 2: Fix NavBar hover/focus styles (AC: #2)
  - [ ] In `client/src/components/NavBar.tsx`:
    - Logo link (line 23): Remove `hover:bg-gray-100` from the className. The logo should keep `rounded-lg p-2 -m-2 transition` but with no hover effect.
    - `inactiveCls` (line 16): Change from `'text-text-secondary hover:bg-gray-100'` to `'text-text-secondary hover:text-pink-500'`
    - `activeCls` stays as-is (`'bg-pink-50 text-pink-500'`)

- [ ] Task 3: Move start date to sub-header, remove description (AC: #3)
  - [ ] In `client/src/pages/HabitCalendarPage.tsx`:
    - In the sub-header (inside the `<header>` block, under the `<h1>` habit name), add:
      ```tsx
      {habit && (
        <p className="text-xs text-muted">Started {formatDate(habit.startDate)}</p>
      )}
      ```
    - Remove the description paragraph (line ~397-398):
      ```tsx
      {habit?.description && (
        <p className="text-sm text-text-secondary mt-4">{habit.description}</p>
      )}
      ```
    - Remove the "Started" paragraph from the sidebar (line ~400-402):
      ```tsx
      <p className="text-xs text-muted mt-2">
        Started {habit ? formatDate(habit.startDate) : ''}
      </p>
      ```

- [ ] Task 4: Fix delete button hover color (AC: #4)
  - [ ] In `client/src/components/HabitCard.tsx` line 56, change `hover:text-red-500` to `hover:text-pink-500`

- [ ] Task 5: Verify
  - [ ] `npm run lint` passes in client
  - [ ] `npm test` passes in client
  - [ ] Client build succeeds
  - [ ] Visual check: NavBar and content edges align on desktop
  - [ ] Visual check: Logo has no hover highlight
  - [ ] Visual check: Archived/Settings/Logout turn pink on hover (no grey bg)
  - [ ] Visual check: "Started" date appears under habit title in sub-header
  - [ ] Visual check: No description visible on calendar page
  - [ ] Visual check: Delete icon on HabitCard turns pink on hover (not red)
  - [ ] Visual check: Mobile layout unchanged

## Dev Notes

### Issue 1: Width mismatch (screenshot analysis)

The screenshot shows the calendar page with the two-column desktop layout (from story 7-3). The NavBar header uses `max-w-2xl` (672px) while the page content uses `max-w-2xl md:max-w-4xl` (up to 896px on desktop). This causes a visible misalignment where the content area is wider than the header.

**Fix:** Update NavBar and HabitListPage to both use `max-w-2xl md:max-w-4xl`. This makes all containers consistent:
- Mobile (< md): everything at `max-w-2xl` (672px)
- Desktop (≥ md): everything at `max-w-4xl` (896px)

Files affected:
- `NavBar.tsx`: line 21 — `max-w-2xl` → `max-w-2xl md:max-w-4xl`
- `HabitListPage.tsx`: line 73 — `max-w-2xl` → `max-w-2xl md:max-w-4xl`

### Issue 2: NavBar hover styles

Current state in `NavBar.tsx`:

```tsx
// Logo link (line 23):
className="min-w-[50%] rounded-lg p-2 -m-2 transition hover:bg-gray-100"

// Inactive nav items (line 16):
const inactiveCls = 'text-text-secondary hover:bg-gray-100';
```

Target state:

```tsx
// Logo link — remove hover:bg-gray-100 entirely:
className="min-w-[50%] rounded-lg p-2 -m-2"

// Inactive nav items — pink text on hover instead of grey background:
const inactiveCls = 'text-text-secondary hover:text-pink-500';
```

Note: The `transition` on the logo link can be kept or removed — without `hover:bg-gray-100` it's a no-op but harmless.

### Issue 3: Start date relocation

Current layout in `HabitCalendarPage.tsx` sub-header (lines 308-344):

```
┌─────────────────────────────────────────┐
│  Take vitamin C  [Archived]  [⋯] [←]   │
└─────────────────────────────────────────┘
```

Target layout:

```
┌─────────────────────────────────────────┐
│  Take vitamin C          [⋯]  [← Back] │
│  Started 11 January 2026                │
└─────────────────────────────────────────┘
```

The start date goes into the left side of the header under the h1, inside the existing `<div className="flex items-center gap-2 min-w-0">` — but since that div uses `items-center` (horizontal flex), the start date needs to go below it. Change the left side to a vertical stack:

```tsx
<div className="min-w-0">
  <div className="flex items-center gap-2">
    <h1 className="text-xl font-bold text-pink-500 truncate">
      {loading ? 'Loading...' : habit?.name ?? 'Habit'}
    </h1>
    {habit?.isArchived && (
      <span className="...">Archived</span>
    )}
  </div>
  {habit && (
    <p className="text-xs text-muted">Started {formatDate(habit.startDate)}</p>
  )}
</div>
```

The sidebar right column then only contains `StatsPanel`:

```tsx
<div className="md:col-span-1 mt-4 md:mt-0">
  {!statsQuery.isError && habit && (
    <StatsPanel stats={statsQuery.data} isLoading={statsQuery.isLoading} />
  )}
</div>
```

### Issue 4: Delete button hover color

In `HabitCard.tsx` line 56:

```tsx
// Current:
className="p-1.5 rounded text-text-secondary hover:text-red-500 transition"

// Target:
className="p-1.5 rounded text-text-secondary hover:text-pink-500 transition"
```

All four action buttons (View, Edit, Archive, Delete) should use `hover:text-pink-500` for consistency.

### Critical implementation guardrails

1. **Do NOT change any component logic or state management.** These are all CSS/JSX-only changes.
2. **Do NOT change the `activeCls` styling** on NavBar — active route highlighting stays as-is.
3. **Do NOT change the mobile layout.** All width changes use responsive prefixes (`md:max-w-4xl`).
4. **Do NOT remove the `formatDate` import** from HabitCalendarPage — it's still needed for the start date in the sub-header.
5. **The description is only removed from HabitCalendarPage.** It stays on `HabitCard` in the habit list.
6. **Do NOT change ArchivedHabitsPage** — it's not affected by any of these changes.
7. **Keep the `min-w-0` on the sub-header left div** to preserve truncation behavior on the habit name.

### Previous story intelligence

From story 7-3 (Calendar Page Desktop Two-Column Layout):
- The two-column grid is `md:grid md:grid-cols-3 md:gap-8`
- The right column previously held StatsPanel + description + start date
- After this story, the right column only holds StatsPanel

From story 7-2 (Responsive Navigation Bar):
- NavBar lives in `AppLayout.tsx` above the `<Outlet />`
- NavBar uses `max-w-2xl` inner container
- `inactiveCls` controls hover for Archived, Settings, Logout
- Logo link has its own inline className with `hover:bg-gray-100`

### Git intelligence

```
feat(shell): ui consistency polish (E7-S4)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (modified) | `client/src/components/NavBar.tsx` (width + hover styles), `client/src/pages/HabitListPage.tsx` (width), `client/src/pages/HabitCalendarPage.tsx` (move start date, remove description), `client/src/components/HabitCard.tsx` (delete hover color) |

### What this story does NOT include

- No backend changes
- No new components or files
- No changes to StatsPanel, CalendarGrid, MonthNavigator, or modals
- No changes to ArchivedHabitsPage or SettingsPage
- No changes to mobile layout behavior

### References

- [Source: client/src/components/NavBar.tsx — hover classes on logo (line 23) and inactiveCls (line 16)]
- [Source: client/src/pages/HabitCalendarPage.tsx — sub-header (lines 308-344), sidebar (lines 393-403)]
- [Source: client/src/components/HabitCard.tsx — delete button (line 56)]
- [Source: client/src/pages/HabitListPage.tsx — max-w-2xl (line 73)]
- [Screenshot: width mismatch between NavBar and calendar page content]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

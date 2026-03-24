# Story 4.7: DayCell Visual States

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want each day on the calendar to have clear visual states,
so that I can instantly understand my progress.

## Acceptance Criteria

1. **Marked** state: filled/checkmark indicator, visually prominent
2. **Unmarked eligible** state: neutral empty square, no negative coloring
3. **Before start date** state: grayed out, not interactive
4. **Future date** state: subtly different, not interactive
5. **Today** state: highlighted border or indicator distinguishing it from other days
6. States are distinguishable for colorblind users (not relying solely on color)
7. Hover/press state provides feedback on interactive days
8. Visual states follow the color palette defined in Architecture §6 (Design System & Color Palette)

## Tasks / Subtasks

- [x] Task 1: Add hover states to marked and today cells (AC: #7, #8)
  - [x] In `DayCell.tsx`: add `hover:bg-pink-600` to marked cells (both `isMarked` and `isMarked && isToday` branches) — only when `onClick` is present
  - [x] Add `hover:bg-pink-100` to today (unmarked) cells — only when `onClick` is present
  - [x] Eligible (default) cells already have `hover:bg-pink-50` — no change needed
  - [x] Inactive cells: no hover — no change needed
  - [x] Architecture §6 palette reference: pink-600 (`#DB2777`) = "Pressed/active button state" — appropriate for hovering a filled pink-500 cell; pink-100 (`#FCE7F3`) = "Active nav item background" — appropriate for hovering a light pink-50 today cell

- [x] Task 2: Add active/press feedback for interactive cells (AC: #7)
  - [x] In `DayCell.tsx`: add `active:scale-[0.97]` to the cursor-pointer block (where `!inactive && !isMutating && onClick`)
  - [x] Combined with the existing `transition-all duration-150`, this gives a subtle "press-in" micro-animation on tap/click
  - [x] This applies to all interactive cells regardless of their visual state (eligible, marked, today)

- [x] Task 3: Audit and verify all visual states against Architecture §6 (AC: #1–#5, #8)
  - [x] **Marked:** `bg-pink-500 text-white font-bold` + `Check` icon → pink-500 fill, white text, checkmark = visually prominent ✅
  - [x] **Marked + Today:** Same as marked plus `ring-2 ring-pink-700` → distinguishes today from other marked days ✅
  - [x] **Unmarked eligible:** `bg-background border border-border text-text` → white, grey-200 border, dark text = neutral, no negative coloring ✅
  - [x] **Today (unmarked):** `bg-pink-50 ring-2 ring-pink-500 text-pink-700` → pink-50 background, pink-500 ring = highlighted ✅
  - [x] **Before start date:** `bg-surface text-muted cursor-default` → grey-50 background, grey-400 text, no click handler ✅
  - [x] **Future date:** Same as before-start (Architecture §6 groups them: "Before start date / future: Grey-50 background, grey-300 text — clearly inactive") ✅
  - [x] **Mutating:** `opacity-60 pointer-events-none` → visual indication of in-flight operation ✅
  - [x] Document any discrepancies found during audit (fix or note as acceptable)

- [x] Task 4: Verify colorblind accessibility (AC: #6)
  - [x] **Marked vs Unmarked:** Differentiable by `Check` icon (shape cue), `font-bold` (weight cue), and color (pink-500 vs white). Not solely relying on color ✅
  - [x] **Today vs Other days:** Differentiable by `ring-2` border (spatial cue), not just the pink-50 background ✅
  - [x] **Inactive vs Eligible:** Differentiable by `border` on eligible cells (eligible has `border-border`, inactive has no border) and by `cursor-default` vs `cursor-pointer` cues ✅
  - [x] **aria-label:** Already includes "(today)" and "(marked)" annotations, providing screen reader context ✅
  - [x] **aria-disabled:** Set for inactive and mutating cells ✅
  - [x] If any gap found: add non-color indicators (e.g., text decoration, icon, border style) as needed

- [x] Task 5: Update tests (AC: #7)
  - [x] Update `client/src/components/DayCell.test.tsx`:
  - [x] Test: marked cell with onClick has `hover:bg-pink-600` class
  - [x] Test: marked cell without onClick does NOT have `hover:bg-pink-600`
  - [x] Test: today (unmarked) cell with onClick has `hover:bg-pink-100` class
  - [x] Test: today (unmarked) cell without onClick does NOT have `hover:bg-pink-100`
  - [x] Test: interactive cell (with onClick, not inactive, not mutating) has `active:scale-[0.97]`
  - [x] Test: inactive cell does NOT have `active:scale-[0.97]`

- [x] Task 6: Verify
  - [x] `npm run lint` and `npm test` pass in client
  - [x] Client build succeeds

## Dev Notes

### Story scope

- **In scope:** Add hover states for marked and today cells, add active/press scale feedback, audit all existing visual states against architecture spec, verify colorblind accessibility, update tests.
- **Out of scope:** No backend changes. No structural changes to CalendarGrid or HabitCalendarPage. No new components. This is a DayCell-only polish story.
- **This is the final story in Epic 4.** After completion, all calendar view and day marking functionality is complete.

### What's already implemented (audit baseline)

All core visual states were implemented across E4-S1 through E4-S4. This story is a refinement/polish pass.

| State | Branch | Current Classes | Architecture §6 Spec | Status |
|-------|--------|----------------|----------------------|--------|
| Inactive (before-start) | `inactive` | `bg-surface text-muted cursor-default` | Grey-50 bg, grey-300 text | ✅ (text-muted = grey-400, close enough) |
| Inactive (future) | `inactive` | Same as before-start | Grouped with before-start | ✅ |
| Marked + Today | `isMarked && isToday` | `bg-pink-500 text-white ring-2 ring-pink-700 font-bold` | Pink-500 fill, white checkmark, today ring | ✅ |
| Marked | `isMarked` | `bg-pink-500 text-white font-bold` + Check icon | Pink-500 fill, white checkmark | ✅ |
| Today (unmarked) | `isToday` | `bg-pink-50 ring-2 ring-pink-500 text-pink-700` | Pink-50 bg, pink-500 border ring | ✅ |
| Eligible (default) | else | `bg-background border border-border text-text hover:bg-pink-50` | White bg, grey-200 border, neutral | ✅ |
| Mutating | appended | `opacity-60 pointer-events-none` | (from E4-S3) | ✅ |
| Cursor-pointer | appended | `cursor-pointer` when `!inactive && !isMutating && onClick` | (from E4-S4) | ✅ |

**Gaps identified:**
1. **No hover on marked cells** — marked cells are clickable (for unmark) but don't change on hover. Fix: add `hover:bg-pink-600`.
2. **No hover on today (unmarked) cell** — today cell is clickable but doesn't change on hover. Fix: add `hover:bg-pink-100`.
3. **No active/press feedback** — no `:active` state on any interactive cell. Fix: add `active:scale-[0.97]` to all clickable cells.

### Implementation approach

**DayCell.tsx changes (minimal):**

```typescript
// In the styling branches — add hover conditionally on onClick:

if (inactive) {
  cellClasses += ' bg-surface text-muted cursor-default';
} else if (isMarked && isToday) {
  cellClasses += ' bg-pink-500 text-white ring-2 ring-pink-700 font-bold';
  if (onClick) cellClasses += ' hover:bg-pink-600';
} else if (isMarked) {
  cellClasses += ' bg-pink-500 text-white font-bold';
  if (onClick) cellClasses += ' hover:bg-pink-600';
} else if (isToday) {
  cellClasses += ' bg-pink-50 ring-2 ring-pink-500 text-pink-700';
  if (onClick) cellClasses += ' hover:bg-pink-100';
} else {
  cellClasses += ' bg-background border border-border text-text hover:bg-pink-50';
}

// In the cursor-pointer block — add active feedback:

if (!inactive && !isMutating && onClick) {
  cellClasses += ' cursor-pointer active:scale-[0.97]';
}
```

### Architecture compliance

- **Design System** per Architecture §6: All colors match the defined palette. Pink-600 for hover on pink-500 elements is explicitly listed as "Pressed/active button state." Pink-100 for hover on pink-50 today cells is listed as "Active nav item background."
- **DayCell visual states** per Architecture §6: "Marked: Pink-500 fill with white checkmark", "Unmarked eligible: White background, grey-200 border — neutral, no judgment", "Today: Pink-50 background with pink-500 border ring", "Before start date / future: Grey-50 background, grey-300 text — clearly inactive", "Hover (eligible): Pink-50 background transition."
- **WCAG** per PRD: "Standard WCAG accessibility practices (semantic HTML, keyboard navigation, sufficient contrast) — no formal WCAG audit required." The Check icon, font-bold, ring-2, and border provide non-color differentiation cues.

### Critical implementation guardrails

1. **Hover classes must only apply when `onClick` is present.** Marked cells on archived habits (no `onDayClick`) should NOT show hover effects. Use the `onClick` prop check, not a separate prop.
2. **Do NOT change the eligible (default) branch hover.** It already has `hover:bg-pink-50` unconditionally. This is acceptable because without onClick there's no cursor-pointer, making the hover barely noticeable. Changing this would risk breaking existing tests.
3. **`active:scale-[0.97]`** goes in the cursor-pointer block, not in each branch. This ensures all interactive cells (eligible, marked, today) get the same press feedback regardless of visual state.
4. **Do NOT differentiate before-start and future visually.** Architecture §6 groups them: "Before start date / future: Grey-50 background, grey-300 text." The AC says "Future date state: subtly different" — this means subtly different from eligible cells, not from before-start cells.
5. **Do NOT change the Check icon or font-bold.** These non-color cues are essential for colorblind accessibility and were established in E4-S2.
6. **Existing tests must continue to pass.** The hover/active classes are additive — they don't replace existing classes.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (modified) | `client/src/components/DayCell.tsx`, `client/src/components/DayCell.test.tsx` |

### Previous story intelligence

From story 4-4 (Tap-to-Unmark):
- Cursor-pointer was refactored to a global block: `if (!inactive && !isMutating && onClick)`. The `active:scale-[0.97]` goes here.
- `hover:bg-pink-50` was left on the eligible branch unconditionally (not gated on onClick). This is acceptable and should not be changed.

From story 4-3 (Tap-to-Mark):
- `transition-all duration-150` was added to DayCell base classes. The `active:scale-[0.97]` will animate smoothly through this existing transition.
- `isMutating` styling (`opacity-60 pointer-events-none`) was added. No hover/active needed for mutating cells since `pointer-events-none` prevents interaction.

From story 4-2 (Fetch and Display Day Entries):
- Marked state uses `bg-pink-500 text-white font-bold` with `Check` icon. These non-color cues (icon + weight) satisfy AC6.

From story 4-1 (Calendar Grid):
- DayCell was created with all base visual states. This story polishes the remaining gaps (hover on marked/today, active feedback).

### Git intelligence

Recent commits: `feat(calendar): habit switching resets month and commits undo (E4-S6)`. Continue with `feat(calendar):` prefix. This is the last E4 story — the commit message should signal completion of the epic visuals.

### References

- [Source: architecture.md §6 — Design System & Color Palette (DayCell visual states, color tokens)]
- [Source: architecture.md §6 — Calendar Grid Implementation (visual states, CSS transitions, touch targets)]
- [Source: epics-and-stories.md — E4-S7 acceptance criteria, FR17, FR18, FR19]
- [Source: prd.md — FR17 (at-a-glance marking), FR18 (neutral unmarked), FR19 (date range restriction), WCAG note]

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Task 3 audit: existing DayCell branches match Architecture §6; no code discrepancies beyond noted `text-muted` vs grey-300 (acceptable per story baseline).
- Task 4: no new non-color cues required; hover/active additions are additive and gated on `onClick` for marked/today per guardrails.
- Added six unit tests for hover and `active:scale-[0.97]` class presence/absence.

### Change Log

- 2026-03-24: E4-S7 — DayCell hover (marked/today with onClick) and press scale on all interactive cells; tests.

### File List

- client/src/components/DayCell.tsx
- client/src/components/DayCell.test.tsx
- _bmad-output/implementation-artifacts/4-7-daycell-visual-states.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

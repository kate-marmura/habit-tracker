# Story 4.8: UI Polish & UX Improvements

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want polished date formatting, softer visual tones, a custom date picker, smarter month navigation limits, and a welcoming app subtitle,
so that the app feels more refined, human-friendly, and intentional.

## Acceptance Criteria

1. **Human-readable date format:** All displayed dates use `dd MMMM yyyy` format (e.g., "24 March 2026") instead of `YYYY-MM-DD`. Applies to: HabitCard "Started" label, ArchivedHabitCard "Started" label, HabitCalendarPage "Started" footer, and any other user-visible date string.
2. **Softer marked-day color:** The marked-day background color changes from `pink-500` (`#EC4899`) to a new custom token `pink-marked` (`#F3D0D7`). All DayCell branches that use `bg-pink-500` for marked state switch to `bg-pink-marked`. The marked-day text color adjusts to maintain readability (dark text on the lighter background). The checkmark icon color adjusts accordingly.
3. **Pink instead of red for destructive actions:** Archive and Delete menu items in `HabitSettingsDropdown` use `text-pink-600` / `hover:bg-pink-50` instead of `text-red-600` / `hover:bg-red-50`. The `ConfirmModal` danger variant uses `bg-pink-500 hover:bg-pink-600` instead of `bg-red-500 hover:bg-red-600`. The `DeleteHabitModal` title, submit button, and focus ring use pink tones (`text-pink-600`, `bg-pink-500`, `focus:ring-pink-500`) instead of red. Error messages retain `bg-red-50 text-red-700` (these are actual errors, not actions).
4. **Custom date picker:** The native `<input type="date">` in `CreateHabitModal` is replaced with a custom calendar-style date picker component that matches the app's pink/grey/white design system. The picker must: allow selecting a date from today or earlier (`max` = today), display month/year navigation, highlight today, and show the selected date clearly. The picker must be keyboard-accessible and mobile-friendly.
5. **Month navigation start-date limit:** The previous-month button in `MonthNavigator` is disabled when the currently displayed month is the same as (or earlier than) the habit's `startDate` month. `HabitCalendarPage` passes the habit's `startDate` to `MonthNavigator` (or computes `canGoPrev`). Users cannot navigate to months before the habit existed.
6. **App subtitle:** Below every "Habit Tracker" title (`HabitListPage`, `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`), a subtitle reads "Let's start a better life" in `text-muted` (grey-400) styling.

## Tasks / Subtasks

- [x] Task 1: Create date formatting utility (AC: #1)
  - [x] Create `client/src/utils/formatDate.ts` exporting a `formatDate(dateStr: string): string` function
  - [x] Uses `date-fns` `parse` and `format` to convert `YYYY-MM-DD` → `dd MMMM yyyy` (e.g., "24 March 2026")
  - [x] Unit test: `client/src/utils/formatDate.test.ts`

- [x] Task 2: Apply human-readable dates across UI (AC: #1)
  - [x] `HabitCard.tsx`: Replace `{habit.startDate}` with `{formatDate(habit.startDate)}`
  - [x] `ArchivedHabitCard.tsx`: Same replacement
  - [x] `HabitCalendarPage.tsx`: Replace `{habit?.startDate}` in footer with `{formatDate(habit?.startDate)}`
  - [x] Verify no other user-visible `YYYY-MM-DD` strings remain

- [x] Task 3: Update marked-day color to #F3D0D7 (AC: #2)
  - [x] In `client/src/index.css`, add `--color-pink-marked: #F3D0D7` to the `@theme` block
  - [x] In `DayCell.tsx`: Replace all `bg-pink-500` in marked branches with `bg-pink-marked`
  - [x] Adjust marked text color from `text-white` to `text-pink-700` (dark text on light pink for readability)
  - [x] Adjust Check icon color: use `text-pink-700` or `stroke-pink-700`
  - [x] Adjust `ring-pink-700` on marked+today to `ring-pink-400` (lighter complement)
  - [x] Adjust hover on marked from `hover:bg-pink-600` to `hover:bg-pink-300` (darker hover for lighter base)
  - [x] Update `DayCell.test.tsx` to reflect new class names

- [x] Task 4: Replace red with pink in destructive actions (AC: #3)
  - [x] `HabitSettingsDropdown.tsx`: Change `text-red-600` → `text-pink-600`, `hover:bg-red-50` → `hover:bg-pink-50` on Archive and Delete menu items
  - [x] `ConfirmModal.tsx`: Change danger variant from `bg-red-500 hover:bg-red-600` → `bg-pink-500 hover:bg-pink-600`
  - [x] `DeleteHabitModal.tsx`: Change title from `text-red-600` → `text-pink-600`; submit button from `bg-red-500 hover:bg-red-600` → `bg-pink-500 hover:bg-pink-600`; focus ring from `focus:ring-red-500` → `focus:ring-pink-500`
  - [x] Leave error messages (`bg-red-50 text-red-700`) unchanged — those are actual errors

- [x] Task 5: Build custom date picker component (AC: #4)
  - [x] Create `client/src/components/DatePicker.tsx` — a calendar-style date selector
  - [x] Features: month/year header with prev/next arrows, 7-column day grid (same layout as CalendarGrid), selectable day cells, today highlight, selected date highlight
  - [x] Props: `value: string` (YYYY-MM-DD), `onChange: (date: string) => void`, `maxDate?: string` (defaults to today)
  - [x] Styling: matches app palette — pink for selected, grey for inactive, white background, border-border
  - [x] Keyboard: arrow keys to navigate, Enter to select, Escape to close (if used as dropdown)
  - [x] Mobile: touch-friendly 44px targets
  - [x] In `CreateHabitModal.tsx`: Replace `<input type="date" ...>` with `<DatePicker value={startDate} onChange={setStartDate} maxDate={getTodayString()} />`
  - [x] Test: `client/src/components/DatePicker.test.tsx`

- [x] Task 6: Add start-date limit to month navigation (AC: #5)
  - [x] `MonthNavigator.tsx`: Add `canGoPrev: boolean` prop (matching existing `canGoNext` pattern)
  - [x] Disable previous button when `canGoPrev` is false — same disabled styling as next button
  - [x] `HabitCalendarPage.tsx`: Compute `canGoPrev` from habit start date:
    ```typescript
    const habitStartDate = habit ? parseISO(habit.startDate) : null;
    const canGoPrev = habitStartDate
      ? calYear > habitStartDate.getFullYear() ||
        (calYear === habitStartDate.getFullYear() && calMonth > habitStartDate.getMonth() + 1)
      : true;
    ```
  - [x] Pass `canGoPrev` to `<MonthNavigator>`
  - [x] Update `MonthNavigator.test.tsx` (if exists) and `HabitCalendarPage` tests

- [x] Task 7: Add app subtitle (AC: #6)
  - [x] `HabitListPage.tsx`: Below "Habit Tracker" h1, add `<p className="text-muted text-sm">Let's start a better life</p>`
  - [x] `LoginPage.tsx`: Same subtitle below the title
  - [x] `RegisterPage.tsx`: Same subtitle below the title
  - [x] `ForgotPasswordPage.tsx`: Same subtitle below the title
  - [x] `ResetPasswordPage.tsx`: Same subtitle below the title

- [x] Task 8: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (all existing + new tests)
  - [x] Client build succeeds
  - [x] Visual check: dates display as "24 March 2026", marked days are soft pink, no red in dropdowns/modals, custom picker works, month nav respects start date, subtitle shows on all relevant pages

## Dev Notes

### Story scope

- **In scope:** Date formatting utility and application, DayCell marked color change, red→pink for destructive actions, custom date picker component, month navigation start-date limit, app subtitle.
- **Out of scope:** No backend changes. No API contract changes. No database changes. No changes to CalendarGrid layout or month data fetching logic.
- **This is an additive polish story** to Epic 4 after the core calendar functionality is complete.

### Color change rationale (#F3D0D7)

The current `pink-500` (`#EC4899`) for marked days is vibrant and high-contrast. The requested `#F3D0D7` is a softer, pastel pink that feels calmer and more "filled-in" without being loud. Since the background becomes lighter, text and icon colors must shift from white to dark (pink-700) to maintain WCAG contrast.

**Contrast check:**
- `#F3D0D7` background with `#BE185D` (pink-700) text: contrast ratio ~5.2:1 — passes AA for normal text
- `#F3D0D7` background with `#111827` (text) would also pass but pink-700 keeps the visual theme

### Custom date picker approach

Build a lightweight component reusing the same `date-fns` utilities as `CalendarGrid`. This avoids adding a third-party date picker library. The picker should:
- Show inline (not dropdown) in the modal, replacing the native input
- Reuse the 7-column grid pattern from CalendarGrid
- Use pink-500 for the selected date, pink-50 for today, grey for disabled/future dates
- Navigation: left/right arrows for month, with `maxDate` enforcement

### Month navigation limit

Currently `MonthNavigator` has `canGoNext` but no `canGoPrev`. The pattern is symmetric: add `canGoPrev` prop, wire it to the previous button's `disabled` state. The calendar page computes this from the habit's `startDate` — if the displayed month/year equals or precedes the start date's month/year, `canGoPrev = false`.

### Red → Pink reasoning

The red (`text-red-600`, `bg-red-500`) used for Archive and Delete actions reads as "error" or "warning" rather than a deliberate action within a pink-themed app. Using `pink-600` / `pink-500` keeps destructive actions visually distinct (they're the strongest pink tones) while staying harmonious with the design system. Actual error messages (validation failures, network errors) remain red to distinguish system errors from user-initiated destructive actions.

### Architecture compliance

- **Design System** per Architecture §6: Adding `pink-marked: #F3D0D7` as a named token. All other palette tokens remain unchanged.
- **DayCell states** per Architecture §6: Marked state changes from "Pink-500 fill with white checkmark" to "Pink-marked fill with pink-700 checkmark."
- **Date format:** Not currently specified in architecture; adding as a UI convention.
- **Calendar component:** Architecture §6 specifies custom CSS Grid for the calendar; the custom date picker follows the same pattern.

### Critical implementation guardrails

1. **Do NOT change API date formats.** The API sends/receives `YYYY-MM-DD`. Only the display layer changes.
2. **Do NOT change CalendarGrid's internal date handling.** The `format(day, 'yyyy-MM-dd')` used for entry matching stays as-is.
3. **Marked color change must update ALL DayCell branches** — both `isMarked && isToday` and `isMarked` (not today).
4. **Error messages stay red.** Only user-initiated destructive action styling changes to pink.
5. **Custom date picker must enforce maxDate.** The native input's `max` attribute is gone; the component must replicate this constraint.
6. **canGoPrev must handle edge cases:** habit created in the current month (both arrows could be disabled), habit with no startDate yet (shouldn't happen but default to allowing navigation).

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/utils/formatDate.ts`, `client/src/utils/formatDate.test.ts`, `client/src/components/DatePicker.tsx`, `client/src/components/DatePicker.test.tsx` |
| Client (modified) | `client/src/index.css`, `client/src/components/DayCell.tsx`, `client/src/components/DayCell.test.tsx`, `client/src/components/HabitCard.tsx`, `client/src/components/ArchivedHabitCard.tsx`, `client/src/components/HabitSettingsDropdown.tsx`, `client/src/components/ConfirmModal.tsx`, `client/src/components/DeleteHabitModal.tsx`, `client/src/components/MonthNavigator.tsx`, `client/src/components/CreateHabitModal.tsx`, `client/src/pages/HabitCalendarPage.tsx`, `client/src/pages/HabitListPage.tsx`, `client/src/pages/LoginPage.tsx`, `client/src/pages/RegisterPage.tsx`, `client/src/pages/ForgotPasswordPage.tsx`, `client/src/pages/ResetPasswordPage.tsx` |

### Previous story intelligence

From story 4-7 (DayCell Visual States):
- DayCell marked branches: `bg-pink-500 text-white font-bold` with optional `hover:bg-pink-600`. These all need updating to `bg-pink-marked text-pink-700 font-bold` with `hover:bg-pink-300`.
- `active:scale-[0.97]` on interactive cells — no change needed.
- `transition-all duration-150` — no change needed.

From story 4-5 (Month Navigation):
- `MonthNavigator` already has the `canGoNext` / disabled pattern. Adding `canGoPrev` is symmetric.
- `HabitCalendarPage` already computes `isCurrentMonth` for forward limit. Adding backward limit from `startDate` follows the same pattern.

From story 3-8 (Habit Card Actions & Confirm Modal):
- `ConfirmModal` has `confirmVariant` prop with `'danger'` value. The danger colors change from red to pink.
- `DeleteHabitModal` uses red for title, button, and focus ring. All switch to pink equivalents.
- `HabitSettingsDropdown` uses red for Archive/Delete items. Both switch to pink.

### Git intelligence

Recent commits: `feat(calendar): DayCell hover and press visual states (E4-S7)`. Continue with `feat(calendar):` prefix for this epic. Suggested commit message: `feat(calendar): UI polish — soft pink, human dates, custom picker, nav limits, subtitle (E4-S8)`.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Added `formatDate` (`d MMMM yyyy`) and applied to HabitCard, ArchivedHabitCard, HabitCalendarPage footer, and **EditHabitModal** read-only start date (AC #1 coverage).
- Theme token `--color-pink-marked`; DayCell marked states use `bg-pink-marked`, `text-pink-700`, `ring-pink-400` (marked+today), `hover:bg-pink-300`, Check `text-pink-700`.
- **DatePicker**: inline calendar with `maxDate`, month nav, 44px cells, arrow + Enter keyboard within month; `key={startDate}` on CreateHabitModal remount avoids sync effect (eslint `set-state-in-effect`).
- **MonthNavigator** `canGoPrev`; HabitCalendarPage guards `goToPrevMonth`; tests updated (default habit start Jan 2026 for prev-nav; fake-time case for prev disabled at start month). **Post-review:** `canGoPrev` uses `parse(startDate, 'yyyy-MM-dd', new Date())` + `isValid` (local calendar day) instead of `parseISO`, so the start month matches displayed dates across timezones.
- Subtitle on list + auth pages including Forgot success and Reset invalid-token headers.
- ConfirmModal.test expects pink danger button; primary/danger both pink (variant retained for API).

### Change Log

- 2026-03-24: E4-S8 UI polish — dates, pink-marked days, pink destructive UI, DatePicker, month floor, subtitle.

### File List

- client/src/utils/formatDate.ts
- client/src/utils/formatDate.test.ts
- client/src/components/DatePicker.tsx
- client/src/components/DatePicker.test.tsx
- client/src/index.css
- client/src/components/DayCell.tsx
- client/src/components/DayCell.test.tsx
- client/src/components/CalendarGrid.test.tsx
- client/src/components/HabitCard.tsx
- client/src/components/HabitCard.test.tsx
- client/src/components/ArchivedHabitCard.tsx
- client/src/components/ArchivedHabitCard.test.tsx
- client/src/components/HabitSettingsDropdown.tsx
- client/src/components/ConfirmModal.tsx
- client/src/components/ConfirmModal.test.tsx
- client/src/components/DeleteHabitModal.tsx
- client/src/components/MonthNavigator.tsx
- client/src/components/MonthNavigator.test.tsx
- client/src/components/CreateHabitModal.tsx
- client/src/components/EditHabitModal.tsx
- client/src/pages/HabitCalendarPage.tsx
- client/src/pages/HabitCalendarPage.test.tsx
- client/src/pages/HabitListPage.tsx
- client/src/pages/LoginPage.tsx
- client/src/pages/RegisterPage.tsx
- client/src/pages/ForgotPasswordPage.tsx
- client/src/pages/ResetPasswordPage.tsx
- _bmad-output/implementation-artifacts/4-8-ui-polish-and-ux-improvements.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### References

- [Source: architecture.md §6 — Design System & Color Palette]
- [Source: prd.md — Visual Design (color scheme, calendar marked days)]
- [Source: epics-and-stories.md — E4-S7 (last E4 story, now E4-S8 extends)]
- [Source: DayCell.tsx — current marked state classes]
- [Source: HabitSettingsDropdown.tsx — current red action classes]
- [Source: ConfirmModal.tsx — current danger variant classes]
- [Source: DeleteHabitModal.tsx — current red classes]
- [Source: CreateHabitModal.tsx — current native date input]
- [Source: MonthNavigator.tsx — current canGoNext pattern]
- [Source: HabitCalendarPage.tsx — current month navigation logic]

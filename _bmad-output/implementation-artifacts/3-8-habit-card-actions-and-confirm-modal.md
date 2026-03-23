# Story 3.8: Habit Card Action Buttons & Custom Archive Confirmation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want quick-action icon buttons on each habit card and a polished confirmation dialog when archiving,
so that I can view, edit, or archive habits directly from the list without navigating away, and the archive confirmation feels integrated with the app's design.

## Acceptance Criteria

### Habit Card Action Buttons

1. Each **`HabitCard`** on `HabitListPage` displays **three icon buttons** on the right side of the card (see reference screenshot):
   - **View** — eye icon (`lucide-react` `Eye`) — navigates to `/habits/:id`
   - **Edit** — pencil icon (`lucide-react` `Pencil`) — opens `EditHabitModal` inline (no page navigation)
   - **Archive** — archive-box icon (`lucide-react` `Archive`) — triggers archive flow with confirmation
2. Icons are **16–20px**, rendered in `text-text-secondary` with `hover:text-pink-500` transition; grouped vertically or horizontally in a tight cluster on the card's right edge (match the red-outlined area in the screenshot)
3. Each button has an **`aria-label`** (`"View {name}"`, `"Edit {name}"`, `"Archive {name}"`)
4. The **habit name** text remains a clickable link to `/habits/:id` (existing behavior preserved)
5. After a successful **edit** (via modal), the habit card updates in the list immediately (name/description)
6. After a successful **archive**, the habit is removed from the active list immediately (optimistic or post-response)

### Custom Archive Confirmation Modal

7. A new **`ConfirmModal`** component replaces **all** `window.confirm` usage for archive actions — both the new card button and the existing `HabitCalendarPage` archive flow
8. Modal design matches existing app modals (`EditHabitModal`, `CreateHabitModal`): semi-transparent backdrop (`bg-black/40`), centered white card, rounded corners, `role="dialog"`, `aria-modal`, Escape to close, backdrop click to close
9. Content: habit name in the message (e.g. **"Archive '{name}'?"**), explanatory text ("It will be moved to your archived habits and removed from your active list."), **Cancel** + **Archive** buttons
10. **Archive** button styled with warning color (red/destructive — `bg-red-500` or `text-red-600`), **Cancel** is neutral
11. Modal shows loading state on the Archive button while the API call is in flight
12. On API error, the modal stays open and displays the error message inline (same pattern as `EditHabitModal`)

### ArchivedHabitCard — Unarchive Button

13. **`ArchivedHabitCard`** on the archived list page gets a single **Unarchive** icon button (`lucide-react` `ArchiveRestore` or `Undo2`) — same styling as active card icons
14. Unarchive does **not** require confirmation (non-destructive) — calls `unarchiveHabit` directly, removes card from archived list on success
15. On **`409 HABIT_LIMIT_REACHED`**, show error inline on the card or as a toast/banner (match existing error patterns)

## Tasks / Subtasks

- [ ] Task 1: `ConfirmModal` component (AC: #7–#12)
  - [ ] New **`client/src/components/ConfirmModal.tsx`**: reusable confirmation dialog
  - [ ] Props: `title: string`, `message: string`, `confirmLabel?: string` (default "Confirm"), `confirmVariant?: 'danger' | 'primary'` (default "danger"), `onConfirm: () => Promise<void>`, `onCancel: () => void`
  - [ ] Internal state: `isLoading`, `error` — on confirm click, call `onConfirm()`, show spinner/disabled state, catch errors and display inline
  - [ ] Backdrop click + Escape → `onCancel()`; match `EditHabitModal` modal shell (backdrop, centering, `aria-modal`, `role="dialog"`)

- [ ] Task 2: Refactor `HabitCard` with action buttons (AC: #1–#6)
  - [ ] Extend **`HabitCard`** props: `onEdit: (habit: Habit) => void`, `onArchive: (habit: Habit) => void`
  - [ ] Add three icon buttons on the right side using `lucide-react`: `Eye` (view), `Pencil` (edit), `Archive` (archive)
  - [ ] View button: `navigate(\`/habits/${habit.id}\`)` or wrap in `Link`
  - [ ] Edit button: calls `onEdit(habit)`
  - [ ] Archive button: calls `onArchive(habit)`
  - [ ] Keep existing name `Link` for accessibility/SEO; icon buttons are a visual shortcut

- [ ] Task 3: Wire `HabitListPage` — edit + archive from card (AC: #5–#6, #7)
  - [ ] Add state for `editingHabit: Habit | null` and `archivingHabit: Habit | null`
  - [ ] `onEdit` → `setEditingHabit(habit)` → show `EditHabitModal` → on save, update habit in `habits` state array
  - [ ] `onArchive` → `setArchivingHabit(habit)` → show `ConfirmModal` → on confirm, call `archiveHabit(id)` → remove habit from `habits` state; on error, modal shows it inline
  - [ ] Pass `onEdit` and `onArchive` to each `HabitCard`

- [ ] Task 4: Replace `window.confirm` on `HabitCalendarPage` (AC: #7)
  - [ ] Replace `handleArchive`'s `window.confirm(...)` + inline `archiveHabit` call with state-driven `ConfirmModal`
  - [ ] On confirm success, still `navigate('/habits', { replace: true })`
  - [ ] Remove the `window.confirm` call entirely

- [ ] Task 5: `ArchivedHabitCard` — unarchive button (AC: #13–#15)
  - [ ] Add `onUnarchive?: (habit: Habit) => void` prop to **`ArchivedHabitCard`**
  - [ ] Render **Unarchive** icon button (`ArchiveRestore` or `Undo2`) with same styling as active card icons
  - [ ] Wire in **`ArchivedHabitsPage`**: call `unarchiveHabit(id)` → remove from list on success; on `409` show error

- [ ] Task 6: Client tests
  - [ ] **`ConfirmModal.test.tsx`**: renders title/message, confirm calls handler, cancel closes, Escape closes, loading state, error display
  - [ ] **`HabitCard.test.tsx`**: assert three icon buttons present with correct aria-labels; click Edit calls `onEdit`; click Archive calls `onArchive`
  - [ ] **`HabitListPage.test.tsx`**: update for new edit-from-card and archive-from-card flows
  - [ ] **`HabitCalendarPage.test.tsx`**: update archive tests — no more `window.confirm`, now uses `ConfirmModal`
  - [ ] **`ArchivedHabitCard.test.tsx`**: unarchive button present, click calls handler

- [ ] Task 7: Verify
  - [ ] `npm run lint`, `npm test`, client build

## Dev Notes

### Story scope

- **In scope:** `HabitCard` icon buttons, `ConfirmModal` component, replace `window.confirm`, `ArchivedHabitCard` unarchive button.
- **Out of scope:** Server changes (all endpoints already exist), delete functionality (E3-S7).

### Reference screenshot

The user-provided screenshot shows the desired button placement: right side of the `HabitCard`, vertically aligned in the area currently empty (red-outlined region). See `/Users/katemarmura/.cursor/projects/Users-katemarmura-habit-tracker/assets/Screenshot_2026-03-23_at_15.52.05-5e7393c0-1608-43be-80ee-d7f7bf03d61e.png`.

### Existing code to build on

- **`lucide-react` v0.577** already installed — use `Eye`, `Pencil`, `Archive`, `ArchiveRestore` (or `Undo2`)
- **`EditHabitModal`** exists and works — reuse directly from `HabitListPage` (currently only used on `HabitCalendarPage`)
- **`archiveHabit`** / **`unarchiveHabit`** in `habitsApi.ts` — call from list page
- **Modal shell pattern** from `EditHabitModal` / `CreateHabitModal`: `fixed inset-0 bg-black/40`, centered card, `role="dialog"`, `aria-modal`, Escape + backdrop close

### Architecture compliance

- Icons follow existing Tailwind design tokens (`text-text-secondary`, `hover:text-pink-500`, `transition`)
- `ConfirmModal` reusable for future delete confirmation (E3-S7)

### Critical implementation guardrails

1. **Do not** remove the name `Link` on `HabitCard` — the View icon button is an additional affordance, not a replacement
2. **`ConfirmModal.onConfirm` must be async** so the modal can show loading/error — do not fire-and-forget
3. After archive from the list, **remove the habit from state** rather than refetching (consistent with create's prepend pattern)
4. **`window.confirm` must be fully removed** from `HabitCalendarPage` — no native dialogs remaining

### File structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/components/ConfirmModal.tsx`, `client/src/components/ConfirmModal.test.tsx` |
| Client (modified) | `client/src/components/HabitCard.tsx`, `client/src/components/ArchivedHabitCard.tsx`, `client/src/pages/HabitListPage.tsx`, `client/src/pages/HabitCalendarPage.tsx`, `client/src/pages/ArchivedHabitsPage.tsx`, tests |

### Latest tech notes

- No dependency additions needed — `lucide-react` is already in `package.json`.

## Dev Agent Record

### Agent Model Used

_(Dev agent fills when implementing.)_

### Debug Log References

### Completion Notes List

### File List

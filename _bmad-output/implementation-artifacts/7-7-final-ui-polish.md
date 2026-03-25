# Story 7.7: Final UI Polish

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a visually consistent experience across all pages,
so that the app feels polished and unified.

## Acceptance Criteria

### AC1: ArchivedHabitsPage width alignment

- [x] The ArchivedHabitsPage header inner container uses `max-w-2xl md:max-w-4xl` (matching NavBar and all other page containers).
- [x] The ArchivedHabitsPage main content container uses `max-w-2xl md:max-w-4xl` (matching HabitListPage).
- [x] On desktop, the ArchivedHabitsPage header and content align with the NavBar edges.

### AC2: NavBar header always pink

- [x] The NavBar header background is `bg-pink-50` on **all** pages — not just the habits list and calendar pages.
- [x] Remove the conditional `isHabits ? 'bg-pink-50' : 'bg-surface'` and always use `bg-pink-50`.

## Tasks / Subtasks

- [x] Task 1: Widen ArchivedHabitsPage containers (AC: #1)
  - [x] In `client/src/pages/ArchivedHabitsPage.tsx` line 63, change `max-w-2xl` to `max-w-2xl md:max-w-4xl`
  - [x] In `client/src/pages/ArchivedHabitsPage.tsx` line 76, change `max-w-2xl` to `max-w-2xl md:max-w-4xl`

- [x] Task 2: Make NavBar header always pink (AC: #2)
  - [x] In `client/src/components/NavBar.tsx` line 17, change:
    ```tsx
    const headerCls = `border-b border-border ${isHabits ? 'bg-pink-50' : 'bg-surface'}`;
    ```
    to:
    ```tsx
    const headerCls = 'border-b border-border bg-pink-50';
    ```
  - [x] The `isHabits` variable is still used for `aria-current` on the logo link — kept as-is.

- [x] Task 3: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (233 tests, all pass)
  - [x] Client build succeeds

## Dev Notes

### Issue 1: ArchivedHabitsPage width

The screenshot shows the NavBar spanning `max-w-2xl md:max-w-4xl` (from story 7-4), but the ArchivedHabitsPage sub-header and main content are still at `max-w-2xl`. The fix is the same pattern applied to HabitListPage in story 7-4.

Current (lines 63, 76):
```tsx
<div className="max-w-2xl mx-auto px-4 py-4 ...">
...
<main className="max-w-2xl mx-auto px-4 py-8">
```

Target:
```tsx
<div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-4 ...">
...
<main className="max-w-2xl md:max-w-4xl mx-auto px-4 py-8">
```

### Issue 2: NavBar header background color

Current NavBar.tsx line 17:
```tsx
const headerCls = `border-b border-border ${isHabits ? 'bg-pink-50' : 'bg-surface'}`;
```

This makes the header pink only when `isHabits` is true (i.e., on `/habits` and `/habits/:id`). On `/habits/archived` and `/settings`, the header is grey (`bg-surface`).

Target:
```tsx
const headerCls = 'border-b border-border bg-pink-50';
```

After this change, check if `isHabits` is still referenced. It's used on line 25 for `aria-current={isHabits ? 'page' : undefined}` on the logo link — so keep `isHabits` even though it's no longer used in `headerCls`.

### Critical implementation guardrails

1. **Only two files to modify.** Do not touch any other components or pages.
2. **Do NOT change `isHabits`, `isArchived`, or `isSettings` variables** in NavBar — they're used for active route highlighting and `aria-current`.
3. **Do NOT change `activeCls` or `inactiveCls`** — nav button styling stays as-is.
4. **Keep `bg-pink-50`** — this is the established header background from the existing design.

### Previous story intelligence

From story 7-4 (UI Consistency Polish):
- Width pattern: `max-w-2xl md:max-w-4xl` for all content containers
- NavBar and HabitListPage were updated; ArchivedHabitsPage was missed
- Commit pattern: `feat(shell): <desc> (E7-S7)`

### Git intelligence

```
feat(shell): final ui polish (E7-S7)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (modified) | `client/src/pages/ArchivedHabitsPage.tsx` (width), `client/src/components/NavBar.tsx` (header bg) |

### References

- [Source: client/src/pages/ArchivedHabitsPage.tsx — max-w-2xl on lines 63 and 76]
- [Source: client/src/components/NavBar.tsx — conditional headerCls on line 17]
- [Screenshot: width mismatch between NavBar and ArchivedHabitsPage content]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

None — clean implementation, no issues.

### Completion Notes List

- AC1: Widened ArchivedHabitsPage header and main containers from `max-w-2xl` to `max-w-2xl md:max-w-4xl`, aligning with NavBar and all other pages.
- AC2: Changed NavBar `headerCls` from conditional `isHabits ? 'bg-pink-50' : 'bg-surface'` to always `bg-pink-50`. `isHabits` variable kept since it's still used for `aria-current` on the logo link.

### File List

| File | Action | Description |
|------|--------|-------------|
| `client/src/pages/ArchivedHabitsPage.tsx` | Modified | Widened header and main containers to `max-w-2xl md:max-w-4xl` |
| `client/src/components/NavBar.tsx` | Modified | Changed header background to always use `bg-pink-50` |

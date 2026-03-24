# Story 7.1: Auth Layout & Protected Routes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want separate layouts for auth pages and the main app,
so that unauthenticated users see login/register and authenticated users see the app.

## Acceptance Criteria

1. **AuthLayout wraps auth routes:** An `AuthLayout` component wraps `/login`, `/register`, `/forgot-password`, `/reset-password/:token`. It provides a shared centered layout with the "Habit Tracker" branding.
2. **AppLayout wraps authenticated routes:** An `AppLayout` component wraps `/habits`, `/habits/:id`, `/habits/archived`, `/settings`. It provides the authenticated app shell.
3. **Protected routes redirect to `/login`:** When no valid JWT exists, attempting to access any `AppLayout` route redirects to `/login`.
4. **Auth pages redirect to `/habits`:** When a user is already authenticated, navigating to any `AuthLayout` route redirects to `/habits`.
5. **AuthContext provider at app root:** Manages JWT state and user info. (Already exists — no changes needed.)
6. **JWT expiry check on app load and API calls:** On load, expired tokens are cleared (already done in `AuthContext`). On API calls, the server's 401 response triggers session cleanup and redirect (already done in `api.ts`).

## Tasks / Subtasks

- [x] Task 1: Create AuthLayout component (AC: #1, #4)
  - [x] Create `client/src/components/AuthLayout.tsx`
  - [x] Uses `useAuth()` to check `isAuthenticated`
  - [x] If authenticated, render `<Navigate to="/habits" replace />`
  - [x] If not authenticated, render `<Outlet />` (React Router nested route outlet)
  - [x] No shared visual wrapper needed — auth pages already have their own full-screen centering and branding. AuthLayout is purely a route guard.

- [x] Task 2: Create AppLayout component (AC: #2, #3)
  - [x] Create `client/src/components/AppLayout.tsx`
  - [x] Uses `useAuth()` to check `isAuthenticated`
  - [x] If not authenticated, render `<Navigate to="/login" replace />`
  - [x] If authenticated, render `<Outlet />`
  - [x] No shared visual wrapper needed yet — each page has its own header/layout. The NavBar (story 7-2) will be added to AppLayout later.

- [x] Task 3: Restructure App.tsx routes (AC: #1, #2, #3, #4)
  - [x] Wrap auth routes under a parent `<Route element={<AuthLayout />}>` with nested child routes
  - [x] Wrap protected routes under a parent `<Route element={<AppLayout />}>` with nested child routes
  - [x] Keep the root `/` redirect as-is (`<RootRedirect />`)
  - [x] Final route structure:
    ```tsx
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/habits" element={<HabitListPage />} />
        <Route path="/habits/archived" element={<ArchivedHabitsPage />} />
        <Route path="/habits/:id" element={<HabitCalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
    ```
  - [x] Import `AuthLayout` and `AppLayout`

- [x] Task 4: Remove per-page auth guards from protected pages (AC: #3)
  - [x] `HabitListPage.tsx`: Remove the `useEffect` that checks `isAuthenticated` and navigates to `/login`. Remove `if (!isAuthenticated) return null` if present. Remove unused `navigate` import if it was only used for the auth redirect. Keep `useAuth` if `logout` or other auth functions are still used.
  - [x] `ArchivedHabitsPage.tsx`: Same — remove the auth guard `useEffect` and early return.
  - [x] `HabitCalendarPage.tsx`: Same — remove the `useEffect` + `navigate('/login')` block (lines ~68-72) and the `if (!isAuthenticated) return null` (line ~311). Keep `useAuth` since `isAuthenticated` may still be used elsewhere, but verify.
  - [x] `SettingsPage.tsx`: Same — remove the auth guard `useEffect`.

- [x] Task 5: Verify auth pages don't need changes (AC: #4)
  - [x] `LoginPage.tsx`: Currently does NOT check `isAuthenticated` on mount — the `AuthLayout` wrapper now handles this redirect. No changes needed.
  - [x] `RegisterPage.tsx`: Same — no `isAuthenticated` check exists. AuthLayout handles it.
  - [x] `ForgotPasswordPage.tsx`: Same.
  - [x] `ResetPasswordPage.tsx`: Same.

- [x] Task 6: Write/update tests (AC: #1, #2, #3, #4)
  - [x] Create `client/src/components/AuthLayout.test.tsx`:
    - [x] Test: unauthenticated user sees child content (Outlet renders)
    - [x] Test: authenticated user is redirected to /habits
  - [x] Create `client/src/components/AppLayout.test.tsx`:
    - [x] Test: authenticated user sees child content (Outlet renders)
    - [x] Test: unauthenticated user is redirected to /login
  - [x] Update existing page tests if they relied on the per-page auth guard behavior
  - [x] Verify existing `HabitCalendarPage.test.tsx` still passes (it mocks `useAuth` — the layout guard is above the page component so page tests should be unaffected)

- [x] Task 7: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (all existing + new tests)
  - [x] Client build succeeds
  - [x] Manual test: unauthenticated → `/habits` redirects to `/login`; authenticated → `/login` redirects to `/habits`; logout → lands on `/login`; login → lands on `/habits`

## Dev Notes

### What already exists (DO NOT recreate)

This story is about **consolidating** existing scattered auth guard logic into centralized layout components, NOT about building auth from scratch.

| Component | Status | Notes |
|-----------|--------|-------|
| `AuthContext` | **Done** | JWT storage, `login`/`logout`, `isTokenExpired` check on load. No changes needed. |
| `api.ts` | **Done** | Bearer token, X-Timezone, 401 cleanup + redirect, 429 handling. No changes needed. |
| `main.tsx` | **Done** | BrowserRouter + QueryClientProvider + AuthProvider wrapping App. No changes needed. |
| Per-page auth guards | **Done but being REPLACED** | `HabitListPage`, `ArchivedHabitsPage`, `HabitCalendarPage`, `SettingsPage` each have `useEffect` + `navigate('/login')`. These get removed in Task 4. |
| Root redirect | **Done** | `RootRedirect` in `App.tsx` already redirects based on auth state. No changes needed. |

### Layout components are pure route guards

Per the architecture, `AuthLayout` and `AppLayout` are **not** visual wrappers in this story. Each page already owns its own complete layout (header, centering, spacing). The layouts exist solely to:
- `AuthLayout`: Redirect authenticated users away from auth pages → `/habits`
- `AppLayout`: Redirect unauthenticated users away from protected pages → `/login`

The `NavBar` component will be added inside `AppLayout` in story 7-2. Until then, `AppLayout` is just `isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />`.

### React Router v7 nested route pattern

React Router v7 supports layout routes (routes with `element` but no `path`). Child routes render into the layout's `<Outlet />`:

```tsx
<Route element={<AppLayout />}>       {/* no path — matches all children */}
  <Route path="/habits" element={<HabitListPage />} />
  <Route path="/habits/:id" element={<HabitCalendarPage />} />
</Route>
```

This is the standard pattern for route-level guards in React Router v7. Import `Outlet` from `react-router-dom`.

### Critical implementation guardrails

1. **Do NOT create visual layout wrappers.** AuthLayout and AppLayout are pure auth guard components that render `<Outlet />` or `<Navigate />`. No divs, no styling, no shared headers. Story 7-2 will add NavBar to AppLayout.
2. **Do NOT change `AuthContext.tsx`.** It already handles JWT state, expiry check on load, login/logout. It works correctly.
3. **Do NOT change `api.ts`.** The 401 handler already clears tokens and redirects. It works correctly.
4. **Do NOT change `main.tsx`.** The provider nesting is already correct.
5. **REMOVE per-page auth guards completely.** The per-page `useEffect` + `navigate('/login')` pattern was a temporary solution. With AppLayout, these are redundant and can cause double-redirects. Remove them from all 4 protected pages.
6. **Be careful with `useAuth` imports.** Some pages use `useAuth` for BOTH auth guarding AND other features (e.g., `HabitListPage` uses `logout`). Only remove the auth guard `useEffect` — keep the `useAuth` hook if other functions are still used.
7. **Keep `HabitCalendarPage`'s `isAuthenticated` guard careful.** The page has `if (!isAuthenticated) return null` at line ~311. This can be removed since `AppLayout` handles it. But verify `isAuthenticated` is not used elsewhere in the component (it is NOT used elsewhere — only the early return and the removed useEffect used it). Actually, check if `isAuthenticated` is used as a guard on the `useEffect` that loads habit data — if so, it can stay as a safety check, but the `navigate('/login')` useEffect should be removed.
8. **Route order matters.** In the `<Route element={<AppLayout />}>` group, `/habits/archived` must come before `/habits/:id` to avoid `:id` matching "archived". The current order already handles this correctly.
9. **`<Navigate replace />` is essential.** Use `replace` on both layout redirects to avoid pushing redirect entries onto the browser history stack. Without `replace`, the user's back button would loop.

### Per-page auth guard removal details

**`HabitListPage.tsx`** (lines 25-29):
```typescript
// REMOVE this block:
useEffect(() => {
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
  }
}, [isAuthenticated, navigate]);
```
Keep `useAuth` — `logout` is used in the page UI.

**`ArchivedHabitsPage.tsx`**: Same pattern — remove the auth guard useEffect. Check if `useAuth`/`navigate` are used elsewhere.

**`HabitCalendarPage.tsx`** (lines 68-72):
```typescript
// REMOVE this block:
useEffect(() => {
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
  }
}, [isAuthenticated, navigate]);
```
Also remove `if (!isAuthenticated) return null;` (line ~311). `isAuthenticated` is ONLY used in these two places and as an `enabled` guard on the habit-loading `useEffect` (line 75: `if (!isAuthenticated) return;`). That inner guard is defensive and can stay, but it will never trigger since AppLayout ensures the page only renders when authenticated.

**`SettingsPage.tsx`** (lines 17-21):
```typescript
// REMOVE this block:
useEffect(() => {
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
  }
}, [isAuthenticated, navigate]);
```
Check if `isAuthenticated` / `navigate` are used elsewhere.

### Previous story intelligence

From story 5-3 (last completed story):
- `HabitCalendarPage.tsx` is 442 lines with complex state management — be careful when removing the auth guard to not break adjacent code
- The `isAuthenticated` check on line 75 (`if (!isAuthenticated) return;`) inside the habit-loading `useEffect` is a defensive guard, not a redirect — it should stay

From earlier epics:
- Each page was built with its own auth guard because layouts didn't exist yet. This was a deliberate "temporary until E7" approach.
- The page-level guards all use the same pattern: `useEffect` + `navigate('/login', { replace: true })` + optional `return null`

### Git intelligence

Recent commit pattern: `feat(category): description (E#-S#)`. For this story:
```
feat(shell): auth and app layout route guards (E7-S1)
```

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/components/AuthLayout.tsx`, `client/src/components/AppLayout.tsx`, `client/src/components/AuthLayout.test.tsx`, `client/src/components/AppLayout.test.tsx` |
| Client (modified) | `client/src/App.tsx` (restructure routes), `client/src/pages/HabitListPage.tsx` (remove guard), `client/src/pages/ArchivedHabitsPage.tsx` (remove guard), `client/src/pages/HabitCalendarPage.tsx` (remove guard), `client/src/pages/SettingsPage.tsx` (remove guard) |

### What this story does NOT include

- No NavBar component (that's story 7-2 — it will be added to AppLayout)
- No React.lazy / code-splitting (that's story 7-3)
- No 404 catch-all route (that's story 7-3)
- No changes to api.ts or AuthContext (both already work correctly)
- No backend changes
- No visual styling changes to any page

### References

- [Source: architecture.md §6 — Route Structure (path → component table)]
- [Source: architecture.md §6 — Component Hierarchy (AuthLayout, AppLayout nesting)]
- [Source: architecture.md §6 — State Management (Auth state via AuthContext)]
- [Source: epics-and-stories.md — E7-S1 acceptance criteria]
- [Source: prd.md — FR30 (habit list as default after login)]
- [Source: client/src/App.tsx — current flat route structure]
- [Source: client/src/contexts/AuthContext.tsx — existing JWT management]
- [Source: client/src/services/api.ts — existing 401 handling]
- [Source: client/src/pages/HabitListPage.tsx — per-page auth guard pattern (lines 25-29)]
- [Source: client/src/pages/HabitCalendarPage.tsx — per-page auth guard (lines 68-72, 311)]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

(none)

### Completion Notes List

- Created `AuthLayout` (redirect authenticated → `/habits`) and `AppLayout` (redirect unauthenticated → `/login`), both pure route guards rendering `<Outlet />` or `<Navigate replace />`.
- Restructured `App.tsx` routes into two layout groups: auth routes under `AuthLayout`, protected routes under `AppLayout`. `RootRedirect` unchanged.
- Removed per-page auth guard `useEffect` + `navigate('/login')` + `if (!isAuthenticated) return null` from `HabitListPage`, `ArchivedHabitsPage`, `HabitCalendarPage`, `SettingsPage`. Cleaned up unused `useAuth`, `useNavigate`, `isAuthenticated` imports where no longer needed.
- `SettingsPage.test.tsx` updated to wrap `SettingsPage` inside `AppLayout` so the existing "unauthenticated redirects to /login" test still works via the layout guard.
- New tests: `AuthLayout.test.tsx` (2), `AppLayout.test.tsx` (2). All 208 tests pass.

### File List

- `client/src/components/AuthLayout.tsx` (new)
- `client/src/components/AppLayout.tsx` (new)
- `client/src/components/AuthLayout.test.tsx` (new)
- `client/src/components/AppLayout.test.tsx` (new)
- `client/src/App.tsx` (modified)
- `client/src/pages/HabitListPage.tsx` (modified)
- `client/src/pages/ArchivedHabitsPage.tsx` (modified)
- `client/src/pages/HabitCalendarPage.tsx` (modified)
- `client/src/pages/SettingsPage.tsx` (modified)
- `client/src/pages/SettingsPage.test.tsx` (modified)

## Change Log

- **2026-03-24:** Story 7.1 implemented — AuthLayout, AppLayout, route restructure, per-page guards removed; sprint status → review.

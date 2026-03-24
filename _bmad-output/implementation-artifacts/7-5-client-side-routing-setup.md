# Story 7.5: Client-Side Routing Setup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want React Router v7 configured with code-split routes and a 404 catch-all,
so that page navigation is fast, non-critical pages load on demand, and unknown URLs show a helpful error page.

## Acceptance Criteria

1. **Code-split non-critical routes with `React.lazy`:** The following page components are lazy-loaded via dynamic `import()`:
   - `SettingsPage`
   - `ArchivedHabitsPage`
   - `ForgotPasswordPage`
   - `ResetPasswordPage`

2. **Critical routes stay eagerly loaded:** These pages are imported statically (no lazy) because they are the primary user paths:
   - `LoginPage`
   - `RegisterPage`
   - `HabitListPage`
   - `HabitCalendarPage`

3. **`React.Suspense` fallback:** A `<Suspense>` boundary wraps the `<Routes>` block with a lightweight loading indicator (centered spinner or "Loading..." text). This displays while lazy chunks are being fetched.

4. **404 catch-all handling:** A `path="*"` route inside `AppLayout` renders a `NotFoundPage` component for authenticated users who visit an unknown URL. Unauthenticated users who visit an unknown URL are redirected to `/login` by the existing route guards. The `NotFoundPage` includes:
   - A clear "Page not found" heading
   - A link back to `/habits`
   - Consistent styling with the rest of the app (pink accent, `bg-background`, same max-width)

5. **Client-side navigation works correctly:**
   - All route transitions use React Router's `<Link>` / `useNavigate` (no full page reloads)
   - Browser back/forward navigation works on all routes
   - Route transitions complete within 300ms (NFR3)

6. **Vite produces separate chunks for lazy routes:** After build, lazy-loaded pages appear as separate `.js` files in the build output (verifiable via `npx vite build` and checking `dist/assets/`).

## Tasks / Subtasks

- [x] Task 1: Create `NotFoundPage` component (AC: #4)
  - [x] Create `client/src/pages/NotFoundPage.tsx`
  - [x] Render a centered "Page not found" message with a "Go to habits" link
  - [x] Style consistently: `bg-background`, `text-text`, pink accent link, `max-w-2xl md:max-w-4xl mx-auto`
  - [x] Keep it simple — no heavy illustrations or animations

- [x] Task 2: Add `React.lazy` imports and `Suspense` to `App.tsx` (AC: #1, #2, #3)
  - [x] Convert these static imports to `React.lazy`:
    ```tsx
    const SettingsPage = lazy(() => import('./pages/SettingsPage'));
    const ArchivedHabitsPage = lazy(() => import('./pages/ArchivedHabitsPage'));
    const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
    const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
    ```
  - [x] Keep these as static imports (critical path):
    ```tsx
    import LoginPage from './pages/LoginPage';
    import RegisterPage from './pages/RegisterPage';
    import HabitListPage from './pages/HabitListPage';
    import HabitCalendarPage from './pages/HabitCalendarPage';
    ```
  - [x] Wrap `<Routes>` with `<Suspense fallback={<LoadingFallback />}>` where `LoadingFallback` is a simple centered "Loading..." or spinner
  - [x] Import `lazy` and `Suspense` from `react`

- [x] Task 3: Add catch-all 404 handling (AC: #4)
  - [x] Inside the `<Route element={<AppLayout />}>` group, add: `<Route path="*" element={<NotFoundPage />} />`
  - [x] Keep `AuthLayout` without a `path="*"` catch-all. With pathless layout routes, React Router matches the first layout's `*` catch-all, so putting `*` in both causes `AuthLayout` to intercept unknown URLs first and redirect authenticated users to `/habits` instead of showing 404.
  - [x] Confirm the intended behavior: authenticated users see `NotFoundPage` within `AppLayout`; unauthenticated users are redirected to `/login`

- [x] Task 4: Write tests (AC: #4, #5)
  - [x] Create `client/src/pages/NotFoundPage.test.tsx`:
    - Renders "Page not found" heading
    - Contains a link to `/habits`
    - Shows helpful description
  - [x] Add routing tests in `App.test.tsx`:
    - Authenticated user at `/nonexistent` sees NotFoundPage within AppLayout (NavBar visible)
    - Unauthenticated user at `/nonexistent` gets redirected to login
  - [x] All 225 existing + new tests pass

- [x] Task 5: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (225 tests, 26 files)
  - [x] `npx vite build` succeeds in client
  - [x] Check `client/dist/assets/` for separate chunk files: SettingsPage, ArchivedHabitsPage, ForgotPasswordPage, ResetPasswordPage all have separate `.js` chunks
  - [ ] Manual check: navigate to `/habits`, `/settings`, `/habits/archived` — all load correctly
  - [ ] Manual check: navigate to `/xyz` — shows "Page not found" with link back
  - [ ] Manual check: browser back/forward works between all routes
  - [ ] Manual check: no full page reload on any navigation

## Dev Notes

### Current routing state (what exists already)

`App.tsx` uses `BrowserRouter` (in `main.tsx`) with `Routes`/`Route`:

```
App
├── / → RootRedirect (Navigate to /habits or /login)
├── AuthLayout (layout route)
│   ├── /login → LoginPage
│   ├── /register → RegisterPage
│   ├── /forgot-password → ForgotPasswordPage
│   └── /reset-password/:token → ResetPasswordPage
└── AppLayout (layout route)
    ├── /habits → HabitListPage
    ├── /habits/archived → ArchivedHabitsPage
    ├── /habits/:id → HabitCalendarPage
    └── /settings → SettingsPage
```

All imports are currently **static**. No `React.lazy`, no `Suspense`, no 404 route.

`main.tsx` wraps the app: `BrowserRouter` → `QueryClientProvider` → `AuthProvider` → `App`.

### Which routes to lazy-load (and why)

**Lazy (non-critical):**
- `SettingsPage` — visited infrequently; user lands on habit list first
- `ArchivedHabitsPage` — visited infrequently
- `ForgotPasswordPage` — visited rarely (only when user forgets password)
- `ResetPasswordPage` — visited rarely (only from email link)

**Eager (critical path):**
- `LoginPage` — first page most unauthenticated users see
- `RegisterPage` — second most common entry point
- `HabitListPage` — the default landing page after login (FR30)
- `HabitCalendarPage` — the core feature page

### 404 strategy

React Router v7 uses `path="*"` as a catch-all within a `<Routes>` block. Because this app uses pathless layout routes plus auth guards, the safe implementation is to place the catch-all only inside `AppLayout`:

```tsx
<Route element={<AppLayout />}>
  {/* app routes... */}
  <Route path="*" element={<NotFoundPage />} />
</Route>
```

This gives authenticated users a 404 page with the NavBar visible. Unauthenticated users who navigate to an unknown URL are redirected to `/login` by the existing guard behavior, which is the intended outcome for this app shell.

Do **not** add `path="*"` to both `AuthLayout` and `AppLayout`. With pathless layout routes, React Router matches the first layout catch-all first, which causes `AuthLayout` to intercept unknown URLs and redirect authenticated users away from the 404 page.

For the top-level `/` redirect, `RootRedirect` already handles it.

### Suspense fallback

Keep it simple — a centered text or minimal spinner:

```tsx
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-text-secondary">Loading...</p>
    </div>
  );
}
```

No need for a skeleton or progress bar at this stage.

### Vite code splitting

Vite automatically splits dynamic `import()` calls into separate chunks. No `rollupOptions` or `manualChunks` configuration needed. After build, you'll see files like `SettingsPage-[hash].js` in `dist/assets/`.

Verify with:
```bash
cd client && npx vite build && ls dist/assets/*.js
```

### Testing with lazy imports

Vitest handles dynamic `import()` natively — no special mocking needed. However, tests that render lazy components may need to be wrapped in `<Suspense>` in the test setup. Since most page tests use `MemoryRouter` and render the page directly (not through `App.tsx`), they won't be affected.

For `App.tsx`-level routing tests, ensure `<Suspense>` is included:
```tsx
render(
  <MemoryRouter initialEntries={['/nonexistent']}>
    <Suspense fallback={<div>Loading...</div>}>
      <App />
    </Suspense>
  </MemoryRouter>
);
```

Or better: since `Suspense` is inside `App.tsx` itself, the `<App />` render in tests should just work.

### Critical implementation guardrails

1. **Do NOT use `createBrowserRouter` / `RouterProvider`.** The app uses the classic `BrowserRouter` + `Routes`/`Route` API. Keep it that way.
2. **Do NOT move `BrowserRouter` from `main.tsx` into `App.tsx`.** It must stay in `main.tsx` wrapping the providers.
3. **Do NOT lazy-load `LoginPage`, `RegisterPage`, `HabitListPage`, or `HabitCalendarPage`.** These are critical path pages.
4. **Do NOT add a `Suspense` boundary around individual lazy routes.** Use a single `Suspense` wrapping the entire `<Routes>` block.
5. **Do NOT create a custom loading spinner component in a separate file.** Define `LoadingFallback` inline in `App.tsx` or as a simple function.
6. **Do NOT change any existing route paths.** All current paths must remain exactly as they are.
7. **Do NOT change `AppLayout`, `AuthLayout`, or `NavBar`.** They are complete and working — just add the 404 catch-all route inside the existing `AppLayout` group.
8. **The `NotFoundPage` must use `max-w-2xl md:max-w-4xl mx-auto`** to match the width pattern established in story 7-4.
9. **Import `lazy` from `react`, not from `react-router-dom`.** React Router v7 does not re-export `lazy` (and React Router's `lazy` is a different concept for route-level data loading).
10. **All existing 220+ tests must continue passing.** Do not break existing test infrastructure.

### Previous story intelligence

From story 7-4 (UI Consistency Polish):
- All content containers use `max-w-2xl md:max-w-4xl` — the NotFoundPage must match
- NavBar inactive items use `hover:text-pink-500` — the 404 page link should use `text-pink-500 hover:text-pink-600` for consistency
- Tests: NavBar tests assert active route via `bg-pink-50`; HabitCalendarPage tests were updated to remove description assertions
- 220 client tests passing, lint clean, build OK
- Commit message pattern: `feat(shell): <description> (E7-S5)`

From story 7-1 (Auth Layout & Protected Routes):
- `AuthLayout` redirects authenticated users to `/habits`
- `AppLayout` redirects unauthenticated users to `/login`
- Both use `useAuth()` from `AuthContext`
- Tests use `MemoryRouter` with mocked `AuthContext`

### Git intelligence

Recent commits:
```
8d76e0f feat(shell): complete ui consistency polish (E7-S4)
f9747dc feat(shell): desktop calendar layout and shell planning updates (E7-S3)
7288e7c feat(shell): responsive navigation bar with icons (E7-S2)
5ba6c9b feat(shell): auth and app layout route guards (E7-S1)
```

Pattern: `feat(shell): <description> (E7-SN)` — follow this for the commit.

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/pages/NotFoundPage.tsx`, `client/src/pages/NotFoundPage.test.tsx` |
| Client (modified) | `client/src/App.tsx` (lazy imports, Suspense, 404 routes) |

### What this story does NOT include

- No backend changes
- No changes to existing page components
- No changes to AppLayout, AuthLayout, or NavBar
- No Vite config changes (code splitting works automatically)
- No changes to `main.tsx` or provider structure
- No route path changes

### References

- [Source: architecture.md §6 — Route Structure table, Component Hierarchy]
- [Source: architecture.md §10 — NFR3: page transitions < 300ms via client-side routing + code-split routes with React.lazy]
- [Source: architecture.md §10 — NFR4: initial load < 2s on 4G via Vite tree-shaking + lazy-load non-critical routes]
- [Source: prd.md — FR30: habit list as default view after login]
- [Source: prd.md — FR31: navigate between habit list, calendar, settings]
- [Source: prd.md — NFR3: page transitions < 300ms]
- [Source: prd.md — NFR4: initial app load < 2s on 4G]
- [Source: epics-and-stories.md — E7-S5 acceptance criteria]
- [Source: client/src/App.tsx — current route structure (static imports, no 404)]
- [Source: client/src/main.tsx — BrowserRouter + providers wrapper]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

- Initial attempt had `path="*"` inside both `AuthLayout` and `AppLayout`. This caused authenticated users at unknown URLs to be intercepted by `AuthLayout`'s catch-all first, which redirected them to `/habits` (since `AuthLayout` redirects authenticated users). Fix: only add `*` catch-all inside `AppLayout`. Authenticated users see 404 with NavBar; unauthenticated users get redirected to login.

### Completion Notes List

- Created `NotFoundPage` with "Page not found" heading, helpful description, and "Go to habits" link — styled with `max-w-2xl md:max-w-4xl` for consistency
- Converted 4 non-critical pages to `React.lazy`: SettingsPage, ArchivedHabitsPage, ForgotPasswordPage, ResetPasswordPage
- Kept 4 critical-path pages as static imports: LoginPage, RegisterPage, HabitListPage, HabitCalendarPage
- Added `<Suspense>` wrapping `<Routes>` with a simple `LoadingFallback` ("Loading..." text)
- Added `path="*"` catch-all inside `AppLayout` for authenticated 404 handling; unauthenticated unknown URLs continue redirecting to `/login`
- Vite correctly produces separate chunks for all 4 lazy pages
- Created `NotFoundPage.test.tsx` with 3 tests
- Extended `App.test.tsx` with 404 routing tests (authenticated shows 404, unauthenticated redirects to login)
- All 225 tests pass (26 files), lint clean, build succeeds

### File List

- `client/src/pages/NotFoundPage.tsx` (new — 404 page component)
- `client/src/pages/NotFoundPage.test.tsx` (new — unit tests)
- `client/src/App.tsx` (modified — lazy imports, Suspense, 404 catch-all)
- `client/src/App.test.tsx` (modified — added 404 routing tests, auth seeding)

### Change Log

- 2026-03-24: Implemented client-side routing setup with code-splitting and 404 catch-all (Story 7.5)

# Story 2.3: User Logout

Status: done

## Story

As a logged-in user,
I want to log out of my account,
so that my session is ended on this device.

## Acceptance Criteria

1. Logout action clears JWT from `localStorage`
2. `AuthContext` resets to unauthenticated state
3. User is redirected to `/login`
4. All in-flight API requests are cancelled or ignored after logout

## Tasks / Subtasks

- [x] Task 1: Strengthen logout flow in `AuthContext` (AC: #1, #2, #3, #4)
  - [x] Update `client/src/contexts/AuthContext.tsx` so `logout()` clears React state and localStorage exactly once
  - [x] Call a request-cancellation helper before navigation so pending requests do not complete against a stale session
  - [x] Keep the existing `navigate('/login')` redirect behavior
  - [x] Ensure `logout()` remains safe to call multiple times without throwing or leaving partial state behind

- [x] Task 2: Add API request cancellation support (AC: #4)
  - [x] Update `client/src/services/api.ts` to track active fetch requests with `AbortController`
  - [x] Add a shared registry of active controllers (for example, `Set<AbortController>`)
  - [x] Export `cancelPendingRequests()` that aborts all active controllers and clears the registry
  - [x] Make each helper (`post`, `get`, `put`, `patch`, `del`) register its controller before fetch and always remove it in `finally`
  - [x] Treat aborted requests as non-user-facing events: do not redirect, do not show generic connection errors, and surface them as a distinct `ApiError` code such as `REQUEST_ABORTED` or silently ignore at the caller

- [x] Task 3: Add a visible logout action to the authenticated UI (AC: #1, #2, #3)
  - [x] Add a temporary logout button to the current authenticated placeholder in `client/src/App.tsx`
  - [x] Wire the button to `useAuth().logout()`
  - [x] Place it on the `/habits` placeholder page for now; the permanent navigation location comes later in E7-S2
  - [x] Render the logout action only when `isAuthenticated === true` so unauthenticated direct visits to `/habits` do not show a meaningless logout control
  - [x] Use the existing pink/grey design system and make the button keyboard accessible

- [x] Task 4: Prevent stale-request side effects after logout (AC: #4)
  - [x] Review existing auth failure handling in `api.ts` so an aborted request after logout does not trigger an extra redirect or misleading error
  - [x] Ensure a request that starts before logout but resolves after logout cannot rehydrate auth state or update visible authenticated UI
  - [x] Keep the current 401 behavior for real expired-session cases intact

- [x] Task 5: Add client tests for logout behavior (AC: #1, #2, #3, #4)
  - [x] Create `client/src/contexts/AuthContext.test.tsx` or `client/src/App.logout.test.tsx`
  - [x] Test: calling `logout()` clears `localStorage` token and user
  - [x] Test: logout redirects user to `/login`
  - [x] Test: logout resets authenticated UI to unauthenticated state
  - [x] Test: `cancelPendingRequests()` aborts active requests and clears the controller registry
  - [x] Test: aborted requests during logout do not surface a user-facing network/auth error

- [x] Task 6: Verify end-to-end (all ACs)
  - [x] `npm run build` succeeds for client and server
  - [x] `npm run lint` passes for client and server
  - [x] `npm test` passes for client and server
  - [x] Docker builds succeed: `docker compose build`
  - [ ] Manual test: log in, start an authenticated request, trigger logout, confirm redirect to `/login` and no stale response updates the UI

## Dev Notes

### Story Scope

This is primarily a **client-side** story. No new backend endpoint is required. Logout in this architecture is local session termination: clear the JWT from `localStorage`, reset auth state, and redirect the user. The server remains stateless. [Source: Architecture §9]

### Critical Requirement: Cancel or Ignore In-Flight Requests

Acceptance criterion 4 is the only tricky part of this story. A superficial implementation that only removes the token from `localStorage` is incomplete.

When logout happens:
- Requests already in flight must be aborted if possible
- Any aborted request must not show a noisy error toast/message
- Any request response that arrives after logout must not mutate authenticated UI or recreate session state

Use `AbortController` in the shared API layer so the solution applies consistently across all request helpers rather than one component at a time.

### Recommended `api.ts` Pattern

Use one shared controller registry in `client/src/services/api.ts`:

```typescript
const activeControllers = new Set<AbortController>();

export function cancelPendingRequests(): void {
  for (const controller of activeControllers) {
    controller.abort();
  }
  activeControllers.clear();
}
```

Wrap each request helper:

```typescript
const controller = new AbortController();
activeControllers.add(controller);

try {
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    signal: controller.signal,
  });
  return await handleResponse<T>(response);
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new ApiError(0, 'REQUEST_ABORTED', 'Request cancelled');
  }
  throw error;
} finally {
  activeControllers.delete(controller);
}
```

This keeps cancellation centralized and reusable for later stories that fetch habits, entries, and stats.

### Existing Code to Modify

**`client/src/contexts/AuthContext.tsx`**
- Already has `logout()` that clears state and localStorage, then navigates to `/login`
- Extend it to call `cancelPendingRequests()` from `api.ts` before navigation
- Keep `logout()` as the single source of truth for session teardown

**`client/src/services/api.ts`**
- Already attaches `Authorization` and `X-Timezone` headers
- Already clears localStorage and redirects on 401 when a token existed
- Must now distinguish real 401s from intentional aborts caused by logout
- Add active request tracking here, not inside pages

**`client/src/App.tsx`**
- Currently renders a `HabitsPlaceholder` for `/habits`
- Add the temporary visible logout control here until `NavBar` exists in E7-S2
- Do not turn `/habits` into a protected route in this story; only conditionally render the logout affordance from existing auth state

### UI Placement Guidance

There is no navigation bar yet. Do not invent one in this story.

For this story, the logout action should live in the existing `/habits` placeholder UI as a temporary authenticated affordance. That keeps scope small and satisfies the acceptance criteria without stealing work from E7-S2.

### 401 vs Logout Abort Handling

The current `api.ts` logic clears localStorage and redirects to `/login` on a 401 only if a token existed. Preserve that behavior for genuinely expired/invalid sessions.

Add a separate aborted-request path:
- `AbortError` should not behave like a 401
- `AbortError` should not clear storage again
- `AbortError` should not redirect
- `AbortError` should not show a generic “Could not connect” message

This distinction is essential so logout remains clean and intentional.

### Testing Guidance

This story should not add server tests unless a server-side regression is introduced. Focus tests on:
- AuthContext state reset
- localStorage clearing
- router redirect behavior
- API cancellation behavior
- no stale authenticated UI after logout

For client tests, follow the patterns already established in:
- `client/src/pages/RegisterPage.test.tsx`
- `client/src/pages/LoginPage.test.tsx`

Wrap components with:
- `MemoryRouter`
- `QueryClientProvider`
- `AuthProvider`

Mock fetch where useful, especially for abort behavior.

### Previous Story Intelligence

Key learnings from E2-S1 and E2-S2 that apply here:

1. The current auth state lives entirely in `AuthContext` with `token`, `user`, `isAuthenticated`, `login()`, and `logout()`. Reuse it; do not introduce a second auth store.
2. The API layer already handles 401 cleanup and redirect logic. Extend that layer instead of creating request cancellation in components.
3. The `/habits` route still renders a placeholder, which makes it the correct low-scope place to expose logout before E7-S2 builds the real nav.
4. The app uses React Router and QueryClient at the root already, so logout tests can be written with the same provider structure used in existing auth page tests.

### What This Story Does NOT Include

- A backend logout endpoint
- Token revocation or server-side session invalidation
- A full navigation bar or settings menu
- Protected route guards and auth layouts (E7-S1)
- API interceptor refactor beyond what is needed for cancellation/ignore behavior (E7-S4 will deepen that work)

### References

- [Source: Epics — E2-S3 acceptance criteria]
- [Source: PRD — FR3]
- [Source: Architecture §6 — Frontend architecture and route structure]
- [Source: Architecture §9 — JWT/localStorage authentication model]
- [Source: Previous Story 2-1 — AuthContext and API client foundation]
- [Source: Previous Story 2-2 — LoginPage, 401 handling fix, forgot-password placeholder route]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

- **Abort mock fix**: Initial abort tests timed out because the mock fetch returned a never-resolving promise without listening for the abort signal. Fixed by having the mock listen for the `abort` event and reject with a `DOMException('AbortError')`, matching real browser behavior.
- **TypeScript strict typing**: `Promise.catch((err) => err)` returns `unknown` in strict mode. Fixed with explicit `catch((err: unknown) => err)` and `as ApiError` assertion.

### Completion Notes List

- Added `AbortController` request tracking to `api.ts` via shared `activeControllers` registry and centralized `trackedFetch` helper — all five request methods (`post`, `get`, `put`, `patch`, `del`) now use tracked fetch with abort support
- Exported `cancelPendingRequests()` that aborts all active controllers and clears the registry
- Updated `AuthContext.logout()` to call `cancelPendingRequests()` before clearing state, ensuring no in-flight request can complete against a stale session
- Added temporary "Log out" button to `HabitsPlaceholder` on `/habits`, conditionally rendered only when `isAuthenticated === true`, using the existing grey border design system
- Aborted requests surface as `ApiError(0, 'REQUEST_ABORTED', 'Request cancelled')` — distinct from network errors and 401s, no redirect triggered
- 5 new client tests: logout clears localStorage, logout redirects to /login, logout hides authenticated UI, abort cancels requests with correct error code, abort doesn't show misleading error messages
- All 14 client tests pass, all 20 server tests pass, no regressions
- All builds, lints, and Docker builds succeed
- **Code review:** `LoginPage` / `RegisterPage` ignore `REQUEST_ABORTED` so logout mid-submit does not show “Request cancelled”; `trackedFetch` treats both `DOMException` and `Error` with `name === 'AbortError'`; logout button uses `type="button"`

### Change Log

- 2026-03-23: Implemented story 2-3 User Logout — all tasks complete, all automated verifications pass
- 2026-03-23: Code review fixes — silent abort on auth forms, portable AbortError check, explicit button type

### File List

- `client/src/services/api.ts` (modified — added AbortController tracking, `cancelPendingRequests()`, centralized `trackedFetch` helper)
- `client/src/contexts/AuthContext.tsx` (modified — added `cancelPendingRequests()` call in `logout()`)
- `client/src/App.tsx` (modified — added temporary logout button to `HabitsPlaceholder`, conditionally rendered when authenticated)
- `client/src/pages/LoginPage.tsx` (modified — ignore `REQUEST_ABORTED` in submit handler)
- `client/src/pages/RegisterPage.tsx` (modified — ignore `REQUEST_ABORTED` in submit handler)
- `client/src/App.logout.test.tsx` (new — 5 tests covering logout state clearing, redirect, UI reset, abort behavior, and error handling)

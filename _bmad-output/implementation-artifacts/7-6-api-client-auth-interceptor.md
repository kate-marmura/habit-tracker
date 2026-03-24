# Story 7.6: API Client & Auth Interceptor

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the API client to handle all error cases centrally and provide typed functions for every endpoint,
so that pages don't need ad-hoc error handling and the API surface is consistent and type-safe.

## Important: What already exists

Most of this story's acceptance criteria were implemented organically during earlier epics. **Do NOT rewrite or replace the existing code.** Instead, close the specific gaps listed below.

**Already implemented (DO NOT CHANGE unless fixing a gap):**
- `client/src/services/api.ts` — base URL from `VITE_API_URL`, `getAuthHeaders()` with `Authorization: Bearer` + `X-Timezone`, `handleResponse` with 401 (session clear + redirect) and 429 (`Retry-After` parsing), abort tracking, typed `get`/`post`/`put`/`patch`/`del` exports
- `client/src/services/habitsApi.ts` — typed functions for habits, entries, stats, archive/unarchive, delete
- `client/src/contexts/AuthContext.tsx` — JWT + user in localStorage, `login`/`logout`, expiry check on init
- `client/src/main.tsx` — `QueryClientProvider` wrapping the app with `retry: 1`, `staleTime: 5min`
- `@tanstack/react-query` used for entries and stats in `HabitCalendarPage`

## Acceptance Criteria

### AC1: Centralized network error handling in `api.ts`

- [x] In `trackedFetch`, when `fetch()` throws a non-abort error (e.g., `TypeError` for offline/DNS failure), wrap it in an `ApiError(0, 'NETWORK_ERROR', 'Could not connect to the server. Please check your internet connection and try again.')` instead of re-throwing the raw error.
- [x] All call sites that currently catch non-`ApiError` errors (with fallback messages like "Could not load habits...") will now receive a proper `ApiError` with `code: 'NETWORK_ERROR'`, making error handling consistent.

### AC2: Typed auth API module (`authApi.ts`)

- [x] Create `client/src/services/authApi.ts` with typed functions for all auth endpoints:
  - `login(email, password)` → `Promise<{ token: string; user: { id: string; email: string } }>`
  - `register(email, password)` → `Promise<{ token: string; user: { id: string; email: string } }>`
  - `forgotPassword(email)` → `Promise<{ message: string }>`
  - `resetPassword(token, password)` → `Promise<{ message: string }>`
  - `changePassword(currentPassword, newPassword)` → `Promise<void>`
- [x] Each function calls the existing `post`/`put` from `api.ts` — no new HTTP logic.
- [x] Update page components (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `SettingsPage`) to import from `authApi.ts` instead of calling `post`/`put` directly.

### AC3: Migrate remaining `useEffect` data fetching to `useQuery`

- [x] `HabitCalendarPage`: Convert the habit-loading `useEffect` (lines 67-98) to `useQuery` with key `['habit', id]`. Remove the `habit`/`loading`/`error` useState hooks — use `habitQuery.data`, `habitQuery.isLoading`, `habitQuery.error` instead.
- [x] `HabitListPage`: Convert the `useEffect` data fetch (lines 21-46) to `useQuery` with key `['habits']`. Remove `habits`/`loading`/`error` useState. Handle the `reloadNonce` → use `queryClient.invalidateQueries({ queryKey: ['habits'] })` for retry after error, and `queryClient.setQueryData` for optimistic updates after create/edit/archive/delete.
- [x] `ArchivedHabitsPage`: Convert the `useEffect` data fetch to `useQuery` with key `['archivedHabits']`.
- [x] All three pages must preserve their current user-facing behavior (loading states, error messages, data display).

## Tasks / Subtasks

- [x] Task 1: Fix network error handling in `api.ts` (AC: #1)
  - [x] In `trackedFetch` catch block (line 103-113), after the abort check, wrap the remaining error:
    ```tsx
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not connect to the server. Please check your internet connection and try again.',
    );
    ```
  - [x] This ensures all errors from `trackedFetch` are `ApiError` instances

- [x] Task 2: Create `authApi.ts` (AC: #2)
  - [x] Create `client/src/services/authApi.ts`
  - [x] Define response types and typed functions:
    ```tsx
    import { post, put } from './api';

    interface AuthResponse {
      token: string;
      user: { id: string; email: string };
    }

    interface MessageResponse {
      message: string;
    }

    export function login(email: string, password: string): Promise<AuthResponse> {
      return post<AuthResponse>('/api/auth/login', { email, password });
    }

    export function register(email: string, password: string): Promise<AuthResponse> {
      return post<AuthResponse>('/api/auth/register', { email, password });
    }

    export function forgotPassword(email: string): Promise<MessageResponse> {
      return post<MessageResponse>('/api/auth/forgot-password', { email });
    }

    export function resetPassword(token: string, password: string): Promise<MessageResponse> {
      return post<MessageResponse>('/api/auth/reset-password', { token, password });
    }

    export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
      return put<void>('/api/auth/change-password', { currentPassword, newPassword });
    }
    ```

- [x] Task 3: Update auth pages to use `authApi.ts` (AC: #2)
  - [x] `LoginPage.tsx`: Replace `post<LoginResponse>('/api/auth/login', ...)` with `login(email, password)` from `authApi`. Remove the local `LoginResponse` type. Remove `post` import.
  - [x] `RegisterPage.tsx`: Replace `post<RegisterResponse>('/api/auth/register', ...)` with `register(email, password)`. Remove local `RegisterResponse` type. Remove `post` import.
  - [x] `ForgotPasswordPage.tsx`: Replace `post<...>('/api/auth/forgot-password', ...)` with `forgotPassword(email)`. Remove `post` import.
  - [x] `ResetPasswordPage.tsx`: Replace `post<...>('/api/auth/reset-password', ...)` with `resetPassword(token, password)`. Remove `post` import.
  - [x] `SettingsPage.tsx`: Replace `put<...>('/api/auth/change-password', ...)` with `changePassword(currentPassword, newPassword)`. Remove `put` import.
  - [x] All pages still import `ApiError` from `api.ts` for error handling.

- [x] Task 4: Migrate `HabitCalendarPage` habit loading to `useQuery` (AC: #3)
  - [x] Replace the `useEffect` + `fetchHabitById` pattern with:
    ```tsx
    const habitQuery = useQuery({
      queryKey: ['habit', id],
      queryFn: () => fetchHabitById(id!),
      enabled: !!id?.trim(),
    });
    ```
  - [x] Remove `habit`/`loading`/`error` useState hooks
  - [x] Use `habitQuery.data`, `habitQuery.isLoading`, `habitQuery.error` throughout the component
  - [x] The second `useEffect` (lines 100-115) that resets state on `id` change can be simplified — React Query auto-refetches when the key changes. But keep the undo cleanup logic (clearing pending undo timers).
  - [x] Handle the `handleSaved` callback: after edit, use `queryClient.setQueryData(['habit', id], updated)` to update the cached habit
  - [x] Handle archive/unarchive navigation — these navigate away, so no cache update needed

- [x] Task 5: Migrate `HabitListPage` to `useQuery` (AC: #3)
  - [x] Replace `useEffect` + `fetchActiveHabits` with:
    ```tsx
    const habitsQuery = useQuery({
      queryKey: ['habits'],
      queryFn: fetchActiveHabits,
    });
    ```
  - [x] Remove `habits`/`loading`/`error`/`reloadNonce` useState hooks
  - [x] For `handleCreated`: use `queryClient.setQueryData<Habit[]>(['habits'], (old) => [habit, ...(old ?? [])])` for optimistic add
  - [x] For `handleEditSaved`: use `queryClient.setQueryData<Habit[]>(['habits'], (old) => old?.map(...))` for optimistic update
  - [x] For `handleArchiveConfirm` and `handleDeleted`: use `queryClient.setQueryData<Habit[]>(['habits'], (old) => old?.filter(...))` for optimistic remove
  - [x] For retry after error: replace `setReloadNonce` button with `queryClient.invalidateQueries({ queryKey: ['habits'] })`

- [x] Task 6: Migrate `ArchivedHabitsPage` to `useQuery` (AC: #3)
  - [x] Read the current file and apply the same pattern: `useQuery` with key `['archivedHabits']`
  - [x] Remove manual `useEffect` + useState for data loading
  - [x] Handle unarchive/delete with `queryClient.setQueryData` for optimistic removal from list

- [x] Task 7: Write/update tests (AC: #1, #2, #3)
  - [x] Create `client/src/services/authApi.test.ts`: test that each function calls the correct HTTP method/path
  - [x] Update existing page tests if they mock `post`/`put` from `api.ts` — change to mock `authApi` functions instead
  - [x] Update `HabitListPage.test.tsx`, `HabitCalendarPage.test.tsx`, `ArchivedHabitsPage.test.tsx` if they mock `useEffect`-based loading — update to work with `useQuery` patterns (wrap with `QueryClientProvider` in test setup)
  - [x] All existing 225+ tests must continue passing (230 tests now, 5 new from authApi.test.ts)

- [x] Task 8: Verify
  - [x] `npm run lint` passes in client
  - [x] `npm test` passes in client (230 tests, all pass)
  - [x] Client build succeeds

## Dev Notes

### Gap analysis: What's done vs what's needed

| AC from epics | Current state | Gap |
|---|---|---|
| API client in `services/` with base URL | ✅ `api.ts` with `VITE_API_URL` | None |
| `Authorization: Bearer` header | ✅ `getAuthHeaders()` | None |
| `X-Timezone` header | ✅ `getAuthHeaders()` | None |
| 401 → clear auth + redirect | ✅ `handleResponse` with session-preserving exceptions | None |
| 429 → rate-limit message + retry timing | ✅ `handleResponse` parses `Retry-After` | None (basic but functional) |
| Network errors → user-friendly | ⚠️ `trackedFetch` re-throws raw `TypeError` on line 110 | **Task 1: Wrap in ApiError** |
| Typed functions per endpoint | ⚠️ `habitsApi.ts` exists; auth pages use raw `post`/`put` | **Task 2-3: Create `authApi.ts`** |
| React Query integration | ⚠️ Used for entries/stats; habits/list/archived use `useEffect` | **Task 4-6: Migrate to useQuery** |

### Network error fix (Task 1)

Current `trackedFetch` catch block:
```tsx
} catch (error) {
  const isAbortError = ...;
  if (isAbortError) {
    throw new ApiError(0, 'REQUEST_ABORTED', 'Request cancelled');
  }
  throw error;  // ← raw TypeError for network failures
}
```

After fix:
```tsx
} catch (error) {
  const isAbortError = ...;
  if (isAbortError) {
    throw new ApiError(0, 'REQUEST_ABORTED', 'Request cancelled');
  }
  if (error instanceof ApiError) {
    throw error;
  }
  throw new ApiError(
    0,
    'NETWORK_ERROR',
    'Could not connect to the server. Please check your internet connection and try again.',
  );
}
```

This means every error from `trackedFetch` is now an `ApiError`, simplifying all catch blocks in consumers.

### React Query migration strategy (Tasks 4-6)

The migration replaces `useEffect` + `useState` data loading with `useQuery`:

**Before (pattern in all three pages):**
```tsx
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;
  async function load() {
    setLoading(true);
    try {
      const result = await fetchSomething();
      if (!cancelled) setData(result);
    } catch (err) { ... }
    finally { if (!cancelled) setLoading(false); }
  }
  load();
  return () => { cancelled = true; };
}, [deps]);
```

**After:**
```tsx
const query = useQuery({
  queryKey: ['key'],
  queryFn: fetchSomething,
});
// Use query.data, query.isLoading, query.error
```

Benefits: automatic cancellation on unmount, cache deduplication, background refetch, consistent error handling.

**HabitCalendarPage specifics:**
- The habit is loaded via `useEffect` + `fetchHabitById`, while entries and stats already use `useQuery`. Migrating the habit to `useQuery` aligns all three data sources.
- The `handleSaved` callback currently does `setHabit(updated)` — replace with `queryClient.setQueryData(['habit', id], updated)`.
- The id-change `useEffect` that resets calendar state should keep the undo cleanup logic but can drop manual state resets (React Query handles refetch on key change).

**HabitListPage specifics:**
- Currently uses `reloadNonce` state + `useEffect` for retry. Replace with `queryClient.invalidateQueries`.
- Optimistic updates for create/edit/archive/delete: use `queryClient.setQueryData<Habit[]>(['habits'], ...)` in each handler (same pattern as the mutation `onMutate` on the calendar page).
- Also invalidate `['habits']` after mutations settle to ensure consistency.

### Test impact

Pages that used `useEffect` for data loading probably have tests that mock the API functions and assert on rendered state. After migration to `useQuery`:
- Tests need `QueryClientProvider` wrapping (some may already have it)
- Mock the API function (same as before)
- `waitFor` assertions work the same way since React Query triggers re-renders

Auth page tests that mock `post`/`put` from `api.ts` should be updated to mock `authApi` functions instead — simpler and more explicit.

### Critical implementation guardrails

1. **Do NOT rewrite `api.ts` from scratch.** Only add the network error wrapping in `trackedFetch`.
2. **Do NOT change `handleResponse`, `getAuthHeaders`, or the 401/429 handling.** They work correctly.
3. **Do NOT change `habitsApi.ts`.** It already has typed functions for all habit endpoints.
4. **Do NOT change `AuthContext.tsx`.** Auth state management is complete.
5. **Do NOT change `main.tsx` QueryClient configuration.** `retry: 1` and `staleTime: 5min` are correct.
6. **`authApi.ts` must use `post`/`put` from `api.ts`** — no direct `fetch` calls, no axios.
7. **Keep `ApiError` import in auth pages** — they still need it for error type checking in catch blocks.
8. **React Query migration must preserve current UX exactly.** Loading states, error messages, and data display must be identical.
9. **Use `queryClient.setQueryData` for optimistic list updates**, not `invalidateQueries` alone (which would cause a loading flash).
10. **The `['habit', id]` query key must include the id** so React Query fetches the correct habit when navigating between habits.
11. **Do NOT add a global React Query error handler.** Error handling stays in each component.
12. **All existing 225+ tests must pass.** Run `npm test` in client before considering done.

### Previous story intelligence

From story 7-5 (Client-Side Routing Setup):
- `App.tsx` now uses `React.lazy` + `Suspense` + `NotFoundPage`
- Tests: 225 passing, lint clean, build OK
- `BrowserRouter` in `main.tsx`, `Routes`/`Route` in `App.tsx`
- Commit pattern: `feat(shell): <desc> (E7-S6)`

From story 7-4 (UI Consistency Polish):
- Content width: `max-w-2xl md:max-w-4xl`
- NavBar active: `bg-pink-50 text-pink-500`
- Test pattern: mock `AuthContext` with `MemoryRouter`

### Git intelligence

```
bd7d6bf feat(shell): complete client-side routing setup (E7-S5)
8d76e0f feat(shell): complete ui consistency polish (E7-S4)
```

Commit: `feat(shell): api client and auth interceptor (E7-S6)`

### Project structure (expected touches)

| Area | Files |
|------|--------|
| Client (new) | `client/src/services/authApi.ts`, `client/src/services/authApi.test.ts` |
| Client (modified) | `client/src/services/api.ts` (network error fix), `client/src/pages/LoginPage.tsx`, `client/src/pages/RegisterPage.tsx`, `client/src/pages/ForgotPasswordPage.tsx`, `client/src/pages/ResetPasswordPage.tsx`, `client/src/pages/SettingsPage.tsx` (use authApi), `client/src/pages/HabitCalendarPage.tsx`, `client/src/pages/HabitListPage.tsx`, `client/src/pages/ArchivedHabitsPage.tsx` (useQuery migration), plus their test files |

### What this story does NOT include

- No backend changes
- No changes to `habitsApi.ts` (already complete)
- No changes to `AuthContext.tsx` (already complete)
- No changes to `main.tsx` (QueryClient config already correct)
- No changes to AppLayout, AuthLayout, NavBar, or routing
- No new dependencies (React Query already installed)

### References

- [Source: architecture.md §5 — Authentication (Bearer JWT header)]
- [Source: architecture.md §4 — Timezone Strategy (X-Timezone header, NFR15)]
- [Source: architecture.md §6 — State Management (React Query + Context)]
- [Source: architecture.md §9 — Auth Rate Limiting (429 + Retry-After)]
- [Source: prd.md — NFR14: rate limiting on auth endpoints]
- [Source: client/src/services/api.ts — existing API client (lines 1-137)]
- [Source: client/src/services/habitsApi.ts — existing typed habit functions]
- [Source: client/src/contexts/AuthContext.tsx — existing auth state]
- [Source: client/src/main.tsx — QueryClientProvider setup]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor Agent)

### Debug Log References

None — all tests passed on first run after implementation.

### Completion Notes List

- AC1: Wrapped raw network errors in `ApiError(0, 'NETWORK_ERROR', ...)` in `trackedFetch` catch block. Added `instanceof ApiError` guard before the wrap so already-typed errors pass through.
- AC2: Created `authApi.ts` with 5 typed functions (`login`, `register`, `forgotPassword`, `resetPassword`, `changePassword`). Updated all 5 auth pages to import from `authApi` instead of raw `post`/`put`.
- AC3: Migrated `HabitCalendarPage`, `HabitListPage`, and `ArchivedHabitsPage` from `useEffect`+`useState` data loading to `useQuery`. Used `queryClient.setQueryData` for optimistic updates and `queryClient.invalidateQueries` for retry. Error derivation checks `instanceof ApiError` to show API messages vs generic fallbacks.
- Tests: Created `authApi.test.ts` (5 tests). Updated auth page tests to mock `authApi` functions. All 230 tests pass.

### File List

| File | Action | Description |
|------|--------|-------------|
| `client/src/services/api.ts` | Modified | Wrapped non-abort, non-ApiError errors in `ApiError(0, 'NETWORK_ERROR', ...)` in `trackedFetch` |
| `client/src/services/authApi.ts` | Created | Typed auth API functions: login, register, forgotPassword, resetPassword, changePassword |
| `client/src/services/authApi.test.ts` | Created | Unit tests for authApi (5 tests) |
| `client/src/pages/LoginPage.tsx` | Modified | Uses `loginApi` from authApi instead of raw `post` |
| `client/src/pages/RegisterPage.tsx` | Modified | Uses `registerApi` from authApi instead of raw `post` |
| `client/src/pages/ForgotPasswordPage.tsx` | Modified | Uses `forgotPasswordApi` from authApi instead of raw `post` |
| `client/src/pages/ResetPasswordPage.tsx` | Modified | Uses `resetPasswordApi` from authApi instead of raw `post` |
| `client/src/pages/SettingsPage.tsx` | Modified | Uses `changePasswordApi` from authApi instead of raw `put` |
| `client/src/pages/HabitCalendarPage.tsx` | Modified | Migrated habit loading from useEffect to useQuery with key `['habit', id]` |
| `client/src/pages/HabitListPage.tsx` | Modified | Migrated data loading from useEffect to useQuery with key `['habits']` |
| `client/src/pages/ArchivedHabitsPage.tsx` | Modified | Migrated data loading from useEffect to useQuery with key `['archivedHabits']` |
| `client/src/pages/LoginPage.test.tsx` | Modified | Updated to mock authApi.login instead of api.post |
| `client/src/pages/ForgotPasswordPage.test.tsx` | Modified | Updated to mock authApi.forgotPassword instead of api.post |
| `client/src/pages/ResetPasswordPage.test.tsx` | Modified | Updated to mock authApi.resetPassword instead of api.post |
| `client/src/pages/SettingsPage.test.tsx` | Modified | Updated to mock authApi.changePassword instead of api.put |

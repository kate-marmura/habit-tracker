# Story 8.1: Main E2E User Flows

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a team,
I want a small but meaningful Playwright regression suite for the app's shipped MVP journeys,
so that we can catch breakages in the most important user flows before release.

## Acceptance Criteria

### AC1: Repeatable Playwright execution

- [x] `npm run test:e2e` runs from the repo root against a repeatable environment that supports the real auth and habit flows.
- [x] The suite contains 5-10 scenario-focused Playwright tests in `e2e/`.
- [x] Minimum 5 Playwright tests pass in a clean local run.

### AC2: Core auth coverage

- [x] Unauthenticated access to `/habits` redirects to `/login`.
- [x] At least one happy-path auth test covers either unique-user registration or login with a known test account and lands on `/habits`.
- [x] Logout returns the user to `/login` and blocks access to protected routes until re-authenticated.

### AC3: Core habit lifecycle coverage

- [x] At least one test creates a habit via the real UI and verifies it appears in the active list and/or opens its calendar page.
- [x] At least one test marks today's day and verifies visible calendar/statistics state changes.
- [x] At least one test covers the unmark flow, including the undo toast path or equivalent visible post-unmark state.
- [x] At least one test archives a habit and restores it from `/habits/archived`.
- [x] At least one test permanently deletes a habit using the typed-name confirmation flow.

### AC4: Reliable Playwright implementation

- [x] Tests use stable, user-facing selectors first: `getByRole`, `getByLabel`, visible text, `aria-label`, and existing form ids.
- [x] Tests do not rely on brittle CSS selectors, XPath, or layout-dependent DOM traversal for primary interactions.
- [x] Test data is isolated with unique emails/habit names and/or cleanup so reruns do not depend on previous database state.
- [x] The existing shallow `e2e/smoke.spec.ts` coverage is replaced by or folded into the new suite.
- [x] Existing Playwright debugging artifacts remain enabled (`reporter: 'html'`, `trace: 'on-first-retry'`).

## Tasks / Subtasks

- [x] Task 1: Stabilize Playwright runtime for real flows (AC: 1, 2)
  - [x] Review `playwright.config.ts`, root `package.json`, and current app startup assumptions.
  - [x] Ensure the E2E suite runs against a full stack that includes the client plus the API dependencies needed by auth and habit flows.
  - [x] Keep Chromium-only coverage unless cross-browser expansion is explicitly needed.

- [x] Task 2: Create shared E2E helpers and isolated test data patterns (AC: 1, 4)
  - [x] Add lightweight helpers under `e2e/` for unique emails, unique habit names, and reusable auth/navigation flows.
  - [x] Prefer setup/cleanup through the real UI or existing public APIs; avoid adding test-only production endpoints unless absolutely necessary.
  - [x] If `storageState` is introduced, keep auth state files git-ignored and avoid sharing mutable user state across tests that can interfere with each other.

- [x] Task 3: Implement auth-focused Playwright specs (AC: 2, 4)
  - [x] Cover guest redirect from `/habits` to `/login`.
  - [x] Cover happy-path registration or login and landing on `/habits`.
  - [x] Cover logout and the resulting protected-route behavior.

- [x] Task 4: Implement habit lifecycle Playwright specs (AC: 3, 4)
  - [x] Cover create habit from the list or empty state.
  - [x] Cover mark today, unmark, and undo behavior on the calendar.
  - [x] Cover archive and unarchive across active and archived views.
  - [x] Cover permanent deletion with typed-name confirmation.

- [x] Task 5: Verify and clean up the suite (AC: 1, 4)
  - [x] Run `npm run test:e2e` and confirm a minimum of 5 passing tests.
  - [x] Remove or absorb `e2e/smoke.spec.ts` if it duplicates the new regression scenarios.
  - [x] Keep the final suite within the requested 5-10 main tests rather than expanding into every possible edge case.

## Dev Notes

### Why this story exists now

Story `1-6-qa-test-infrastructure-setup` intentionally stopped at Playwright setup plus a smoke spec because the main user flows did not exist yet. Those flows now exist across auth, habits, calendar, archived habits, and settings, so this story converts the placeholder E2E setup into meaningful regression coverage.

### Critical implementation guardrails

1. **Fix the environment gap first.** `playwright.config.ts` currently starts only `npm run dev:client`, but `client/src/services/api.ts` calls `http://localhost:3001` unless `VITE_API_URL` is overridden. Real auth/habit tests will fail unless the API stack is started or otherwise made available to Playwright.
2. **Keep using Playwright at the repo root.** The established structure is root `playwright.config.ts` plus tests in `e2e/`. Do not move E2E into `client/` or introduce a second browser framework.
3. **Use user-facing locators first.** Prefer `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `aria-label`, and existing form ids over CSS or XPath selectors. This matches current Playwright best-practice guidance and the app already exposes good accessible labels for most flows.
4. **Avoid fragile auth shortcuts.** If you reuse authenticated state, do it carefully. These tests mutate server-side data, so shared `storageState` is optional and only safe when data isolation is preserved. Never commit auth state files.
5. **Keep scope on main flows.** The goal is 5-10 high-value tests, not exhaustive edge-case coverage. Forgot/reset-password email-token plumbing is lower priority for this first regression pass unless the developer can cover it cheaply and reliably after the core suite is green.

### Current Playwright baseline

- Root dependency: `@playwright/test` `^1.58.2`
- Root command: `npm run test:e2e`
- Current config: `playwright.config.ts`
- Current smoke placeholder: `e2e/smoke.spec.ts`
- Existing Playwright debugging defaults:
  - HTML reporter
  - Trace on first retry
  - Chromium-only project

### Existing UI anchors that should be used in tests

**Auth routes**

- `/login`
  - Heading text: `Habit Tracker`
  - Subtitle: `Welcome back`
  - Fields: `Email`, `Password`
  - Actions: `Log in`, `Sign up`, `Forgot your password?`
- `/register`
  - Subtitle: `Create your account`
  - Actions: `Create account`, `Log in`

**Habit list**

- `/habits`
  - Heading: `Your Habits`
  - Actions: `+ New habit`, `+ Create a habit`
  - Empty state: `Create your first habit`
  - Habit card actions use `aria-label`s such as `View <name>`, `Archive <name>`, `Delete <name>`

**Create habit modal**

- Dialog title: `Create a new habit`
- Field ids: `habit-name`, `habit-description`, `habit-start-date`
- Actions: `Create habit`, `Cancel`

**Habit calendar**

- Route: `/habits/:id`
- Back link: `Back to habits`
- Settings trigger: `Habit settings`
- Month navigation buttons: `Previous month`, `Next month`
- Calendar grid `aria-label`: `Calendar for <Month Year>`
- Day cells use `role="gridcell"` with `aria-label`s like `<Month> <day> (today)` and `<Month> <day> (marked)`
- Stats panel `aria-label`: `Habit statistics`
- Undo toast copy: `Day unmarked`

**Archived habits**

- Route: `/habits/archived`
- Heading: `Archived Habits`
- Empty state: `No archived habits`
- Back link: `Back to habits`
- Card actions include `Unarchive <name>` and `Delete <name>`

**Deletion flow**

- Dialog title pattern: `Permanently delete '<habit name>'?`
- Confirmation field id: `delete-confirm-name`
- Actions: `Delete`, `Cancel`

**Settings**

- Route: `/settings`
- Heading: `Settings`
- Section title: `Change Password`
- Success message: `Password changed successfully.`
- Field ids: `currentPassword`, `newPassword`, `confirmNewPassword`

### Expected file structure / likely touches

| Area | Files |
|------|-------|
| Root config | `playwright.config.ts`, `package.json` |
| E2E suite | `e2e/*.spec.ts`, optional `e2e/helpers/*` or `e2e/fixtures/*` |
| Optional support | `.gitignore` only if additional local-only Playwright auth artifacts are introduced |

### Out of scope for this story

- Visual regression tooling
- Cross-browser expansion beyond Chromium
- Exhaustive negative-path E2E coverage for every validation branch
- Introducing test-only production endpoints unless absolutely required

### Previous story intelligence

From `1-6-qa-test-infrastructure-setup.md`:

- Playwright is already configured at the project root with `test:e2e`.
- The current suite only contains a smoke test because real user flows were not implemented yet.
- The architecture already expects Playwright to cover critical flows such as auth, create habit, mark/unmark, delete, empty state, and error handling.

### Git intelligence

Recent commit titles show the current style used in this repo:

```text
feat(shell): final ui polish (E7-S7)
feat(shell): api client and auth interceptor (E7-S6)
feat(shell): complete client-side routing setup (E7-S5)
feat(shell): complete ui consistency polish (E7-S4)
feat(shell): desktop calendar layout and shell planning updates (E7-S3)
```

### References

- [Source: `_bmad-output/epics-and-stories.md` - E1-S6 QA infrastructure and new E8-S1 scope]
- [Source: `_bmad-output/architecture.md` §13 - Testing Strategy and E2E QA Integration]
- [Source: `_bmad-output/prd.md` - NFR16, NFR17, NFR18]
- [Source: `playwright.config.ts`]
- [Source: `package.json`]
- [Source: `e2e/smoke.spec.ts`]
- [Source: `client/src/services/api.ts`]
- [Source: `client/src/pages/LoginPage.tsx`]
- [Source: `client/src/pages/RegisterPage.tsx`]
- [Source: `client/src/pages/HabitListPage.tsx`]
- [Source: `client/src/pages/HabitCalendarPage.tsx`]
- [Source: `client/src/pages/ArchivedHabitsPage.tsx`]
- [Source: `client/src/pages/SettingsPage.tsx`]
- [Source: `client/src/components/CreateHabitModal.tsx`]
- [Source: `client/src/components/DeleteHabitModal.tsx`]
- [Source: `client/src/components/CalendarGrid.tsx`]
- [Source: `client/src/components/DayCell.tsx`]

## Dev Agent Record

### Agent Model Used

Claude 4.6 Opus (Cursor Agent)

### Debug Log References

- None.

### Completion Notes List

- Story context created for a new cross-cutting E2E coverage story after reviewing current product flows, Playwright setup, architecture, PRD, and recent implementation history.
- Story scoped to a high-value 5-10 test regression suite, with an explicit minimum of 5 passing Playwright tests.
- Guardrails added for environment orchestration, stable selectors, data isolation, and smoke-test replacement.
- Updated `playwright.config.ts` to use a `webServer` array that starts both the API server (health-checked at `/api/health`) and the Vite client. Added `dotenv/config` import so the root `.env` is loaded automatically.
- Created `e2e/helpers.ts` with `uniqueEmail()`, `uniqueHabitName()`, `registerUser()`, `loginUser()`, `logoutUser()`, `createHabitViaUI()`, and `todayLabel()` utilities. All auth and data helpers use the real UI — no test-only endpoints introduced.
- Auth tests (3): unauthenticated redirect, unique-user registration landing on `/habits`, logout + protected-route block.
- Habit lifecycle tests (5): create habit (verifies list + calendar), mark today (verifies gridcell aria-label and stats panel), unmark with undo toast, archive/unarchive round-trip across active and archived views, permanent deletion with typed-name confirmation.
- All 8 tests use stable user-facing selectors (`getByRole`, `getByLabel`, `getByText`, form element ids). No CSS selectors, XPath, or layout-dependent DOM traversal.
- Test data isolation: each test registers or reuses a user with a timestamp-unique email and creates habits with timestamp-unique names. Reruns do not depend on prior database state.
- Deleted `e2e/smoke.spec.ts` — its coverage is subsumed by the new auth redirect test.
- Kept existing debugging defaults: `reporter: 'html'`, `trace: 'on-first-retry'`, Chromium-only.
- Full regression suite green: 233 client unit tests, 157 server unit tests, 8 E2E tests — all passing.

### File List

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Updated webServer to array (client + API), added dotenv, increased E2E timeouts, serial worker |
| `package.json` | Added `dotenv` devDependency (root) |
| `e2e/helpers.ts` | Shared helpers: unique data generators, auth flows, habit creation |
| `e2e/auth.spec.ts` | 3 auth-focused E2E tests: redirect, register, logout |
| `e2e/habits.spec.ts` | 5 habit lifecycle E2E tests: create, mark, unmark, archive/unarchive, delete |
| `e2e/tsconfig.json` | Expanded include pattern to cover helper files |
| `e2e/smoke.spec.ts` | Deleted — replaced by the new regression suite |

### Change Log

- 2026-03-25: Implemented story 8-1 — 8 Playwright E2E tests covering core auth and habit lifecycle flows. All tests passing, zero regressions.

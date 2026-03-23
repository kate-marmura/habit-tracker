# Epics & Stories - Habit Tracker

**Author:** Kate
**Date:** March 19, 2026
**Based on:** PRD v1 (March 17, 2026), Architecture v1 (March 18, 2026)

---

## Epic Overview

| # | Epic | Stories | Priority | Description |
|---|------|---------|----------|-------------|
| E1 | Project Setup & Infrastructure | 6 | P0 | Monorepo scaffolding, Docker, database, QA infrastructure, CI pipeline |
| E2 | User Authentication | 6 | P0 | Registration, login, logout, password management |
| E3 | Habit Management | 7 | P0 | Habit CRUD, archiving, unarchiving, deletion, active limit enforcement |
| E4 | Calendar View & Day Marking | 7 | P0 | Calendar grid, tap-to-mark, month navigation, optimistic UI |
| E5 | Progress & Statistics | 3 | P1 | Streak calculation, completion rate, stats panel |
| E6 | AI Coaching | 4 | Phase 2 | LLM integration, help-me button, graceful degradation (deferred from MVP) |
| E7 | App Shell & Navigation | 4 | P0 | Layouts, routing, protected routes, responsive nav |

### Dependency Graph

```
E1 (Setup) ──► E2 (Auth) ──► E7 (App Shell) ──► E3a (Habits: Create/List/Edit)
                                                       │
                                                       ├──► E4 (Calendar) ──► E5 (Stats)
                                                       │
                                                       └──► E3b (Habits: Archive/Unarchive/Delete)

[Phase 2] E4 (Calendar) + E5 (Stats) ──► E6 (AI Coaching)
```

**Note:** E3 is split across sprints. Core habit CRUD (E3-S1 through E3-S3) is needed before Calendar work begins. Archive, unarchive, and delete (E3-S4 through E3-S7) can be completed later since they don't block the calendar experience.

**Note:** E6 (AI Coaching) is deferred to Phase 2. The calendar experience is fully functional without it.

---

## E1: Project Setup & Infrastructure

**Goal:** Establish the monorepo structure, development environment, database, and CI pipeline so all subsequent work has a solid foundation.

### E1-S1: Initialize Monorepo Structure

**As a** developer,
**I want** the monorepo scaffolded with client and server packages,
**so that** I can begin frontend and backend development with a shared root.

**Acceptance Criteria:**

- [ ] Root directory contains `client/` and `server/` directories, each with its own `package.json`
- [ ] Client initialized with Vite + React 19 + TypeScript
- [ ] Server initialized with Express 5 + TypeScript
- [ ] Root contains `.gitignore`, `.env.example`, and `README.md`
- [ ] Tailwind CSS v4 configured in client with custom color palette per Architecture §6 (pink/grey/white theme)
- [ ] ESLint and Prettier configured for both packages
- [ ] TypeScript strict mode enabled in both `tsconfig.json` files

**Refs:** Architecture §11 (Project Structure)

---

### E1-S2: Docker Containerization & Compose Orchestration

**As a** developer,
**I want** Dockerfiles and a Docker Compose setup that containerize and orchestrate the full application,
**so that** development, testing, and production environments are consistent and reproducible.

**Acceptance Criteria:**

**Dockerfiles:**
- [ ] `client/Dockerfile` with multi-stage build (build stage → production Nginx stage)
- [ ] `server/Dockerfile` with multi-stage build (build stage → production Node.js stage)
- [ ] Both Dockerfiles run as non-root users for security
- [ ] Both Dockerfiles include `HEALTHCHECK` instructions
- [ ] `.dockerignore` files in both `client/` and `server/` to exclude `node_modules`, `.env`, etc.

**Docker Compose:**
- [ ] `docker-compose.yml` at project root orchestrating `db`, `server`, and `client` services
- [ ] PostgreSQL 16 container on port 5432 with persistent named volume
- [ ] Proper Docker networking between services (internal network for db ↔ server)
- [ ] Volume mounts for source code in development (hot reload)
- [ ] Environment variables passed via `.env` file and `env_file` directive
- [ ] `docker-compose up` brings up all services successfully

**Health Checks:**
- [ ] `GET /api/health` endpoint returns 200 with `{ status: "ok", db: "connected" }` (includes database connectivity check)
- [ ] Docker Compose health check configuration for all services with appropriate intervals and retries
- [ ] Dependent services wait for health checks (e.g., server waits for db to be healthy)
- [ ] Container logs accessible via `docker-compose logs` with service-level filtering

**Environment Configuration:**
- [ ] `.env.example` documents all required environment variables with safe defaults
- [ ] Compose profiles for `dev` and `test` environments (`docker compose --profile dev up`)
- [ ] Dev profile: source mounts, hot reload, debug ports exposed
- [ ] Test profile: isolated test database, runs test suites, exits on completion

**Refs:** Architecture §12 (Deployment Architecture)

---

### E1-S3: Database Schema & Prisma Setup

**As a** developer,
**I want** the Prisma ORM configured with the initial database schema,
**so that** I can run migrations and have type-safe database access.

**Acceptance Criteria:**

- [ ] `prisma/schema.prisma` defines `users`, `habits`, `day_entries`, and `password_reset_tokens` tables per Architecture §4
- [ ] UUID primary keys with `gen_random_uuid()` defaults
- [ ] `day_entries` has unique constraint on `(habit_id, entry_date)`
- [ ] `habits` has index on `(user_id, is_archived)`
- [ ] `day_entries` has index on `(habit_id, entry_date)`
- [ ] Cascade delete configured: users → habits → day_entries, users → password_reset_tokens
- [ ] `prisma migrate dev` runs successfully and creates all tables
- [ ] Prisma client singleton created at `server/src/lib/prisma.ts`

**Refs:** Architecture §4 (Data Model)

---

### E1-S4: Express Server Foundation

**As a** developer,
**I want** the Express server configured with middleware, error handling, and health check,
**so that** API routes can be added incrementally.

**Acceptance Criteria:**

- [ ] `app.ts` configures Express with JSON body parsing, CORS, and security headers
- [ ] Environment config validated with zod (`config.ts`)
- [ ] Global error handler middleware returns consistent error format: `{ error: { code, message } }`
- [ ] `GET /api/health` returns 200 with `{ status: "ok", db: "connected" }` (includes database connectivity check)
- [ ] Server starts on configurable port (default 3001)
- [ ] Request logging configured for development

**Refs:** Architecture §5 (Error Response Format), §7 (Backend Architecture), §9 (Security Headers)

---

### E1-S5: CI Pipeline Setup

**As a** developer,
**I want** a GitHub Actions CI pipeline,
**so that** lint, type-check, and tests run on every push.

**Acceptance Criteria:**

- [ ] `.github/workflows/ci.yml` triggers on push and PR to main
- [ ] Runs TypeScript type-checking for both client and server
- [ ] Runs ESLint for both packages
- [ ] Runs test suites (Jest for server, Vitest for client)
- [ ] Pipeline fails if any step fails
- [ ] PostgreSQL service container available for integration tests

**Refs:** Architecture §12 (GitHub Actions)

---

### E1-S6: QA Test Infrastructure Setup

**As a** developer,
**I want** test frameworks configured for both unit and end-to-end testing from day one,
**so that** I can write tests alongside features and catch regressions early.

**Acceptance Criteria:**

- [ ] Vitest configured in `client/` with React Testing Library for component tests
- [ ] Jest configured in `server/` for service and route tests
- [ ] Playwright configured at project root for E2E browser tests
- [ ] `client/package.json` has `test` and `test:coverage` scripts
- [ ] `server/package.json` has `test` and `test:coverage` scripts
- [ ] Root `package.json` has `test:e2e` script for Playwright
- [ ] Playwright config targets `http://localhost:5173` (client dev server)
- [ ] Sample smoke test exists for each framework to verify setup works
- [ ] Test directories follow convention: `__tests__/` or `*.test.ts` co-located with source
- [ ] CI pipeline (E1-S5) updated to run all test suites

**QA Integration Approach (ongoing across all sprints):**

The following QA practices apply to every feature story, not just this setup story:

**Backend QA Integration:**
- Write integration tests for each API endpoint as you build it
- Use Postman MCP or similar to validate API contracts against the spec
- Every route in `server/src/routes/` should have a corresponding `*.test.ts` with Supertest assertions

**Frontend QA Integration:**
- Write component tests as you build each component
- Use Chrome DevTools MCP to debug and inspect during development
- Key interactive components (CalendarGrid, DayCell, HabitCard, modals) must have test coverage

**E2E QA Integration:**
- Use Playwright MCP to automate browser interactions
- Cover critical user flows: create habit, mark/complete a day, delete habit, empty state, error handling
- E2E tests run against the full Docker Compose stack

**Refs:** Architecture §13 (Testing Strategy), NFR16, NFR17, NFR18

---

## E2: User Authentication

**Goal:** Implement secure account creation, login, logout, and password management flows with JWT-based stateless authentication.

### E2-S1: User Registration

**As a** new user,
**I want** to create an account with my email and password,
**so that** I can start tracking my habits.

**Acceptance Criteria:**

- [ ] `POST /api/auth/register` accepts `{ email, password }`
- [ ] Email is validated (format, trimmed, lowercased)
- [ ] Password validation: minimum 8 characters, max 128, at least one uppercase, one lowercase, one number; rejected if in common-passwords blocklist (top 1,000)
- [ ] Password is hashed with bcrypt (12 rounds) before storage
- [ ] Returns JWT token on successful registration
- [ ] Returns `409` if email already exists
- [ ] Returns `422` with validation errors for invalid input
- [ ] Rate limited: 5 attempts per 15 minutes per IP (NFR14)
- [ ] Returns `429` with `Retry-After` header when rate limit exceeded
- [ ] Frontend `RegisterPage` at `/register` with email and password fields
- [ ] Form shows inline validation errors including password strength feedback
- [ ] Successful registration redirects to `/habits`

**Refs:** FR1, NFR6, NFR14, Architecture §5 (Auth endpoints), §7 (Password Validation Rules), §9 (Authentication Flow)

---

### E2-S2: User Login

**As a** returning user,
**I want** to log in with my email and password,
**so that** I can access my habit data.

**Acceptance Criteria:**

- [ ] `POST /api/auth/login` accepts `{ email, password }`
- [ ] Verifies password against stored bcrypt hash
- [ ] Returns JWT with 7-day expiry on success
- [ ] Returns `401` for invalid credentials (generic message, no email/password distinction)
- [ ] Rate limited: 5 failed attempts per 15 minutes per IP (NFR14)
- [ ] Returns `429` with `Retry-After` header when rate limit exceeded
- [ ] Frontend `LoginPage` at `/login` with email and password fields
- [ ] JWT stored in `localStorage` via `AuthContext`
- [ ] Successful login redirects to `/habits` (FR30)
- [ ] Login page has link to registration and forgot password

**Refs:** FR2, NFR8, Architecture §5 (Auth endpoints), §9 (JWT structure)

---

### E2-S3: User Logout

**As a** logged-in user,
**I want** to log out of my account,
**so that** my session is ended on this device.

**Acceptance Criteria:**

- [ ] Logout action clears JWT from `localStorage`
- [ ] `AuthContext` resets to unauthenticated state
- [ ] User is redirected to `/login`
- [ ] All in-flight API requests are cancelled or ignored after logout

**Refs:** FR3

---

### E2-S4: Change Password

**As a** logged-in user,
**I want** to change my password from the settings page,
**so that** I can keep my account secure.

**Acceptance Criteria:**

- [ ] `PUT /api/auth/change-password` accepts `{ currentPassword, newPassword }`
- [ ] Verifies current password before updating
- [ ] New password validated with same rules as registration: min 8 chars, max 128, uppercase + lowercase + number, not in common-passwords blocklist
- [ ] New password hashed with bcrypt (12 rounds)
- [ ] Returns `401` if current password is wrong
- [ ] Returns `422` if new password doesn't meet requirements
- [ ] Frontend form on `SettingsPage` at `/settings`
- [ ] Shows success confirmation after password change

**Refs:** FR4, Architecture §5 (Auth endpoints)

---

### E2-S5: Forgot Password (Request Reset)

**As a** user who forgot their password,
**I want** to request a password reset email,
**so that** I can regain access to my account.

**Acceptance Criteria:**

- [ ] `POST /api/auth/forgot-password` accepts `{ email }`
- [ ] Generates random token, hashes it, stores with 1-hour expiry in `password_reset_tokens`
- [ ] Sends email with reset link containing raw token
- [ ] Always returns `200` regardless of whether email exists (prevents enumeration)
- [ ] Rate limited: 3 requests per hour per email address (NFR14)
- [ ] Returns `429` with friendly message when rate limit exceeded
- [ ] Frontend `ForgotPasswordPage` at `/forgot-password`
- [ ] Shows "check your email" message after submission
- [ ] Email utility configured with nodemailer (`server/src/lib/email.ts`)

**Refs:** FR5, NFR10, Architecture §5 (Auth endpoints), §9 (Password Reset Flow)

---

### E2-S6: Reset Password (Complete Reset)

**As a** user with a reset token,
**I want** to set a new password,
**so that** I can log in again.

**Acceptance Criteria:**

- [ ] `POST /api/auth/reset-password` accepts `{ token, newPassword }`
- [ ] Hashes submitted token and looks up matching unexpired, unused row
- [ ] Updates user password and marks token as used (`used_at` timestamp)
- [ ] Returns `400` if token is invalid, expired, or already used
- [ ] Frontend `ResetPasswordPage` at `/reset-password/:token`
- [ ] Shows new password form with confirmation field
- [ ] Redirects to `/login` with success message after reset

**Refs:** FR5, NFR10, Architecture §9 (Password Reset Flow steps 4-7)

---

## E3: Habit Management

**Goal:** Allow users to create, view, edit, and archive habits with a clean list interface and enforcement of the 10-habit active limit.

### E3-S1: Create a Habit

**As a** user,
**I want** to create a new habit with a name, description, and start date,
**so that** I can begin tracking it.

**Acceptance Criteria:**

- [ ] `POST /api/habits` accepts `{ name, description, startDate }`
- [ ] `name` required, max 100 characters; `description` optional; `startDate` required, must be ≤ today (resolved via client timezone), defaults to today in frontend
- [ ] Returns `422` if `startDate` is in the future
- [ ] Server enforces ≤10 active habits — returns `409` with `HABIT_LIMIT_REACHED` if limit exceeded (FR11)
- [ ] Returns created habit object with generated `id`
- [ ] Frontend `CreateHabitModal` accessible from `HabitListPage`
- [ ] Form validates required fields before submission
- [ ] New habit appears in the active habit list immediately after creation
- [ ] Shows limit-reached error if user already has 10 active habits
- [ ] Network errors show a user-friendly message ("Could not create habit. Please check your connection and try again.")
- [ ] Start date is stored as-is and cannot be modified after creation (Architecture §4 Design Decisions)

**Refs:** FR6, FR7 (start_date immutability), FR11, Architecture §5 (Habits endpoints, create validation)

---

### E3-S2: View Active and Archived Habit Lists

**As a** user,
**I want** to see my active habits and be able to view archived ones,
**so that** I can choose which habit to work on or review.

**Acceptance Criteria:**

- [ ] `GET /api/habits` returns active habits (where `is_archived = false`) for the authenticated user
- [ ] `GET /api/habits/archived` returns archived habits for the authenticated user
- [ ] Frontend `HabitListPage` at `/habits` displays active habits as `HabitCard` components
- [ ] Each `HabitCard` shows habit name and a link to its calendar view
- [ ] Navigation link to `ArchivedHabitsPage` at `/habits/archived`
- [ ] Empty state shown when no habits exist ("Create your first habit")
- [ ] Habits are ordered by creation date (newest first)

**Refs:** FR9, FR10, FR30, Architecture §6 (Route Structure, Component Hierarchy)

---

### E3-S3: Edit a Habit

**As a** user,
**I want** to update my habit's name and description,
**so that** I can refine my goals over time.

**Acceptance Criteria:**

- [ ] `PUT /api/habits/:id` accepts `{ name, description }`
- [ ] Only the owning user can edit (ownership check via JWT `userId`)
- [ ] Returns `404` if habit doesn't exist or doesn't belong to user
- [ ] Returns `422` for invalid input
- [ ] Frontend edit accessible via `HabitSettingsDropdown` on `HabitCalendarPage`
- [ ] Changes reflected immediately in the UI after save

**Refs:** FR7, NFR9, Architecture §5 (Habits endpoints)

---

### E3-S4: Archive a Habit

**As a** user,
**I want** to archive a habit I no longer actively track,
**so that** it's removed from my daily view but my history is preserved.

**Acceptance Criteria:**

- [ ] `PATCH /api/habits/:id/archive` sets `is_archived = true`
- [ ] Only the owning user can archive
- [ ] Archived habit no longer appears in `GET /api/habits` (active list)
- [ ] Archived habit appears in `GET /api/habits/archived`
- [ ] Frontend confirmation dialog before archiving
- [ ] Archiving from `HabitCalendarPage` redirects to `/habits`
- [ ] Archiving frees up a slot toward the 10-habit limit

**Refs:** FR8, FR11, Architecture §5 (Habits endpoints)

---

### E3-S5: View Archived Habit (Read-Only)

**As a** user,
**I want** to view an archived habit's calendar and statistics,
**so that** I can look back on my past progress.

**Acceptance Criteria:**

- [ ] `GET /api/habits/:id` returns habit data even if archived
- [ ] Frontend `ArchivedHabitsPage` lists archived habits as `ArchivedHabitCard` components
- [ ] Clicking an archived habit shows its calendar in read-only mode (no tap-to-mark)
- [ ] Statistics (streak, completion rate) are displayed for the archived period
- [ ] Visual indicator that the habit is archived (label or different styling)
- [ ] No edit, mark/unmark, or re-archive actions available on archived habits
- [ ] Unarchive (E3-S6) and delete (E3-S7) actions are added to the archived view in their respective stories

**Refs:** FR12, Architecture §6 (Component Hierarchy — ArchivedHabitCard)

---

### E3-S6: Unarchive a Habit

**As a** user,
**I want** to unarchive a previously archived habit,
**so that** I can resume tracking it without losing my history.

**Acceptance Criteria:**

- [ ] `PATCH /api/habits/:id/unarchive` sets `is_archived = false`
- [ ] Only the owning user can unarchive
- [ ] Server enforces ≤10 active habits — returns `409` with `HABIT_LIMIT_REACHED` if unarchiving would exceed the limit
- [ ] Unarchived habit appears in `GET /api/habits` (active list) and is removed from archived list
- [ ] Frontend unarchive button accessible on the archived habit's read-only calendar view
- [ ] Shows limit-reached error if user already has 10 active habits

**Refs:** FR8a, FR11, Architecture §5 (Habits endpoints)

---

### E3-S7: Delete a Habit

**As a** user,
**I want** to permanently delete a habit and all its data,
**so that** I can remove test habits or ones I no longer want any record of.

**Acceptance Criteria:**

- [ ] `DELETE /api/habits/:id` permanently removes the habit and all associated day_entries (CASCADE)
- [ ] Only the owning user can delete
- [ ] Frontend shows a confirmation dialog with the habit name: "Permanently delete [habit name]? This cannot be undone."
- [ ] User must type the habit name to confirm (prevents accidental deletion)
- [ ] Delete action accessible from both the active habit calendar and the archived habit view
- [ ] After deletion, user is redirected to `/habits`
- [ ] Returns `404` if habit doesn't exist or doesn't belong to user

**Refs:** FR8b, Architecture §5 (Habits endpoints)

---

## E4: Calendar View & Day Marking

**Goal:** Build the core product experience — a beautiful, responsive monthly calendar grid where users can tap days to mark habits as done, with instant visual feedback.

### E4-S1: Calendar Grid Component

**As a** user,
**I want** to see a monthly calendar grid for my habit,
**so that** I can view my progress at a glance.

**Acceptance Criteria:**

- [ ] `CalendarGrid` component renders a 7-column CSS Grid layout (Sun–Sat)
- [ ] Uses `date-fns` for month boundary calculations (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`)
- [ ] Leading/trailing empty cells provide correct weekday alignment
- [ ] Day-of-week headers displayed (S, M, T, W, T, F, S)
- [ ] Current day has a distinct visual highlight
- [ ] Calendar renders within 500ms including all day markers (NFR1)
- [ ] Calendar grid is usable and readable at phone screen widths (375px)
- [ ] Touch targets are ≥44x44px on mobile

**Refs:** FR13, FR17, NFR1, Architecture §6 (Calendar Grid Implementation)

---

### E4-S2: Fetch and Display Day Entries

**As a** user,
**I want** to see which days I've marked as done on the calendar,
**so that** I can visualize my consistency.

**Acceptance Criteria:**

- [ ] `GET /api/habits/:id/entries?month=YYYY-MM` returns all entries for the specified month
- [ ] Frontend sends `X-Timezone` header with IANA timezone identifier (e.g., `America/Los_Angeles`) on all date-sensitive requests (NFR15)
- [ ] Frontend fetches entries when calendar mounts and when month changes
- [ ] Marked days display with a checkmark/filled visual state
- [ ] Unmarked eligible days display as neutral empty squares — no negative indicators (FR18)
- [ ] Days before habit `start_date` are visually distinct (grayed/disabled)
- [ ] Future days are visually distinct (not markable)
- [ ] Loading state shown while entries are being fetched

**Refs:** FR17, FR18, FR19, Architecture §5 (Day Entries endpoints)

---

### E4-S3: Tap-to-Mark a Day (Optimistic UI)

**As a** user,
**I want** to tap a calendar day to mark it as done,
**so that** tracking my habit is instant and satisfying.

**Acceptance Criteria:**

- [ ] Tapping an unmarked eligible day immediately shows it as marked (visual feedback within 200ms — NFR2)
- [ ] `POST /api/habits/:id/entries` fires in the background with `{ date: "YYYY-MM-DD" }` and `X-Timezone` header
- [ ] Server validates: date ≥ habit `start_date` and ≤ today (resolved via client timezone, NFR15); returns `422` if invalid (FR19)
- [ ] Server enforces unique constraint — returns `409` if already marked
- [ ] On API success: no-op (UI already correct)
- [ ] On API failure: revert visual state and show brief error toast
- [ ] CSS transition/animation on the mark action for a satisfying micro-interaction
- [ ] `@tanstack/react-query` mutation with optimistic update
- [ ] Per-cell mutation lock: if a mutation is in-flight for a day cell, further taps on that cell are ignored until the mutation settles (prevents race conditions from rapid taps)

**Refs:** FR14, FR19, NFR2, NFR15, Architecture §6 (Optimistic UI for Day Marking, Mutation queueing)

---

### E4-S4: Tap-to-Unmark a Day (Optimistic UI)

**As a** user,
**I want** to tap a marked day to unmark it,
**so that** I can correct a mistake.

**Acceptance Criteria:**

- [ ] Tapping a marked day immediately removes the checkmark (visual feedback within 200ms)
- [ ] An undo toast appears for 3 seconds with an "Undo" button; the DELETE request is delayed until the toast expires
- [ ] If user taps "Undo" within the toast window, the unmark is cancelled — checkmark is restored, no DELETE is sent
- [ ] If the toast expires without undo, `DELETE /api/habits/:id/entries/:date` fires
- [ ] Server deletes the `day_entries` row for that habit/date
- [ ] On API failure: revert visual state and show brief error toast
- [ ] CSS transition/animation on the unmark action
- [ ] Per-cell mutation lock: same as E4-S3 — further taps ignored while a mutation is in-flight

**Refs:** FR15, NFR2, Architecture §6 (Optimistic UI for Day Marking, Unmark undo toast, Mutation queueing)

---

### E4-S5: Month Navigation

**As a** user,
**I want** to navigate between months on the calendar,
**so that** I can review past months of my habit.

**Acceptance Criteria:**

- [ ] `MonthNavigator` component shows current month/year label with prev/next arrows
- [ ] Previous month button loads the prior month's calendar and entries
- [ ] Next month button loads the next month (disabled when already at current month)
- [ ] Page transitions between months complete within 300ms (NFR3)
- [ ] Navigating months preserves the selected habit context
- [ ] Month label uses clear format (e.g., "March 2026")

**Refs:** FR16, NFR3, Architecture §6 (Component Hierarchy — MonthNavigator)

---

### E4-S6: Habit Switching on Calendar

**As a** user,
**I want** to switch between habits while viewing the calendar,
**so that** I can check on each habit without returning to the list.

**Acceptance Criteria:**

- [ ] `HabitCalendarPage` at `/habits/:id` loads the selected habit's calendar
- [ ] Navigation back to habit list is easily accessible
- [ ] Switching habits via the list reloads the calendar with the new habit's data
- [ ] The app preserves the user's last-viewed habit context within a session (FR32)
- [ ] URL reflects the currently viewed habit

**Refs:** FR20, FR32, Architecture §6 (Route Structure)

---

### E4-S7: DayCell Visual States

**As a** user,
**I want** each day on the calendar to have clear visual states,
**so that** I can instantly understand my progress.

**Acceptance Criteria:**

- [ ] **Marked** state: filled/checkmark indicator, visually prominent
- [ ] **Unmarked eligible** state: neutral empty square, no negative coloring
- [ ] **Before start date** state: grayed out, not interactive
- [ ] **Future date** state: subtly different, not interactive
- [ ] **Today** state: highlighted border or indicator distinguishing it from other days
- [ ] States are distinguishable for colorblind users (not relying solely on color)
- [ ] Hover/press state provides feedback on interactive days
- [ ] Visual states follow the color palette defined in Architecture §6 (Design System & Color Palette)

**Refs:** FR17, FR18, FR19, Architecture §6 (Calendar Grid Implementation, Design System & Color Palette)

---

## E5: Progress & Statistics

**Goal:** Compute and display per-habit statistics — current streak, longest streak, and completion rate — with real-time updates when days are marked or unmarked.

### E5-S1: Statistics Calculation API

**As a** developer,
**I want** a statistics endpoint that computes streaks and completion rate from day_entries,
**so that** the frontend can display accurate stats.

**Acceptance Criteria:**

- [ ] `GET /api/habits/:id/stats` returns `{ currentStreak, longestStreak, completionRate, totalDays, completedDays }`
- [ ] `currentStreak`: count backward from today (if marked) or yesterday (if today not marked but yesterday was); stop at first gap or start_date. Habit created today with no marks = 0. Uses client timezone via `X-Timezone` header to resolve "today" (NFR15).
- [ ] `longestStreak`: sort all entry dates ascending, walk the list counting consecutive days, track the maximum run
- [ ] `completionRate`: `completedDays / totalDays` (days from start_date through today, resolved via client timezone)
- [ ] `totalDays`: number of days from `start_date` through today (inclusive)
- [ ] `completedDays`: count of `day_entries` for this habit
- [ ] Computation uses `day_entries` rows directly (no separate streak table)
- [ ] Returns `404` if habit doesn't belong to user

**Refs:** FR21, FR22, FR23, NFR15, Architecture §4 (Design Decisions — no streaks table), §5 (Statistics endpoints), §7 (Streak Calculation Algorithm)

---

### E5-S2: Stats Panel UI Component

**As a** user,
**I want** to see my streak and completion stats alongside the calendar,
**so that** I get both visual and numerical progress feedback.

**Acceptance Criteria:**

- [ ] `StatsPanel` component displays current streak, longest streak, and completion rate
- [ ] Positioned below or beside the calendar (responsive layout)
- [ ] Completion rate shown as percentage (e.g., "95%")
- [ ] Streak values shown as day counts (e.g., "22 days")
- [ ] Loading state while stats are being fetched
- [ ] Stats panel is visually cohesive with the calendar design

**Refs:** FR21, FR22, FR23, Architecture §6 (Component Hierarchy — StatsPanel)

---

### E5-S3: Real-Time Stats Update on Mark/Unmark

**As a** user,
**I want** my statistics to update immediately when I mark or unmark a day,
**so that** I see the impact of my action right away.

**Acceptance Criteria:**

- [ ] Marking a day triggers a stats refetch (or optimistic recalculation)
- [ ] Unmarking a day triggers a stats refetch (or optimistic recalculation)
- [ ] Stats update reflects on the `StatsPanel` without a page reload
- [ ] No visible delay between the calendar action and the stats update (FR24)

**Refs:** FR24, Architecture §6 (State Management — @tanstack/react-query)

---

## E6: AI Coaching (Phase 2 — Deferred from MVP)

**Goal:** Integrate LLM-powered habit coaching that feels warm, practical, and human — with provider abstraction and graceful degradation when the AI is unavailable.

> **Phase 2 Note:** This epic is deferred from the MVP release. The calendar experience is fully functional without AI coaching, and per the PRD Risk Mitigation Strategy, this is the most cuttable MVP item. All stories below should be implemented in Phase 2 after the core product is stable.

### E6-S1: LLM Provider Abstraction Layer

**As a** developer,
**I want** an abstraction layer for LLM providers,
**so that** I can switch between AI providers without changing application code.

**Acceptance Criteria:**

- [ ] `LLMProvider` interface defined in `server/src/llm/llm-provider.ts` with `generateCoachingTip()` method
- [ ] Interface accepts `{ habitName, habitDescription, currentStreak, completionRate, userMessage? }`
- [ ] `OpenAIProvider` implementation in `server/src/llm/openai-provider.ts`
- [ ] Provider selection configured via environment variable
- [ ] System prompt and user prompt templates defined in `server/src/llm/prompts.ts`
- [ ] Max tokens set to 150 for cost control
- [ ] Model defaults to GPT-4o-mini via `OPENAI_MODEL` env var

**Refs:** NFR12, Architecture §7 (LLM Provider Abstraction), §8 (AI Coaching Design)

---

### E6-S2: Coaching API Endpoint

**As a** user,
**I want** to request AI coaching when I'm struggling,
**so that** I get a personalized, supportive tip.

**Acceptance Criteria:**

- [ ] `POST /api/coaching` accepts `{ habitId, context? }`
- [ ] Fetches habit details and stats for the user
- [ ] Constructs LLM prompt with habit name, description, streak, completion rate, and user context
- [ ] Returns `{ message: "..." }` with the coaching response
- [ ] Rate limited: 10 requests per user per hour (NFR13)
- [ ] Returns `429` when rate limit exceeded with friendly message
- [ ] Returns `404` if habit doesn't belong to user
- [ ] Response returns within 3 seconds (NFR5)

**Refs:** FR25, FR26, NFR5, NFR13, Architecture §5 (AI Coaching endpoints), §8 (Cost Control)

---

### E6-S3: Coaching Modal UI

**As a** user,
**I want** a "Help me" button on my habit calendar that opens a coaching dialog,
**so that** I can get support in a moment of struggle.

**Acceptance Criteria:**

- [ ] `HelpMeButton` component displayed on `HabitCalendarPage`
- [ ] Clicking opens `CoachingModal` with optional text input for context
- [ ] Modal shows loading state while AI response is pending
- [ ] Displays AI response in a warm, readable format
- [ ] User can dismiss the modal and return to the calendar (FR29)
- [ ] Rate limit error shows friendly message ("You've asked for a lot of help today — take a breath, you've got this")
- [ ] AI response uses the tone described in FR27: warm, supportive, non-judgmental

**Refs:** FR25, FR27, FR28, FR29, Architecture §6 (Component Hierarchy — HelpMeButton, CoachingModal)

---

### E6-S4: Graceful AI Degradation

**As a** user,
**I want** the app to handle AI failures gracefully,
**so that** a broken AI connection doesn't ruin my experience.

**Acceptance Criteria:**

- [ ] If LLM API call fails, retry once with a 2-second timeout
- [ ] If retry fails, return a static fallback message: *"I'm having trouble connecting right now. Remember: you've already shown incredible discipline by being here. Take a deep breath and give yourself credit for trying."*
- [ ] Failure is logged server-side for monitoring
- [ ] Frontend displays the fallback message in the same coaching modal format
- [ ] No crash, no error screen — the user experience remains intact

**Refs:** NFR11, Architecture §7 (Graceful AI Degradation)

---

## E7: App Shell & Navigation

**Goal:** Build the authenticated app layout with responsive navigation, protected routes, and smooth client-side transitions.

### E7-S1: Auth Layout & Protected Routes

**As a** developer,
**I want** separate layouts for auth pages and the main app,
**so that** unauthenticated users see login/register and authenticated users see the app.

**Acceptance Criteria:**

- [ ] `AuthLayout` wraps `/login`, `/register`, `/forgot-password`, `/reset-password/:token`
- [ ] `AppLayout` wraps all authenticated routes (`/habits`, `/habits/:id`, `/habits/archived`, `/settings`)
- [ ] Protected routes redirect to `/login` when no valid JWT exists
- [ ] Auth pages redirect to `/habits` when user is already authenticated
- [ ] `AuthContext` provider at app root manages JWT state and user info
- [ ] JWT expiry check on app load and API calls (redirect to login if expired)

**Refs:** FR30, Architecture §6 (Route Structure, Component Hierarchy, State Management — Auth state)

---

### E7-S2: Responsive Navigation Bar

**As a** user,
**I want** a navigation bar to move between my habits, archived list, and settings,
**so that** I can access all parts of the app easily.

**Acceptance Criteria:**

- [ ] `NavBar` component with links to habit list, archived habits, and settings
- [ ] Logout action accessible from navigation
- [ ] Active route visually highlighted in nav
- [ ] Mobile-friendly: bottom nav bar or hamburger menu at small viewports
- [ ] Desktop: sidebar or top nav
- [ ] Navigation transitions complete within 300ms (NFR3)

**Refs:** FR31, NFR3, Architecture §6 (Component Hierarchy — NavBar)

---

### E7-S3: Client-Side Routing Setup

**As a** developer,
**I want** React Router v7 configured with all application routes,
**so that** page navigation is fast and doesn't require full reloads.

**Acceptance Criteria:**

- [ ] React Router v7 configured with routes matching Architecture §6 route table
- [ ] Code-split routes with `React.lazy` for non-critical pages (settings, archived)
- [ ] 404 catch-all route with helpful "page not found" UI
- [ ] Route transitions use client-side navigation (no full page reloads)
- [ ] Browser back/forward navigation works correctly

**Refs:** NFR3, NFR4, Architecture §6 (Route Structure)

---

### E7-S4: API Client & Auth Interceptor

**As a** developer,
**I want** a centralized API client that attaches JWT tokens and handles common errors,
**so that** every API call is authenticated consistently.

**Acceptance Criteria:**

- [ ] API client module in `client/src/services/` with base URL configuration
- [ ] Automatically attaches `Authorization: Bearer <jwt>` header to all requests
- [ ] Automatically attaches `X-Timezone` header with `Intl.DateTimeFormat().resolvedOptions().timeZone` to all requests (NFR15)
- [ ] Handles `401` responses by clearing auth state and redirecting to `/login`
- [ ] Handles `429` responses by showing rate-limit message with retry timing
- [ ] Handles network errors with user-friendly error messages
- [ ] Typed request/response functions for each API endpoint
- [ ] Integrates with `@tanstack/react-query` for server state management

**Refs:** Architecture §5 (Authentication), §6 (State Management)

---

## Story Sizing Reference

| Size | Description | Example |
|------|-------------|---------|
| **S** | Single file change, well-understood pattern | E2-S3 (Logout) |
| **M** | 2-4 files, some design decisions | E3-S3 (Edit Habit) |
| **L** | Multiple files across frontend and backend, new patterns | E4-S3 (Tap-to-Mark) |
| **XL** | System-level integration, multiple moving parts | E6-S2 (Coaching Endpoint) |

| Story | Size |
|-------|------|
| E1-S1 | L |
| E1-S2 | L |
| E1-S3 | M |
| E1-S4 | M |
| E1-S5 | M |
| E1-S6 | M |
| E2-S1 | L |
| E2-S2 | L |
| E2-S3 | S |
| E2-S4 | M |
| E2-S5 | L |
| E2-S6 | M |
| E3-S1 | L |
| E3-S2 | M |
| E3-S3 | M |
| E3-S4 | M |
| E3-S5 | M |
| E3-S6 | S |
| E3-S7 | M |
| E4-S1 | L |
| E4-S2 | M |
| E4-S3 | L |
| E4-S4 | M |
| E4-S5 | M |
| E4-S6 | S |
| E4-S7 | M |
| E5-S1 | M |
| E5-S2 | S |
| E5-S3 | M |
| E6-S1 | M (Phase 2) |
| E6-S2 | XL (Phase 2) |
| E6-S3 | M (Phase 2) |
| E6-S4 | S (Phase 2) |
| E7-S1 | L |
| E7-S2 | M |
| E7-S3 | M |
| E7-S4 | M |

---

## Implementation Order (Suggested Sprint Plan)

### Sprint 1: Foundation
- E1-S1: Initialize Monorepo Structure
- E1-S2: Docker Compose Development Environment
- E1-S3: Database Schema & Prisma Setup
- E1-S4: Express Server Foundation
- E1-S6: QA Test Infrastructure Setup

### Sprint 2: Auth & App Shell
- E2-S1: User Registration
- E2-S2: User Login
- E2-S3: User Logout
- E7-S1: Auth Layout & Protected Routes
- E7-S3: Client-Side Routing Setup
- E7-S4: API Client & Auth Interceptor

### Sprint 3: Habits & Navigation
- E3-S1: Create a Habit
- E3-S2: View Active and Archived Habit Lists
- E3-S3: Edit a Habit
- E7-S2: Responsive Navigation Bar

### Sprint 4: Calendar (Core Experience)
- E4-S1: Calendar Grid Component
- E4-S2: Fetch and Display Day Entries
- E4-S3: Tap-to-Mark a Day (Optimistic UI)
- E4-S4: Tap-to-Unmark a Day (Optimistic UI)
- E4-S7: DayCell Visual States

### Sprint 5: Calendar Polish & Stats
- E4-S5: Month Navigation
- E4-S6: Habit Switching on Calendar
- E5-S1: Statistics Calculation API
- E5-S2: Stats Panel UI Component
- E5-S3: Real-Time Stats Update on Mark/Unmark

### Sprint 6: Archive/Manage
- E3-S4: Archive a Habit
- E3-S5: View Archived Habit (Read-Only)
- E3-S6: Unarchive a Habit

### Sprint 7: Password Management, Deletion & CI
- E2-S4: Change Password
- E2-S5: Forgot Password (Request Reset)
- E2-S6: Reset Password (Complete Reset)
- E3-S7: Delete a Habit
- E1-S5: CI Pipeline Setup

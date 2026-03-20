# Architecture Document - Habbit Tracker

**Author:** Kate
**Date:** March 18, 2026
**Based on:** PRD v1 (March 17, 2026)

---

## 1. System Overview

Habbit Tracker is a calendar-centric habit tracking SPA. Users create habits, mark daily completions on a visual calendar grid, review statistics, and receive AI-powered coaching when struggling. The system is a standard three-tier web application: a React SPA frontend, a Node.js REST API backend, and a PostgreSQL database.

### Architecture Style

- **Frontend:** Single Page Application with client-side routing and rendering
- **Backend:** RESTful API server (stateless, JWT-authenticated)
- **Database:** PostgreSQL relational database
- **AI Integration:** External LLM API accessed through a backend service layer
- **Deployment:** Containerized services behind a reverse proxy

### Key Architectural Drivers

| Driver | Implication |
|---|---|
| Calendar UI is the core experience | Frontend-heavy investment; optimistic UI updates for tap-to-mark |
| Solo developer / low complexity | Minimal infrastructure; monorepo; single deployable backend |
| No offline/PWA/SSR requirements | Simple CSR SPA; no service workers or hydration complexity |
| AI feature must be modular/swappable | Backend abstraction layer for LLM providers |
| Future multi-user scaling possible | Clean data isolation by user from day one; standard auth patterns |

---

## 2. Tech Stack

### Frontend

| Technology | Purpose | Rationale |
|---|---|---|
| **React 19** | UI framework | Component model suits calendar grid; massive ecosystem; Kate's likely familiarity |
| **TypeScript** | Type safety | Catches data shape bugs at compile time; better DX for solo dev |
| **Vite** | Build tool / dev server | Fast HMR, minimal config, excellent React support |
| **React Router v7** | Client-side routing | Standard SPA routing; simple flat route structure |
| **Tailwind CSS v4** | Styling | Utility-first CSS; fast responsive design; mobile-first by default |
| **date-fns** | Date manipulation | Lightweight, tree-shakeable; calendar math (month boundaries, streaks) |
| **Lucide React** | Icons | Lightweight icon set for UI elements (checkmarks, navigation, settings) |

### Backend

| Technology | Purpose | Rationale |
|---|---|---|
| **Node.js 22 LTS** | Runtime | JavaScript end-to-end; single language across stack |
| **Express 5** | HTTP framework | Minimal, well-understood; sufficient for REST API of this scope |
| **TypeScript** | Type safety | Shared types with frontend possible; catches API contract issues |
| **Prisma** | ORM / database client | Type-safe queries; excellent migration tooling; PostgreSQL support |
| **PostgreSQL 16** | Database | Relational model fits habit/day-entry data naturally; JSONB for future flexibility |
| **jsonwebtoken** | JWT auth | Stateless authentication tokens |
| **bcrypt** | Password hashing | Industry-standard adaptive hashing (NFR6) |
| **nodemailer** | Email | Password reset flow (FR5) |
| **zod** | Validation | Runtime request validation; shares nicely with TypeScript types |
| **express-rate-limit** | Rate limiting | Brute-force protection on auth endpoints; AI coaching rate limiting (NFR13, NFR14) |

### AI Integration (Phase 2)

| Technology | Purpose | Rationale |
|---|---|---|
| **OpenAI API** (GPT-4o-mini) | LLM provider | Cost-effective for short coaching responses; good instruction following |
| **Provider abstraction layer** | Swappability | NFR12 requires provider switching without app-wide changes |

*Note: AI integration is deferred to Phase 2. The architecture and interface designs are documented here for future implementation.*

### Testing

| Technology | Purpose | Rationale |
|---|---|---|
| **Jest** | Server-side unit tests | Standard Node.js test runner; good Prisma/Express ecosystem support |
| **Vitest** | Client-side unit tests | Native Vite integration; fast; compatible with Jest API |
| **React Testing Library** | Component tests | Tests components as users interact with them; pairs with Vitest |
| **Supertest** | API integration tests | HTTP assertions against Express app without starting the server |
| **Playwright** | E2E browser tests | Cross-browser automation; reliable; great DX with trace viewer |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Local development and deployment containerization |
| **Nginx** | Reverse proxy, static file serving, TLS termination |
| **GitHub Actions** | CI/CD pipeline |

---

## 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │              React SPA (Vite build)              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │    │
│  │  │ Calendar  │ │  Habits  │ │  AI Coaching   │   │    │
│  │  │   View    │ │  Manager │ │    Modal       │   │    │
│  │  └──────────┘ └──────────┘ └───────────────┘   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │    │
│  │  │   Auth   │ │  Stats   │ │   Settings    │   │    │
│  │  │  Pages   │ │  Panel   │ │    Page       │   │    │
│  │  └──────────┘ └──────────┘ └───────────────┘   │    │
│  └─────────────────────┬───────────────────────────┘    │
└────────────────────────┼────────────────────────────────┘
                         │ HTTPS (REST + JSON)
┌────────────────────────┼────────────────────────────────┐
│  Nginx (reverse proxy) │                                 │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│              Node.js / Express API Server                │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────────┐   │
│  │   Auth   │ │  Habit   │ │     AI Coaching       │   │
│  │  Routes  │ │  Routes  │ │       Routes          │   │
│  └────┬─────┘ └────┬─────┘ └──────────┬────────────┘   │
│       │             │                  │                 │
│  ┌────┴─────┐ ┌────┴─────┐ ┌──────────┴────────────┐   │
│  │   Auth   │ │  Habit   │ │    LLM Service        │   │
│  │ Service  │ │ Service  │ │   (Provider Adapter)   │   │
│  └────┬─────┘ └────┬─────┘ └──────────┬────────────┘   │
│       │             │                  │                 │
│  ┌────┴─────────────┴──────┐  ┌───────┴──────────┐     │
│  │    Prisma ORM           │  │  OpenAI / Other   │     │
│  │   (Database Client)     │  │    LLM API        │     │
│  └────────────┬────────────┘  └──────────────────┘     │
└───────────────┼─────────────────────────────────────────┘
                │
┌───────────────┼─────────────────────────────────────────┐
│         PostgreSQL 16                                    │
│  ┌──────┐ ┌───────┐ ┌─────────────┐ ┌──────────────┐  │
│  │users │ │habits │ │ day_entries  │ │password_reset│  │
│  └──────┘ └───────┘ └─────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### Entity Relationship Diagram

```
users 1──────* habits 1──────* day_entries
  │
  └──1───────* password_reset_tokens
```

### Table Definitions

#### `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Lowercase, trimmed |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() | |

#### `habits`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | |
| `user_id` | UUID | FK → users.id, NOT NULL | CASCADE delete |
| `name` | VARCHAR(100) | NOT NULL | |
| `description` | TEXT | | Goal description for AI context |
| `start_date` | DATE | NOT NULL | No entries before this date (FR19) |
| `is_archived` | BOOLEAN | NOT NULL, default false | Archived habits hidden from active view (FR8) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() | |

Index: `(user_id, is_archived)` — powers the active/archived habit list queries.

#### `day_entries`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | |
| `habit_id` | UUID | FK → habits.id, NOT NULL | CASCADE delete |
| `entry_date` | DATE | NOT NULL | The calendar day marked |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | |

Unique constraint: `(habit_id, entry_date)` — one entry per day per habit.
Index: `(habit_id, entry_date)` — powers calendar month queries and streak calculations.

#### `password_reset_tokens`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | |
| `user_id` | UUID | FK → users.id, NOT NULL | CASCADE delete |
| `token_hash` | VARCHAR(255) | NOT NULL | Hashed token (never store raw) |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Short TTL (1 hour) |
| `used_at` | TIMESTAMPTZ | | NULL until consumed; single-use (NFR10) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | |

### Design Decisions

**Why no separate `streaks` table?** Streaks (current, longest) and completion rate are computed from `day_entries` at query time. For the expected data volume (≤10 habits × ≤365 days/year = ≤3,650 rows per user per year), computation is trivial. A materialized streak cache adds complexity without meaningful benefit at this scale.

**Why `day_entries` as presence-based (not boolean)?** A row existing = day was marked done. No row = not done. This maps directly to the PRD's "empty square" design (FR18) and simplifies queries: a month's marks are a simple `SELECT entry_date WHERE habit_id = ? AND entry_date BETWEEN ? AND ?`. Unmarking a day means deleting the row.

**Why is `start_date` immutable?** The start date anchors streak calculations, completion rate denominators, and the "no entries before this date" rule (FR19). Allowing edits would retroactively change statistics and create orphaned entries before a new start date. If a user picks the wrong date, they should delete and recreate the habit.

### Timezone Strategy (NFR15)

All dates in the system (`entry_date`, `start_date`) are calendar dates (DATE type, no time component). The critical question is: what does "today" mean?

- **Client responsibility:** The frontend sends an `X-Timezone` header (IANA identifier, e.g., `America/Los_Angeles`) with all date-sensitive API requests (mark/unmark day, create habit).
- **Server resolution:** The server uses the `X-Timezone` header to compute "today" for validation (`date ≤ today`, FR19) and streak calculations. If the header is missing, the server defaults to UTC and logs a warning.
- **Storage:** All dates are stored as plain DATE values (no timezone). `entry_date = '2026-03-19'` means March 19 in the user's local time when they marked it.
- **Why not store timezone per user?** Users may travel. Per-request timezone is more accurate and avoids a stale stored preference.

---

## 5. API Design

### Authentication

All authenticated endpoints require `Authorization: Bearer <jwt>` header.
JWT payload: `{ sub: userId, iat, exp }`. Token expiry: 7 days (NFR8).

### Endpoints

#### Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create account | No |
| POST | `/api/auth/login` | Login, returns JWT | No |
| POST | `/api/auth/forgot-password` | Request password reset email | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| PUT | `/api/auth/change-password` | Change password (logged in) | Yes |

#### Habits

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/habits` | List active habits | Yes |
| GET | `/api/habits/archived` | List archived habits | Yes |
| POST | `/api/habits` | Create a habit | Yes |
| GET | `/api/habits/:id` | Get habit detail | Yes |
| PUT | `/api/habits/:id` | Update habit name/description | Yes |
| PATCH | `/api/habits/:id/archive` | Archive a habit | Yes |
| PATCH | `/api/habits/:id/unarchive` | Unarchive a habit | Yes |
| DELETE | `/api/habits/:id` | Permanently delete a habit | Yes |

**Create habit validation:** Enforce ≤10 active habits (FR11). Return `409` if limit reached.
**Unarchive validation:** Enforce ≤10 active habits before allowing unarchive. Return `409` if limit reached.
**Delete validation:** Requires confirmation token from client (prevent accidental API calls). Cascades to all day_entries.

#### Day Entries

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/habits/:id/entries?month=YYYY-MM` | Get entries for a month | Yes |
| POST | `/api/habits/:id/entries` | Mark a day as done | Yes |
| DELETE | `/api/habits/:id/entries/:date` | Unmark a day | Yes |

**Mark day validation:** Date must be ≥ habit start_date and ≤ today (FR19). "Today" is resolved using the client's timezone (sent via `X-Timezone` header, e.g., `America/Los_Angeles`). Return `422` if invalid.

#### Statistics

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/habits/:id/stats` | Get streak and completion stats | Yes |

Response shape:
```json
{
  "currentStreak": 22,
  "longestStreak": 34,
  "completionRate": 0.95,
  "totalDays": 60,
  "completedDays": 57
}
```

#### AI Coaching

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/coaching` | Request AI coaching tip | Yes |

Request:
```json
{
  "habitId": "uuid",
  "context": "optional user message"
}
```

Response:
```json
{
  "message": "22 days is incredible, Kate. Before you decide anything..."
}
```

Rate limit: 10 requests per hour per user (NFR13).

### Error Response Format

```json
{
  "error": {
    "code": "HABIT_LIMIT_REACHED",
    "message": "You can have up to 10 active habits."
  }
}
```

---

## 6. Frontend Architecture

### Route Structure

| Path | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Email/password login |
| `/register` | `RegisterPage` | Account creation |
| `/forgot-password` | `ForgotPasswordPage` | Password reset request |
| `/reset-password/:token` | `ResetPasswordPage` | Password reset form |
| `/habits` | `HabitListPage` | Active habits list (default after login, FR30) |
| `/habits/:id` | `HabitCalendarPage` | Calendar view + stats for a habit |
| `/habits/archived` | `ArchivedHabitsPage` | Archived habits list |
| `/settings` | `SettingsPage` | Account settings (password change) |

Protected routes redirect to `/login` when no valid JWT exists.

### Component Hierarchy

```
App
├── AuthLayout
│   ├── LoginPage
│   ├── RegisterPage
│   ├── ForgotPasswordPage
│   └── ResetPasswordPage
└── AppLayout (authenticated)
    ├── NavBar (habit list, settings links)
    ├── HabitListPage
    │   ├── HabitCard (per habit)
    │   └── CreateHabitModal
    ├── HabitCalendarPage
    │   ├── MonthNavigator (prev/next month)
    │   ├── CalendarGrid
    │   │   └── DayCell (tap-to-mark, visual states)
    │   ├── StatsPanel (streak, completion rate)
    │   ├── HelpMeButton → CoachingModal
    │   └── HabitSettingsDropdown (edit, archive)
    ├── ArchivedHabitsPage
    │   └── ArchivedHabitCard → read-only calendar
    └── SettingsPage
```

### State Management

No global state library needed at this complexity level. State strategy:

- **Auth state:** React Context (`AuthContext`) holding JWT and user info. Persisted in `localStorage`.
- **Server state:** `@tanstack/react-query` for server state cache management, background refresh, and optimistic updates — particularly valuable for the tap-to-mark interaction (NFR2).
- **UI state:** Component-local `useState` for modals, form inputs, selected month.

### Optimistic UI for Day Marking

The tap-to-mark interaction must feel instant (NFR2: visual feedback within 200ms). Strategy:

1. User taps a `DayCell`
2. UI immediately toggles the visual state (checkmark appears/disappears)
3. API request fires in the background (POST or DELETE)
4. On success: no-op (UI already correct)
5. On failure: revert the visual state, show brief error toast

This is the single most important UX interaction in the app. `@tanstack/react-query`'s optimistic mutation support handles this pattern cleanly.

**Unmark undo toast:** When a day is unmarked, a brief toast notification appears (3 seconds) with an "Undo" action. If the user taps Undo, the DELETE is cancelled (or reversed with a POST) and the checkmark is restored. This prevents accidental loss of check-ins, which carry emotional weight in this product.

**Mutation queueing for rapid taps:** If the user taps the same `DayCell` rapidly (mark → unmark → mark), mutations on a given day cell are queued sequentially — each waits for the prior to settle before firing. This prevents race conditions where concurrent POST/DELETE requests resolve in unpredictable order. Implementation: disable the day cell's click handler while a mutation for that cell is in-flight, or use a per-cell mutation lock.

### Design System & Color Palette

Minimalistic white/grey/pink theme configured via Tailwind CSS custom colors:

```
colors: {
  background:  '#FFFFFF'       // Page background
  surface:     '#F9FAFB'       // Cards, panels, secondary backgrounds (grey-50)
  border:      '#E5E7EB'       // Borders, dividers (grey-200)
  muted:       '#9CA3AF'       // Placeholder text, disabled states (grey-400)
  text:        '#111827'       // Primary text (grey-900)
  'text-secondary': '#6B7280'  // Secondary text (grey-500)
  
  pink: {
    50:  '#FDF2F8'             // Hover backgrounds, subtle highlights
    100: '#FCE7F3'             // Active nav item background
    300: '#F9A8D4'             // Secondary buttons, tags
    400: '#F472B6'             // Hover states on primary elements
    500: '#EC4899'             // Primary accent — marked days, CTAs, active states
    600: '#DB2777'             // Pressed/active button state
    700: '#BE185D'             // Focus rings
  }
}
```

**DayCell visual states using the palette:**
- **Marked:** Pink-500 fill with white checkmark — the most prominent element
- **Unmarked eligible:** White background, grey-200 border — neutral, no judgment
- **Today:** Pink-50 background with pink-500 border ring
- **Before start date / future:** Grey-50 background, grey-300 text — clearly inactive
- **Hover (eligible):** Pink-50 background transition

### Calendar Grid Implementation

The calendar grid is custom-built (not a third-party calendar library) for full control over the visual experience:

- 7-column CSS Grid layout (Sun–Sat)
- `date-fns` for month boundary calculations (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`)
- Leading/trailing empty cells for proper weekday alignment
- Day cells have distinct visual states: **empty** (future/before start), **unmarked** (eligible, neutral), **marked** (pink fill with checkmark)
- CSS transitions on mark/unmark for satisfying micro-animations
- Touch targets ≥ 44x44px (responsive design requirement)

---

## 7. Backend Architecture

### Project Structure

```
server/
├── src/
│   ├── index.ts                  # Server entry point
│   ├── app.ts                    # Express app setup, middleware
│   ├── config.ts                 # Environment config (validated with zod)
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── habit.routes.ts
│   │   ├── entry.routes.ts
│   │   └── coaching.routes.ts
│   ├── services/
│   │   ├── auth.service.ts       # Registration, login, password reset logic
│   │   ├── habit.service.ts      # Habit CRUD, archiving, limit enforcement
│   │   ├── entry.service.ts      # Day entry mark/unmark, date validation
│   │   ├── stats.service.ts      # Streak calculation, completion rate
│   │   └── coaching.service.ts   # LLM prompt construction, response handling
│   ├── llm/
│   │   ├── llm-provider.ts       # Provider interface (NFR12)
│   │   ├── openai-provider.ts    # OpenAI implementation
│   │   └── prompts.ts            # System prompt templates for coaching
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── rate-limit.middleware.ts  # Auth + coaching rate limiters (NFR13, NFR14)
│   │   ├── timezone.middleware.ts    # Extracts X-Timezone header, defaults to UTC
│   │   └── error-handler.ts      # Global error handling
│   └── lib/
│       ├── prisma.ts             # Prisma client singleton
│       └── email.ts              # Email sending utility
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── package.json
└── tsconfig.json
```

### Service Layer Pattern

Routes are thin — they parse/validate the request (using zod schemas) and delegate to service functions. Services contain business logic and call Prisma for data access. This keeps routes testable and logic centralized.

### Password Validation Rules

Enforced by zod schema at the route layer:
- Minimum 8 characters
- At least one uppercase letter, one lowercase letter, and one number
- Rejected if it matches a common-passwords blocklist (top 1,000 — e.g., "Password1", "Qwerty123")
- Maximum 128 characters (prevent bcrypt DoS with extremely long inputs)

### Streak Calculation Algorithm (`stats.service.ts`)

```
currentStreak(habitId, timezone):
  today = resolveToday(timezone)
  entries = getAllEntryDates(habitId) sorted descending
  
  // Start counting from today or yesterday
  if today is in entries:
    cursor = today
  else if yesterday is in entries:
    cursor = yesterday
  else:
    return 0
  
  streak = 0
  while cursor is in entries AND cursor >= habit.startDate:
    streak++
    cursor = cursor - 1 day
  
  return streak

longestStreak(habitId):
  entries = getAllEntryDates(habitId) sorted ascending
  if empty: return 0
  
  longest = 1, current = 1
  for i = 1 to entries.length - 1:
    if entries[i] == entries[i-1] + 1 day:
      current++
      longest = max(longest, current)
    else:
      current = 1
  
  return longest
```

### LLM Provider Abstraction (NFR12)

```typescript
interface LLMProvider {
  generateCoachingTip(params: {
    habitName: string;
    habitDescription: string;
    currentStreak: number;
    completionRate: number;
    userMessage?: string;
  }): Promise<string>;
}
```

The `coaching.service.ts` accepts any `LLMProvider` implementation. Switching from OpenAI to Anthropic (or a fallback) means adding a new adapter class — zero changes to routes or the coaching service.

### Graceful AI Degradation (NFR11)

If the LLM API call fails or times out:
1. Retry once with a short timeout (2s)
2. If still failing, return a static fallback message: *"I'm having trouble connecting right now. Remember: you've already shown incredible discipline by being here. Take a deep breath and give yourself credit for trying."*
3. Log the failure for monitoring

---

## 8. AI Coaching Design

### System Prompt

The coaching LLM receives a structured system prompt that enforces the PRD's tone requirements (FR27, FR28):

```
You are a warm, supportive habit coach inside the Habbit Tracker app.

Rules:
- Be practical: suggest one concrete action the user can take RIGHT NOW
- Be warm and human: talk like a supportive friend, not a therapist or self-help book
- Never be preachy, judgmental, or guilt-inducing
- Never say "don't" or "you shouldn't" about the habit they're struggling with
- Acknowledge their progress (use the streak/stats provided)
- Keep responses to 2-3 sentences maximum
- End with something forward-looking ("tomorrow is a new square")
```

### User Prompt Construction

```
Habit: {habitName}
Goal: {habitDescription}
Current streak: {currentStreak} days
Overall completion: {completionRate}%
User says: {userMessage or "I'm struggling right now"}
```

### Cost Control

- Model: GPT-4o-mini (low cost per request)
- Max tokens: 150 (short responses by design)
- Rate limit: 10 requests/user/hour (NFR13)
- Monthly cost estimate at scale: ~$0.001 per coaching request

---

## 9. Security Architecture

### Authentication Flow

```
Register: email + password → hash password (bcrypt, 12 rounds) → store user → return JWT
Login:    email + password → verify hash → return JWT
```

JWT structure:
- Algorithm: HS256
- Expiry: 7 days
- Payload: `{ sub: userId }`
- Secret: environment variable (`JWT_SECRET`), minimum 256 bits

### Password Reset Flow

1. User submits email to `/api/auth/forgot-password`
2. Server generates a random token, hashes it, stores with 1-hour expiry
3. Sends email with reset link containing the raw token
4. User clicks link → `/reset-password/:token` page
5. Frontend submits new password + token to `/api/auth/reset-password`
6. Server hashes the submitted token, finds matching unexpired/unused row
7. Updates password, marks token as used

### Authorization Model

Simple: every authenticated request's `userId` (from JWT) is used as a mandatory filter on all database queries. There are no roles or permissions — each user can only access their own data (NFR9).

### Auth Rate Limiting (NFR14)

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `POST /api/auth/login` | 5 attempts | 15 minutes | IP address |
| `POST /api/auth/register` | 5 attempts | 15 minutes | IP address |
| `POST /api/auth/forgot-password` | 3 requests | 1 hour | Email address |
| `POST /api/auth/reset-password` | 5 attempts | 15 minutes | IP address |

Rate limit responses return `429 Too Many Requests` with a `Retry-After` header.

### Threat Model (JWT + localStorage)

**Decision:** JWT stored in `localStorage` (not httpOnly cookies).

**Trade-off:** `localStorage` is accessible to JavaScript, making it vulnerable to XSS. httpOnly cookies would eliminate this vector but introduce CSRF complexity and complicate the SPA architecture (cookie-based auth requires CSRF tokens, `SameSite` configuration, and backend cookie management).

**Mitigations:**
- Content Security Policy (CSP) header restricts script sources — primary XSS defense
- No inline scripts; Vite build produces hashed script references
- All user-generated content (habit names, descriptions) is rendered as text, never as HTML
- JWT payload contains only `userId` — no sensitive data in the token itself
- 7-day fixed expiry limits the window of a stolen token

**Acceptable risk for MVP:** Single-user personal tool with no high-value financial data. CSP + no-inline-scripts provides reasonable XSS protection. Reassess before multi-user launch (Phase 3).

### Security Headers

Nginx and Express configured with:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (restrict sources)

---

## 10. Performance Strategy

### Frontend Performance

| Requirement | Strategy |
|---|---|
| NFR1: Calendar renders < 500ms | Fetch month entries in single API call; render via CSS Grid (no heavy lib) |
| NFR2: Tap feedback < 200ms | Optimistic UI update before server round-trip |
| NFR3: Page transitions < 300ms | Client-side routing (no full page reloads); code-split routes with React.lazy |
| NFR4: Initial load < 2s on 4G | Vite tree-shaking; gzip/brotli compression via Nginx; lazy-load non-critical routes |

### Backend Performance

| Requirement | Strategy |
|---|---|
| NFR1: Month data fast | Single indexed query: `WHERE habit_id = ? AND entry_date BETWEEN ? AND ?` |
| NFR5: AI response < 3s | GPT-4o-mini is fast; 5s timeout with retry; fallback message if exceeded |
| Stats computation | Streak/completion calculated from day_entries per request (≤3,650 rows max per year) |

### Caching

No application-level cache needed for MVP. PostgreSQL's query cache and the small data volume per user make additional caching premature. If needed later: HTTP `Cache-Control` headers for static assets (handled by Nginx with long TTLs + content hashing from Vite).

---

## 11. Project Structure (Monorepo)

```
habbit-tracker/
├── client/                    # React SPA
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/        # Shared UI components
│   │   ├── pages/             # Route-level page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client functions
│   │   ├── contexts/          # React Context providers
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Date helpers, formatters
│   ├── index.html
│   ├── Dockerfile             # Multi-stage build (Vite → Nginx)
│   ├── .dockerignore
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                    # Express API
│   ├── src/                   # (see Section 7 structure)
│   ├── prisma/
│   ├── Dockerfile             # Multi-stage build (TS compile → Node.js)
│   ├── .dockerignore
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml         # Orchestrates all containers (db, server, client)
├── playwright.config.ts       # E2E test configuration
├── .env.example               # Environment variable template
├── .env.dev                   # Dev profile overrides (git-ignored)
├── .env.test                  # Test profile overrides (git-ignored)
├── .gitignore
├── package.json               # Root scripts (test:e2e, etc.)
└── README.md
```

### Why Monorepo, Not Separate Repos

Solo developer, single deployment target, shared TypeScript types between client/server. The overhead of separate repos is unjustified. Each package has its own `package.json` and scripts — no monorepo tooling (Turborepo, Nx) needed at this scale.

---

## 12. Deployment Architecture

### Dockerfiles

Both frontend and backend have dedicated Dockerfiles with multi-stage builds:

**`server/Dockerfile`** (multi-stage):
```
Stage 1 (build): Node.js base → install deps → compile TypeScript → generate Prisma client
Stage 2 (production): Node.js slim → copy compiled output → non-root user → HEALTHCHECK → CMD
```

**`client/Dockerfile`** (multi-stage):
```
Stage 1 (build): Node.js base → install deps → vite build
Stage 2 (production): Nginx alpine → copy built assets → non-root user → HEALTHCHECK → CMD
```

Requirements for both:
- Non-root user execution for security
- `HEALTHCHECK` instructions with appropriate intervals
- `.dockerignore` files excluding `node_modules`, `.env`, `dist/`, `.git`

### Docker Compose

All services orchestrated via `docker-compose.yml` at the project root.

**Compose Profiles:**
- `dev` profile: source code volume mounts, hot reload, debug ports exposed
- `test` profile: isolated test database, runs test suites, exits on completion
- Default (no profile): production-like containers

**Services:**

```
docker compose --profile dev up    # Development with hot reload
docker compose --profile test up   # Run test suites
docker compose up                  # Production-like
```

- `db`: PostgreSQL 16 container (port 5432), persistent named volume, health check via `pg_isready`
- `server`: Node.js API (port 3001), depends on `db` health, health check via `GET /api/health`
- `client`: Vite dev server (dev) or Nginx (prod) on port 5173/80

**Networking:** Internal Docker network for `db ↔ server` communication. Only `client` and `server` ports exposed to host.

**Health Checks:** All services report health status. Dependent services use `depends_on` with `condition: service_healthy`. Logs accessible via `docker-compose logs [service]`.

### Production

Target: single VPS (e.g., DigitalOcean droplet, Railway, or Fly.io) for MVP.

```
┌─────────────────────────────────────────┐
│  VPS / Container Platform               │
│  ┌───────────────────────────────────┐  │
│  │  Nginx (client container)         │  │
│  │  - TLS termination (Let's Encrypt)│  │
│  │  - Serves client build (static)   │  │
│  │  - Proxies /api/* → Node server   │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────┴───────────────────┐  │
│  │  Node.js API Server               │  │
│  │  (single process, sufficient      │  │
│  │   for single-user MVP)            │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────┴───────────────────┐  │
│  │  PostgreSQL 16                    │  │
│  │  (managed DB or local container)  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Environment Variables

```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/habbit_tracker

# Auth
JWT_SECRET=<256-bit random secret>
JWT_EXPIRY=7d

# Email
SMTP_HOST=<smtp server>
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<password>
FROM_EMAIL=noreply@habbittracker.app

# App
NODE_ENV=production
PORT=3001
CLIENT_URL=https://habbittracker.app

# AI (Phase 2)
# OPENAI_API_KEY=<key>
# OPENAI_MODEL=gpt-4o-mini
```

Environment configuration supports `dev` and `test` profiles via Docker Compose. Each profile can override variables through `.env.dev` and `.env.test` files respectively. The `.env.example` file documents all variables with safe defaults for local development.

---

## 13. Testing Strategy

### QA Integration Philosophy

Tests are written alongside features, not after. Every story that adds an API endpoint, UI component, or user flow includes corresponding tests as part of its definition of done.

### Backend QA Integration

- **Unit tests:** Jest tests for business logic (streak calculation, date validation, habit limit enforcement)
- **Integration tests:** Supertest against Express app with test database — write integration tests for each API endpoint as you build it
- **API contract validation:** Use Postman MCP or similar to validate API contracts against the spec
- **Database:** Prisma test utilities with transaction rollback
- **Convention:** Every route in `server/src/routes/` has a corresponding `*.test.ts`

### Frontend QA Integration

- **Component tests:** Vitest + React Testing Library — write component tests as you build each component
- **Development debugging:** Use Chrome DevTools MCP to debug and inspect during development
- **Coverage priority:** Key interactive components (CalendarGrid, DayCell, HabitCard, modals, forms) must have test coverage
- **Convention:** Tests co-located with components as `*.test.tsx`

### E2E QA Integration

- **Framework:** Playwright configured at the project root
- **Automation:** Use Playwright MCP to automate browser interactions
- **Target:** Runs against the full Docker Compose stack (`docker compose --profile test up`)
- **Critical flows covered:**
  - User registration and login
  - Create a habit
  - Mark/complete a day on the calendar
  - Delete a habit
  - Empty state (no habits)
  - Error handling (network errors, validation errors)
- **CI integration:** Playwright runs in the GitHub Actions pipeline with a PostgreSQL service container

### Test Commands

```
# Client (Vitest)
cd client && npm test               # Run unit/component tests
cd client && npm run test:coverage  # With coverage report

# Server (Jest)
cd server && npm test               # Run unit/integration tests
cd server && npm run test:coverage  # With coverage report

# E2E (Playwright, from project root)
npm run test:e2e                    # Run Playwright E2E suite
```

### Manual Testing

- Cross-browser verification: Chrome, Safari, Firefox (desktop + mobile)
- Responsive design: test at 375px (phone), 768px (tablet), 1280px (desktop)

### What to Skip for MVP

- Performance benchmarking — validate NFRs manually during development
- Load testing — single-user MVP doesn't need it

---

## 14. Key Technical Decisions Summary

| Decision | Choice | Alternatives Considered | Why |
|---|---|---|---|
| Frontend framework | React | Vue, Svelte | Ecosystem size, hiring pool for future, Kate's likely familiarity |
| Styling | Tailwind CSS | CSS Modules, styled-components | Fastest for responsive mobile-first; no context switching |
| Backend framework | Express | Fastify, Hono | Most familiar/documented; perf difference irrelevant at this scale |
| ORM | Prisma | Drizzle, Knex | Best migration tooling, type generation, DX for solo dev |
| Database | PostgreSQL | SQLite, MongoDB | Relational data fits naturally; proven at any scale; free managed options |
| Calendar UI | Custom CSS Grid | react-calendar, FullCalendar | PRD demands full control over the visual experience; libs add constraints |
| Auth | JWT (stateless) | Session-based | Simpler infra (no session store); good enough for this threat model |
| State management | React Query + Context | Redux, Zustand | Server state caching + optimistic updates are the hard part; RQ solves exactly this |
| LLM model | GPT-4o-mini | GPT-4o, Claude | Cost-effective; short responses don't need frontier-model capability |
| Monorepo structure | Simple shared root | Turborepo, Nx, separate repos | Solo dev, shared types; no need for monorepo tooling overhead |

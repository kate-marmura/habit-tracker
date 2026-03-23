---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments: []
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - habit-tracker

**Author:** Kate
**Date:** March 17, 2026

## Executive Summary

Habit Tracker is a web application for people who want to build or break habits and need visual proof of their progress. Target users are self-improvement-oriented individuals who find motivation in seeing patterns of consistency -- not just a streak number, but the full calendar picture of their effort over time.

Existing habit trackers reduce progress to streak counters and stats dashboards, stripping away the visual context that makes progress feel real. Habit Tracker solves this by making the calendar the primary interface: users set up habits (e.g., "quit smoking," "exercise daily"), then mark each day as complete or missed directly on a calendar view. The visual pattern of filled days becomes the core motivational feedback loop.

### What Makes This Special

The calendar *is* the product. Where competitors treat calendar views as secondary or absent entirely, Habit Tracker puts the day-by-day visual grid front and center. The core insight: a filled month of checkmarks speaks to the part of the brain that craves order and completeness far more powerfully than "Day 14" ever could. Users see the shape of their discipline -- the strong weeks, the recovery after a slip, the wall of consistency building over time. Statistics (longest streak, current streak, completion rate) complement the calendar but never replace it.

### Project Classification

- **Type:** Web application (SPA)
- **Domain:** General / Personal productivity
- **Complexity:** Low -- standard security, no regulated industry, focus on clean UX
- **Context:** Greenfield -- new build from scratch

## Success Criteria

### User Success

- User feels motivated by seeing their calendar fill up over time -- the visual pattern is the primary reward
- Marking a day takes under 3 seconds -- no friction between intent and action
- The "help me" AI tips feel warm, practical, and human -- never preachy, judgmental, or generic
- User can glance at their calendar and immediately understand their progress without reading stats

### Business Success

- Personal tool: Kate uses it daily and finds it genuinely useful for her own habits
- Code quality supports future expansion if market launch is pursued later
- Clean architecture that could accommodate multi-user scaling without major rework

### Technical Success

- Page load under 2 seconds on mobile browsers
- Responsive design: fully functional on mobile, tablet, and desktop browsers
- No offline support required -- internet connection assumed
- Account data persists reliably -- no lost check-ins

### Measurable Outcomes

- Calendar view renders a full month of habit data without lag
- AI tips respond within 3 seconds of the "help me" button press
- User can set up a new habit and mark their first day in under 60 seconds from account creation
- App works correctly on latest Chrome, Safari, and Firefox (mobile and desktop)

## Product Scope & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP -- the calendar interaction must feel delightful and polished from v1. This is not a "ship rough and iterate" product; the core visual experience IS the value proposition. Everything outside the calendar + AI can be kept simple (email/password auth, basic stats, minimal settings).

**Resource Requirements:** Solo developer project. Frontend-heavy (calendar UI is the centerpiece), lightweight backend (auth, CRUD, habit data), LLM API integration for AI coaching.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- J1: First-time setup and daily habit marking (full support)
- J2: Struggle moment and AI "help me" coaching (deferred to Phase 2)
- J3: Statistics and progress review (basic support)
- J4: Habit management (create, edit, archive)

**Must-Have Capabilities:**
- Email/password account creation and authentication
- Habit CRUD: create (name, description, start date), edit, archive
- Up to 10 active habits per user
- Calendar month view with tap-to-mark (done / not done)
- Monthly navigation (past and current months)
- Per-habit calendar view with visual checkmark grid
- Basic statistics per habit: current streak, longest streak, completion rate
- Polished, responsive calendar UI -- the core experience must feel complete, not beta
- No-judgment design: missed days are empty squares, no negative indicators
- QA infrastructure: unit tests (Jest/Vitest), E2E tests (Playwright), test commands in package.json

### Phase 2 (Growth)

- "Help me" AI coaching button: habit-aware, warm, practical, no-judgment tips via LLM (deferred from MVP -- calendar works without it, and it's the most cuttable item per Risk Mitigation)
- Richer AI: milestone celebrations, proactive encouragement
- Email verification for new accounts (required before multi-user launch)
- Google/social login options
- Push notification reminders
- Yearly heatmap view (GitHub contribution-style)
- Habit categories and color coding
- Data export (CSV/PDF)
- Weekly calendar view

### Phase 3 (Expansion)

- Multi-user support and market launch
- Community features: anonymous streak sharing, encouragement
- AI-powered pattern detection across habits
- Personalized AI recommendations based on history
- Native mobile apps (iOS/Android)

### Risk Mitigation Strategy

**Technical Risks:** The AI "help me" feature depends on external LLM API availability and cost. Mitigation: design the AI feature as a modular component so it can be swapped between providers or degraded gracefully if the API is unavailable.

**Experience Risks:** The calendar UI is make-or-break. If it doesn't feel satisfying to interact with, the product fails its core premise. Mitigation: invest in calendar UI polish early -- animations on checkmark, visual density, responsive grid.

**Resource Risks:** Solo developer scope. If time runs short, the AI feature is the most cuttable MVP item (the calendar works without it). All other features are essential for the core loop.

## User Journeys

### Journey 1: Kate Gets Started (Primary User -- First-Time Setup)

Kate has been wanting to quit smoking for months. She's tried willpower alone, she's tried apps that just show streak numbers, but nothing clicks. She finds Habit Tracker and creates an account in under a minute.

She taps "Add Habit," types "Quit Smoking," adds a short description of her goal, and picks today as her start date. The calendar appears -- a clean month grid, today highlighted, everything else empty. She taps today and marks it done. One small checkmark on a big empty canvas. It's not much yet, but it's hers.

Over the next two weeks, she adds a second habit: "30-minute walk." Now her calendar has two layers. She checks in at different times -- the walk gets marked right after she finishes, smoking gets marked at the end of the day. By week three, she opens the app and sees a block of checkmarks forming. That grid filling in is the thing that makes her smile.

**Capabilities revealed:** Account creation, habit setup (name, description, start date), calendar view, tap-to-mark interaction, multiple habit support, per-habit calendar view.

### Journey 2: Kate Hits a Wall (Primary User -- Struggle & AI Help)

It's day 23 of quitting smoking. Kate had a terrible day at work, and the craving is overwhelming. She opens Habit Tracker and looks at her calendar -- 22 consecutive checkmarks staring back at her. She doesn't want to break the pattern, but she's about to.

She hits the "Help me" button on her Quit Smoking calendar. The app responds: "22 days is incredible, Kate. Before you decide anything -- try a 15-minute walk outside. Fresh air changes the chemistry. Check in with yourself after. You've got this, and whatever happens, tomorrow is a new square."

It's warm. It doesn't say "DON'T DO IT." It gives her something practical to try. She goes for the walk. She comes back and marks day 23 as done.

Two weeks later, on day 35, she slips. She doesn't mark the day. The next morning she opens the app -- there's just one empty square in a sea of checkmarks. No red X, no popup saying "you broke your streak!" Just an empty square. She taps today and marks it done. Day 36. The empty square is there, but so is the bigger picture: 34 out of 35 days. She keeps going.

**Capabilities revealed:** AI "help me" button, habit-specific contextual tips, warm/human tone in AI responses, no-judgment missed days (empty square, not failure), streak resilience (one miss doesn't destroy progress), visual context of overall pattern.

### Journey 3: Kate Reviews Her Progress (Primary User -- Statistics & Reflection)

It's the end of Kate's second month. She opens Habit Tracker and navigates to her "Quit Smoking" calendar. She scrolls through two full months -- the grid is almost entirely filled. One empty square in month one, two in month two. She can see the shape of her discipline.

She checks her stats: current streak is 18 days, longest streak was 34 days, overall completion rate is 95%. The numbers are nice, but it's the calendar that gets her -- two months of effort, visible and undeniable. She screenshots it and sends it to her sister.

She checks her "30-minute walk" calendar -- a bit patchier, mostly weekdays. That's fine. She can see the pattern and decides weekends need work.

**Capabilities revealed:** Monthly calendar navigation (past months), per-habit statistics (current streak, longest streak, completion rate), visual pattern recognition across time, multi-habit switching.

### Journey 4: Kate Manages Her Habits (Account & Habit Management)

After three months, Kate has conquered smoking. She wants to keep the history but stop actively tracking it. She opens her habit list, finds "Quit Smoking," and archives it. The calendar data is preserved, but it no longer appears in her daily view.

She also wants to update her walking goal description and change her account password. She navigates to settings, updates her password, then edits the walking habit's description. Simple, no friction.

**Capabilities revealed:** Habit archiving (preserve history, remove from active view), habit editing (update description/details), account settings (password change), habit list management.

### Journey Requirements Summary

| Capability Area | Revealed By Journeys |
|---|---|
| Account management | J1, J4 |
| Habit CRUD (create, read, update, archive) | J1, J4 |
| Calendar view with tap-to-mark | J1, J2, J3 |
| Monthly navigation | J3 |
| Multiple habit support (up to 10) | J1, J3 |
| Statistics (streak, completion rate) | J3 |
| AI "help me" coaching | J2 |
| No-judgment missed days | J2 |
| Habit archiving | J4 |

## Web App Specific Requirements

### Project-Type Overview

Habit Tracker is a Single Page Application (SPA) optimized for simplicity and fast interaction. The calendar-centric UI requires responsive, tap-friendly interactions without full page reloads. No SEO, real-time sync, or native mobile app requirements for MVP.

### Technical Architecture Considerations

- **Architecture:** SPA -- client-side routing, no full page reloads between views
- **Rendering:** Client-side rendering (CSR) -- no SSR/SSG needed (no SEO requirement)
- **Data loading:** Fetch on page load, no real-time sync or WebSocket requirements
- **State management:** Client-side state for active session; server is source of truth on reload
- **Timezone handling:** Client sends IANA timezone with date-sensitive API requests; server resolves "today" relative to user's local time

### Browser Support

- Latest Chrome, Safari, Firefox (desktop and mobile browsers)
- No legacy browser support required
- No Edge-specific testing required for MVP

### Visual Design

- **Style:** Minimalistic, clean, uncluttered -- let the calendar grid be the visual focus
- **Color scheme:** White, grey, and pink palette
  - **Backgrounds:** White and light grey (#F9FAFB or similar)
  - **Text:** Dark grey / near-black for readability
  - **Primary accent (pink):** Used for marked days, active states, buttons, and interactive highlights
  - **Secondary/neutral:** Grey tones for borders, disabled states, and subtle UI elements
- **Tone:** Soft, warm, and motivating -- the pink accent should feel encouraging, not aggressive
- **Typography:** Clean sans-serif, generous whitespace, clear hierarchy
- **Calendar marked days:** Pink fill or pink checkmark -- the most visually prominent element on the page
- **Calendar unmarked days:** Neutral white/light grey -- no negative indicators (aligns with FR18)

### Responsive Design

- Mobile-first responsive design (CSS-based, not native apps)
- Touch-friendly tap targets for calendar day marking (minimum 44x44px)
- Fluid layout adapting to phone, tablet, and desktop viewports
- Calendar grid must remain usable and readable at phone screen widths

### Implementation Considerations

- No offline support, PWA, or service worker needed for MVP
- No push notifications for MVP
- No SEO optimization needed (app is behind authentication)
- Standard WCAG accessibility practices (semantic HTML, keyboard navigation, sufficient contrast) -- no formal WCAG audit required

## Functional Requirements

### User Account Management

- FR1: Users can create an account using email and password (minimum 8 characters, must include uppercase, lowercase, and a number; common passwords like "password1" are rejected)
- FR2: Users can log in to their account with email and password
- FR3: Users can log out of their account
- FR4: Users can change their account password
- FR5: Users can reset a forgotten password via email

### Habit Management

- FR6: Users can create a new habit with a name, goal description, and start date
- FR7: Users can edit an existing habit's name and goal description (start date is fixed at creation and cannot be changed)
- FR8: Users can archive a habit, removing it from the active view while preserving all historical data
- FR8a: Users can unarchive a previously archived habit, returning it to the active view (subject to the 10-habit active limit)
- FR8b: Users can permanently delete a habit and all its associated data, with a confirmation step
- FR9: Users can view a list of all active habits
- FR10: Users can view a list of archived habits
- FR11: Users can have up to 10 active habits simultaneously
- FR12: Users can view an archived habit's calendar and statistics in read-only mode

### Calendar View & Day Marking

- FR13: Users can view a monthly calendar grid for a selected habit
- FR14: Users can mark a specific day as "done" for a selected habit by tapping the calendar day
- FR15: Users can unmark a previously marked day (undo a check-in); an undo toast appears briefly allowing the user to reverse the unmark
- FR16: Users can navigate between months to view past and current calendar data
- FR17: Users can see which days are marked (done) and which are unmarked (not done) at a glance
- FR18: Unmarked days display as neutral empty squares with no negative visual indicators
- FR19: Users can only mark days from the habit's start date through the current date (no future marking)
- FR20: Users can switch between habits to view each habit's calendar independently

### Progress & Statistics

- FR21: Users can view their current streak for each habit. Current streak = the number of consecutive marked days counting backward from today (if today is marked) or yesterday (if today is not yet marked but yesterday was). A habit created today with no marks has a streak of 0.
- FR22: Users can view their longest streak ever achieved for each habit
- FR23: Users can view their overall completion rate (percentage of marked days since start date) for each habit
- FR24: Statistics update immediately when a day is marked or unmarked

### AI Coaching (Phase 2)

- FR25: Users can request AI coaching support via a "Help me" button when struggling with a habit
- FR26: The AI coaching provides practical, actionable tips specific to the user's habit and goal description
- FR27: The AI coaching uses a warm, supportive, non-judgmental tone -- never preachy or guilt-inducing
- FR28: The AI coaching suggests concrete actions the user can take immediately (e.g., "try a 15-minute walk")
- FR29: Users can dismiss the AI coaching response and return to their calendar

*Note: AI Coaching (FR25–FR29) is deferred to Phase 2. The calendar experience is fully functional without it. See Risk Mitigation Strategy.*

### Session & Navigation

- FR30: Users see their habit list as the default view after login
- FR31: Users can navigate between habit list, individual habit calendar, and account settings
- FR32: The app preserves the user's last-viewed habit context within a session

## Non-Functional Requirements

### Performance

- NFR1: Calendar month view renders within 500ms including all habit day markers
- NFR2: Tap-to-mark interaction provides visual feedback within 200ms (optimistic UI update before server confirmation)
- NFR3: Page transitions between views (habit list, calendar, settings) complete within 300ms
- NFR4: Initial app load completes within 2 seconds on a 4G mobile connection
- NFR5: AI coaching response returns within 3 seconds of user request

### Security

- NFR6: User passwords are hashed using industry-standard algorithms (never stored in plaintext)
- NFR7: All data transmission between client and server uses HTTPS/TLS encryption
- NFR8: Authentication tokens have a fixed 7-day expiry; users must re-authenticate after token expiration
- NFR9: Users can only access their own habit data -- no cross-user data exposure
- NFR10: Password reset tokens are single-use and time-limited

### Integration

- NFR11: AI coaching feature degrades gracefully if the LLM API is unavailable (user sees a friendly error, not a crash) *(Phase 2)*
- NFR12: LLM API integration is abstracted behind a service layer to allow provider switching without app-wide changes *(Phase 2)*
- NFR13: AI coaching requests include rate limiting to prevent excessive API costs *(Phase 2)*
- NFR14: Authentication endpoints (login, register, forgot-password) are rate-limited to prevent brute-force attacks and email spam (e.g., 5 failed logins per 15 minutes per IP, 3 password reset requests per hour per email)

### QA Integration

- NFR16: Test infrastructure is set up as part of project scaffolding: Jest for server-side unit tests, Vitest for client-side unit tests, Playwright for E2E tests
- NFR17: Test commands configured in both client and server `package.json` files (`test`, `test:e2e`)
- NFR18: CI pipeline runs all test suites (unit + E2E) on every push and PR

### Timezone

- NFR15: All date-based operations (day marking, streak calculation, start_date validation) use the client's local timezone. The client sends its IANA timezone identifier (e.g., "America/Los_Angeles") with date-sensitive requests, and the server uses it to resolve "today" boundaries.

### Design Decisions (MVP Scope)

- Email verification is deferred to Phase 2. MVP accepts unverified email addresses at registration. Rationale: this is a personal tool for Kate; email verification adds SMTP dependency to the critical signup path and increases onboarding friction. The risk (fake email → broken password reset) is acceptable for single-user MVP. Phase 2 adds verification before multi-user launch.

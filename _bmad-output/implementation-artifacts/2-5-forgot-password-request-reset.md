# Story 2.5: Forgot Password (Request Reset)

Status: done

## Story

As a user who forgot their password,
I want to request a password reset email,
so that I can regain access to my account.

## Acceptance Criteria

1. `POST /api/auth/forgot-password` accepts `{ email }`
2. Generates random token, hashes it, stores with 1-hour expiry in `password_reset_tokens`
3. Sends email with reset link containing raw token
4. Always returns `200` regardless of whether email exists (prevents enumeration)
5. Rate limited: 3 requests per hour per email address
6. Returns `429` with friendly message when rate limit exceeded
7. Frontend `ForgotPasswordPage` at `/forgot-password`
8. Shows "check your email" message after submission
9. Email utility configured with nodemailer (`server/src/lib/email.ts`)

## Tasks / Subtasks

- [x] Task 1: Add email configuration and nodemailer utility (AC: #3, #9)
  - [x] Add `nodemailer` to `server/package.json` dependencies using the latest package-manager version
  - [x] Create `server/src/lib/email.ts`
  - [x] Configure a nodemailer transporter for SMTP using `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL`
  - [x] In `NODE_ENV === 'test'`, use a non-network nodemailer transport such as `jsonTransport` so tests never depend on a real SMTP server
  - [x] In development, if SMTP config is absent, prefer a safe no-network/logging transport rather than crashing unrelated server startup
  - [x] Add a focused helper like `sendPasswordResetEmail({ to, resetUrl })`

- [x] Task 2: Extend server config for email settings (AC: #3, #9)
  - [x] Update `server/src/config.ts` to include SMTP-related env vars and `FROM_EMAIL`
  - [x] Keep validation practical: production should require usable email config for this feature; local/test should remain developer-friendly
  - [x] Update `.env.example` so all required email vars are documented clearly

- [x] Task 3: Add forgot-password rate limiter keyed by normalized email (AC: #5, #6)
  - [x] Extend `server/src/middleware/rate-limit.middleware.ts` with `forgotPasswordLimiter`
  - [x] Limit: 3 requests per hour
  - [x] Key by normalized request email (`trim().toLowerCase()`), not IP
  - [x] If email is absent or invalid before parsing, fall back safely to IP-based keying so the limiter still functions
  - [x] Return a friendly `429` response in the standard error format with `Retry-After` header
  - [x] Do not use `skipSuccessfulRequests` here; all requests should count to prevent email spam
  - [x] Keep this limiter testable: do not blindly raise the limit to `1000` in test mode the way login/register do, or provide a small factory/test override so `429` coverage remains possible

- [x] Task 4: Add forgot-password service logic (AC: #2, #3, #4)
  - [x] Add `requestPasswordReset(email)` to `server/src/services/auth.service.ts`
  - [x] Normalize email to lowercase before lookup
  - [x] Look up user by email
  - [x] If user does not exist, return success without revealing anything and do not send email
  - [x] If user exists:
  - [x] Generate a cryptographically secure random token using Node `crypto.randomBytes(32)`
  - [x] Hash the raw token before storing, using SHA-256 via Node `crypto.createHash('sha256')`
  - [x] Store only the hashed token in `password_reset_tokens` with 1-hour expiry
  - [x] Invalidate or delete existing unused reset tokens for that user before creating a new one so only the latest request remains usable
  - [x] Build reset URL as `${config.CLIENT_URL}/reset-password/${rawToken}`
  - [x] Send email containing the raw token in the link
  - [x] If email sending fails after token creation, clean up the just-created token and still preserve enumeration-safe outward behavior
  - [x] Return a neutral success payload regardless of whether the user exists, e.g. `{ success: true, message: 'If an account exists for that email, check your inbox for reset instructions.' }`

- [x] Task 5: Add route and validation schema (AC: #1, #4)
  - [x] Extend `server/src/routes/auth.routes.ts` with `forgotPasswordSchema`
  - [x] Validate `email` as required, trimmed, lowercased, valid format, max 255
  - [x] Add `POST /forgot-password` route using `forgotPasswordLimiter`
  - [x] Keep the route thin: parse body, call service, return `200`
  - [x] Ensure well-formed non-existent emails still return the same success response as existent emails

- [x] Task 6: Add server integration tests (AC: #1–#6, #9)
  - [x] Create `server/src/__tests__/auth.forgot-password.test.ts`
  - [x] Seed at least one real test user
  - [x] Test: existing email returns `200`
  - [x] Test: non-existent email returns the same `200` payload
  - [x] Test: existing email creates a `password_reset_tokens` row with hashed token and 1-hour expiry
  - [x] Test: raw token is not stored in the database
  - [x] Test: requesting twice invalidates/replaces prior unused token for that user
  - [x] Test: malformed email returns `422`
  - [x] Test: rate limit hits `429` on the 4th request for the same normalized email within the window
  - [x] Test: email utility is called only when a matching user exists

- [x] Task 7: Replace the forgot-password placeholder with a real page (AC: #7, #8)
  - [x] Create `client/src/pages/ForgotPasswordPage.tsx`
  - [x] Add a single email field and submit button
  - [x] Reuse the existing auth-page layout and styling patterns from `RegisterPage` and `LoginPage`
  - [x] After successful submit, show an enumeration-safe success message such as “If an account exists for that email, check your inbox for reset instructions.”
  - [x] Add link back to `/login`

- [x] Task 8: Wire client routing to the new page (AC: #7)
  - [x] Update `client/src/App.tsx`
  - [x] Replace the current `ForgotPasswordPlaceholder` route element with `ForgotPasswordPage`
  - [x] Keep scope limited to this page; do not add reset-password UI yet

- [x] Task 9: Submit forgot-password request from client (AC: #7, #8)
  - [x] Use existing `post()` helper from `client/src/services/api.ts`
  - [x] Handle `429` by surfacing the friendly API message
  - [x] Handle `REQUEST_ABORTED` silently, consistent with the other auth forms
  - [x] Do not show any different success state based on account existence

- [x] Task 10: Add client tests (AC: #7, #8)
  - [x] Create `client/src/pages/ForgotPasswordPage.test.tsx`
  - [x] Test: renders email field and submit button
  - [x] Test: shows client-side email validation error for malformed email
  - [x] Test: successful submit shows the neutral “check your email” message
  - [x] Test: `429` response surfaces friendly rate-limit message
  - [x] Test: `REQUEST_ABORTED` is ignored without noisy error UI

- [x] Task 11: Verify end-to-end (all ACs)
  - [x] `npm run build` succeeds for client and server
  - [x] `npm run lint` passes for client and server
  - [x] `npm test` passes for client and server
  - [x] Docker builds succeed: `docker compose build`
  - [ ] Manual test: request reset for a real email, inspect delivered reset link or logged test transport output, confirm neutral UI copy

## Dev Notes

### Story Scope

This story implements the **request-reset half** of the password reset flow only. It stops after issuing a token, storing its hash, and sending the email. The actual reset completion UI and token consumption belong to `2-6-reset-password-complete-reset`.

### Existing Code to Build On

**`server/prisma/schema.prisma`**
- `PasswordResetToken` already exists with `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt`
- No schema migration should be needed unless implementation reveals a missing index or constraint that is truly necessary

**`server/src/routes/auth.routes.ts`**
- Already contains register, login, and change-password schemas/routes
- Add `forgotPasswordSchema` and `POST /forgot-password` here rather than creating a separate auth route file

**`server/src/services/auth.service.ts`**
- Already contains all auth business logic
- Add `requestPasswordReset()` here to keep auth behaviors centralized

**`client/src/App.tsx`**
- Already has a `/forgot-password` route pointing to a placeholder
- Replace only the placeholder; do not add `/reset-password/:token` yet

### Critical Security Requirements

1. **Enumeration-safe response**
   - For any validly shaped email input, the endpoint must return the same `200` payload whether the account exists or not
   - No difference in message, status code, or response shape

2. **Store only hashed reset tokens**
   - The raw token goes only to the user via email
   - The database stores only a hash of that token

3. **Use high-entropy random tokens**
   - Generate tokens with `crypto.randomBytes(32)`
   - A 32-byte token gives 256 bits of entropy and is appropriate for reset links

4. **Short TTL**
   - Store `expiresAt` as 1 hour from creation, matching the architecture

5. **Rate limit by normalized email**
   - This flow is about preventing email spam and abuse, so the limiter key must be the normalized email address, not the IP address alone

6. **Do not leak account existence through email-send failures**
   - If a matching user exists but the SMTP send fails, a different outward response would reveal that the email exists
   - Preserve the neutral response shape/status and log the failure internally
   - If a token row was created before send failure, clean it up so the database state matches the real outcome

### Token Generation and Hashing Guidance

Use Node’s crypto primitives, not bcrypt, for reset tokens. This is a random secret, not a user-chosen password.

Recommended pattern:

```typescript
import { randomBytes, createHash } from 'node:crypto';

const rawToken = randomBytes(32).toString('hex');
const tokenHash = createHash('sha256').update(rawToken).digest('hex');
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
```

Why SHA-256 is appropriate here:
- the token is already high entropy and random
- the server does exact-match lookup later in `2-6`
- bcrypt would add unnecessary cost without improving the threat model for random reset tokens

### Email Utility Guidance

Create `server/src/lib/email.ts` with a narrow interface, for example:

```typescript
export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void>
```

Recommended behavior:
- production: require real SMTP config and send real mail
- test: use `jsonTransport` so tests stay offline
- development without SMTP: use a no-network transport and log the reset URL for local visibility

This keeps the feature testable without introducing flaky SMTP dependencies into CI.

### Failure-Handling Guidance

Password reset requests must stay enumeration-safe even when infrastructure misbehaves.

Recommended sequence:
1. look up user
2. if not found, immediately return neutral success
3. create hashed token row for a real user
4. attempt email send
5. if send succeeds, return neutral success
6. if send fails, log it, delete the just-created token row, and still return the same neutral success payload

This avoids two problems:
- outwardly revealing which emails map to real users
- leaving behind valid reset tokens for emails that were never actually delivered

### Config Guidance

`server/src/config.ts` currently validates only database/auth/app vars. Extend it to support email configuration.

Keep the solution developer-friendly:
- do not make the entire server fail to boot in local/test just because SMTP vars are absent
- do make the email utility fail clearly when a real send is required and no usable transport can be created

Use the existing architecture env names:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`

### Rate Limiter Guidance

The forgot-password limiter is different from the login limiter:
- key by normalized email
- limit all requests
- no `skipSuccessfulRequests`

Friendly `429` response example:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You’ve requested too many password reset emails. Please try again later."
  }
}
```

Keep `Retry-After` header behavior consistent with existing rate limiters.

### Frontend Guidance

The page should mirror the existing auth-page styling patterns:
- centered card
- pink accent heading/button
- inline validation
- clear success state after submit

The success copy must remain enumeration-safe. Prefer wording like:
- “If an account exists for that email, check your inbox for reset instructions.”

Do not say:
- “We sent an email to you@example.com”
- “No account exists for that email”

### Testing Guidance

**Server tests**
- Follow the existing auth integration style from:
  - `server/src/__tests__/auth.register.test.ts`
  - `server/src/__tests__/auth.login.test.ts`
  - `server/src/__tests__/auth.change-password.test.ts`
- Mock or stub the email utility rather than relying on a real SMTP server
- Use unique email values in rate-limit tests so existing auth tests cannot interfere

**Client tests**
- Follow the existing auth-page test harness
- Wrap with router/providers as needed
- Assert neutral success copy, not account-specific behavior

### Previous Story Intelligence

Key learnings from E2-S1 through E2-S4 that matter here:

1. **Auth code is centralized**
   - Keep all server-side auth logic in `auth.service.ts` and `auth.routes.ts`

2. **401 handling in `api.ts` is now nuanced**
   - Avoid introducing any response shape or code that accidentally logs the user out during a public forgot-password request

3. **`REQUEST_ABORTED` is already part of the client contract**
   - Forgot-password form should silently ignore it just like the other auth forms

4. **Temporary route placeholders already exist**
   - Replace the `/forgot-password` placeholder directly rather than introducing new routing abstractions

5. **Password policy is already shared**
   - The reset-request story does not need new password rules yet, but it must set up the token/email flow in a way that cleanly feeds `2-6`

### Latest Technical Notes

- `nodemailer` latest observed npm release is `8.0.3`; use the package manager to install the current version rather than pinning a guessed older release
- `express-rate-limit` latest observed release remains in the `8.x` line and supports custom `keyGenerator`
- For secure reset tokens, `crypto.randomBytes()` remains the right primitive for generation

### What This Story Does NOT Include

- `POST /api/auth/reset-password`
- `/reset-password/:token` page
- Verifying or consuming reset tokens
- Email verification workflows
- Full settings or app-shell navigation work

### References

- [Source: Epics — E2-S5 acceptance criteria]
- [Source: PRD — FR5]
- [Source: Architecture §5 — Auth endpoints]
- [Source: Architecture §9 — Password reset flow and auth rate limiting]
- [Source: Architecture §12 — Email-related environment variables]
- [Source: Previous Story 2-1 — shared auth patterns and validation]
- [Source: Previous Story 2-4 — current auth route/service structure and `api.ts` behavior]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking

### Debug Log References

- express-rate-limit v8 requires `validate: { keyGeneratorIpFallback: false }` when custom `keyGenerator` has IP fallback (not `ipAddress`)
- `type="email"` inputs trigger native HTML5 validation in jsdom; added `noValidate` to the form to allow custom JS validation to run
- Rate limit of 3/hr per email causes test interference when multiple test cases use the same email; solved by using unique email per test group

### Completion Notes List

- All automated tasks complete; manual end-to-end test remains
- nodemailer installed with jsonTransport for test/dev environments
- Email utility logs to console in dev when SMTP is not configured
- Rate limiter keyed by normalized email with `forgot:` prefix namespace
- Token cleanup on email send failure preserves enumeration-safe behavior
- Server: 35 tests passing (8 new forgot-password tests)
- Client: 27 tests passing (7 new ForgotPasswordPage tests)
- Both builds, lint, and Docker builds pass clean

### File List

- `server/src/lib/email.ts` — NEW: nodemailer email utility with transport selection by environment
- `server/src/config.ts` — MODIFIED: added optional SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
- `server/src/middleware/rate-limit.middleware.ts` — MODIFIED: added forgotPasswordLimiter (3/hr per email)
- `server/src/services/auth.service.ts` — MODIFIED: added requestPasswordReset() function
- `server/src/routes/auth.routes.ts` — MODIFIED: added forgotPasswordSchema and POST /forgot-password route
- `server/src/__tests__/auth.forgot-password.test.ts` — NEW: 8 integration tests
- `client/src/pages/ForgotPasswordPage.tsx` — NEW: forgot password form with success state
- `client/src/pages/ForgotPasswordPage.test.tsx` — NEW: 7 component tests
- `client/src/App.tsx` — MODIFIED: replaced ForgotPasswordPlaceholder with ForgotPasswordPage
- `.env.example` — MODIFIED: uncommented and documented email vars
- `server/package.json` — MODIFIED: added nodemailer dependency

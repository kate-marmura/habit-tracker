# Story 2.6: Reset Password (Complete Reset)

Status: done

## Story

As a user with a reset token,
I want to set a new password,
so that I can log in again.

## Acceptance Criteria

1. `POST /api/auth/reset-password` accepts `{ token, newPassword }`
2. Hashes submitted token and looks up matching unexpired, unused row
3. Updates user password and marks token as used (`used_at` timestamp)
4. Returns `400` if token is invalid, expired, or already used
5. Frontend `ResetPasswordPage` at `/reset-password/:token`
6. Shows new password form with confirmation field
7. Redirects to `/login` with success message after reset

## Tasks / Subtasks

- [x] Task 1: Reuse the shared password policy for reset completion (AC: #1, #4)
  - [x] Extend `server/src/routes/auth.routes.ts` with `resetPasswordSchema`
  - [x] Reuse the existing shared `passwordSchema` for `newPassword`
  - [x] Validate `token` as required/non-empty string
  - [x] Keep route-layer validation focused: token presence + password rules only

- [x] Task 1a: Add reset-password rate limiting (AC: #1, #4)
  - [x] Extend `server/src/middleware/rate-limit.middleware.ts` with `resetPasswordLimiter`
  - [x] Limit `POST /api/auth/reset-password` to 5 attempts per 15 minutes keyed by IP address, matching the architecture
  - [x] Return the standard `429` error format with `Retry-After` header
  - [x] Keep testability aligned with existing auth limiters so normal test suites do not fail spuriously

- [x] Task 2: Add reset-password service logic (AC: #1, #2, #3, #4)
  - [x] Add `resetPassword(token, newPassword)` to `server/src/services/auth.service.ts`
  - [x] Hash the submitted raw token with the same SHA-256 strategy used in `requestPasswordReset()`
  - [x] Look up a matching `password_reset_tokens` row where `tokenHash` matches, `expiresAt` is in the future, and `usedAt` is null
  - [x] If no valid row exists, throw `AppError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or has expired')`
  - [x] If the token row points to a missing user, treat it as the same invalid/expired token case rather than leaking account-state details
  - [x] Hash `newPassword` with bcrypt 12 rounds and update the linked user’s `passwordHash`
  - [x] Mark the matched reset token row as used by setting `usedAt`
  - [x] Invalidate any other outstanding unused reset tokens for the same user after a successful reset
  - [x] Return a minimal success payload, e.g. `{ success: true, message: 'Password has been reset successfully' }`

- [x] Task 3: Make reset completion safe and atomic (AC: #2, #3, #4)
  - [x] Perform token validation, user password update, and token `usedAt` update in a single Prisma transaction
  - [x] Ensure two rapid submissions of the same token cannot both succeed
  - [x] Treat invalid, expired, and already-used tokens with the same `400` response/message

- [x] Task 4: Add authenticated login verification regression coverage (AC: #3, #4)
  - [x] After successful reset, verify login with the old password fails
  - [x] Verify login with the new password succeeds
  - [x] Verify the same reset token cannot be reused after the first successful reset

- [x] Task 5: Add reset-password route (AC: #1, #4)
  - [x] Add `POST /reset-password` to `server/src/routes/auth.routes.ts`
  - [x] Apply `resetPasswordLimiter` to the route
  - [x] Keep the route public (no auth middleware)
  - [x] Parse body with `resetPasswordSchema`, call the service, return `200`

- [x] Task 6: Add server integration tests (AC: #1–#4)
  - [x] Create `server/src/__tests__/auth.reset-password.test.ts`
  - [x] Seed a test user and one or more reset-token rows directly in the database
  - [x] Test: valid token + valid new password returns `200`
  - [x] Test: token is hashed before lookup; raw token is never stored in DB
  - [x] Test: expired token returns `400`
  - [x] Test: already-used token returns `400`
  - [x] Test: unknown token returns `400`
  - [x] Test: weak `newPassword` returns `422`
  - [x] Test: rate limit hits `429` on the 6th reset attempt within the window
  - [x] Test: successful reset marks `usedAt`
  - [x] Test: successful reset invalidates other unused tokens for the same user
  - [x] Test: old password fails login, new password succeeds login

- [x] Task 7: Create `ResetPasswordPage` UI (AC: #5, #6, #7)
  - [x] Create `client/src/pages/ResetPasswordPage.tsx`
  - [x] Read `token` from the route param `/reset-password/:token`
  - [x] Add fields for `newPassword` and `confirmNewPassword`
  - [x] Reuse the existing auth-page styling patterns from `RegisterPage`, `LoginPage`, and `ForgotPasswordPage`
  - [x] Show inline validation for required fields and confirmation mismatch
  - [x] Show password-strength indicators consistent with register/settings pages

- [x] Task 8: Submit reset-password request from client (AC: #5, #6, #7)
  - [x] Use existing `post()` helper from `client/src/services/api.ts` to call `/api/auth/reset-password`
  - [x] On success, redirect to `/login` and surface a success message/state so the user knows to sign in with the new password
  - [x] On `400 INVALID_RESET_TOKEN`, show a clear invalid/expired-link message on the page without redirecting
  - [x] On `REQUEST_ABORTED`, fail silently consistent with the other auth forms
  - [x] Do not auto-authenticate the user after reset; the acceptance criteria explicitly send them back to `/login`

- [x] Task 9: Wire client routing for reset-password (AC: #5, #7)
  - [x] Update `client/src/App.tsx` to add `/reset-password/:token` → `ResetPasswordPage`
  - [x] Keep scope limited to this page; do not add broader auth-layout or protected-route work

- [x] Task 10: Add client tests (AC: #5, #6, #7)
  - [x] Create `client/src/pages/ResetPasswordPage.test.tsx`
  - [x] Test: renders new-password and confirm-password fields
  - [x] Test: shows client-side mismatch validation
  - [x] Test: successful submit redirects to `/login` and shows success state/message
  - [x] Test: `INVALID_RESET_TOKEN` shows an invalid/expired-link message
  - [x] Test: `REQUEST_ABORTED` is ignored without noisy error UI

- [x] Task 11: Verify end-to-end (all ACs)
  - [x] `npm run build` succeeds for client and server
  - [x] `npm run lint` passes for client and server
  - [x] `npm test` passes for client and server
  - [x] Docker builds succeed: `docker compose build`
  - [x] Manual test: request reset → open reset link → set new password → log in successfully with the new password

## Dev Notes

### Story Scope

This story completes the password reset flow started in `2-5`. It consumes the token that was emailed to the user, updates the password, invalidates the token, and sends the user back to the login screen. It does **not** add auto-login after reset.

### Existing Code to Build On

**`server/src/services/auth.service.ts`**
- Already contains `requestPasswordReset()`
- Already uses `randomBytes(32)` for raw token generation
- Already hashes reset tokens with SHA-256 before storage
- Add `resetPassword()` here so all auth business logic stays centralized

**`server/src/routes/auth.routes.ts`**
- Already contains register/login/change-password/forgot-password routes and the shared `passwordSchema`
- Add `resetPasswordSchema` and `POST /reset-password` here rather than creating a new route file

**`server/src/middleware/rate-limit.middleware.ts`**
- Already contains register/login/forgot-password limiters
- Add `resetPasswordLimiter` here instead of embedding limiter logic in the route file

**`server/src/lib/email.ts`**
- Already builds reset links as `${config.CLIENT_URL}/reset-password/${rawToken}`
- This story must honor that exact route shape on the client

**`server/prisma/schema.prisma`**
- `PasswordResetToken` already has the right fields: `tokenHash`, `expiresAt`, `usedAt`
- No schema changes should be needed unless implementation reveals a real missing constraint

**`client/src/App.tsx`**
- Already has `/forgot-password`
- Does not yet have `/reset-password/:token`

### Critical Security Requirements

1. **Hash the incoming token before lookup**
   - Never compare or store the raw token directly in the database layer
   - Use the same SHA-256 algorithm used in `requestPasswordReset()`

2. **Uniform invalid-token handling**
   - Invalid token
   - Expired token
   - Already-used token
   - All must return the same `400` response/message so the API does not leak extra state

3. **Rate limit reset attempts**
   - Architecture requires `POST /api/auth/reset-password` to be limited to 5 attempts per 15 minutes by IP address
   - Reuse the existing rate-limiter patterns and standard error format

4. **Single-use token enforcement**
   - Once a token succeeds, it must not work again
   - Also invalidate any sibling unused reset tokens for the same user to keep the account state clean

5. **Do not auto-authenticate after reset**
   - The user should be redirected to `/login` and sign in normally
   - Do not issue a JWT here unless product requirements explicitly change

### Recommended Server Pattern

Use the same hashing approach as `requestPasswordReset()`:

```typescript
import { createHash } from 'node:crypto';

const tokenHash = createHash('sha256').update(token).digest('hex');
```

Recommended service shape:

```typescript
export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, userId: true },
    });

    if (!resetToken) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
        id: { not: resetToken.id },
      },
      data: { usedAt: now },
    });

    return { success: true, message: 'Password has been reset successfully' };
  });
}
```

### Validation Guidance

Reuse the shared `passwordSchema` from `auth.routes.ts`:

```typescript
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});
```

The confirm-password field is client-side only and should not be part of the API contract.

### Frontend Guidance

Create a public `ResetPasswordPage` that:
- reads `token` from `useParams()`
- renders only the new password + confirm password fields
- matches the established auth UI style
- stays on the page with an error state when the token is invalid/expired
- redirects to `/login` only after successful reset

Preferred invalid-token copy:
- “This password reset link is invalid or has expired.”

Do not expose token details, timestamps, or whether the token was already used.

### Success Redirect Guidance

Because the app does not yet have a flash-message system, a simple query-string or route-state success handoff is acceptable, for example:
- `navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } })`

If that approach is used, keep it minimal and local to auth pages. Do not build a general notification framework in this story.

### Testing Guidance

**Server tests**
- Follow the existing auth integration style from:
  - `server/src/__tests__/auth.register.test.ts`
  - `server/src/__tests__/auth.login.test.ts`
  - `server/src/__tests__/auth.change-password.test.ts`
  - `server/src/__tests__/auth.forgot-password.test.ts`
- Seed reset token rows directly for most tests rather than always going through the forgot-password endpoint; this keeps tests targeted and deterministic
- Use unique IP or request patterns for rate-limit coverage so unrelated auth tests do not interfere

**Client tests**
- Follow the existing auth-page test harness
- Mock `post()` for success, invalid token, and aborted request cases
- Assert redirect to `/login` only on success

### Previous Story Intelligence

Key learnings from `2-5` that matter here:

1. **Reset links are already emitted as `/reset-password/:token`**
   - The client route must match exactly or sent emails will be broken

2. **Reset tokens are stored hashed with SHA-256**
   - This story must use the exact same hashing strategy on lookup; no alternate token encoding scheme

3. **The forgot-password flow cleans up tokens on email-send failure**
   - By the time a user reaches this story, any stored token should correspond to a delivered link; preserve that clean contract

4. **Public auth forms already ignore `REQUEST_ABORTED` silently**
   - Keep reset-password consistent with register/login/forgot-password

5. **The app already has nuanced `401` handling in `api.ts`**
   - This story should use `400 INVALID_RESET_TOKEN` for bad links, not `401`, to avoid accidentally triggering auth-session semantics

### What This Story Does NOT Include

- Another forgot-password request screen
- Authenticated settings work
- Auto-login after password reset
- Email verification or magic-link auth

### References

- [Source: Epics — E2-S6 acceptance criteria]
- [Source: PRD — FR5]
- [Source: Architecture §5 — Auth endpoints]
- [Source: Architecture §9 — Password reset flow steps 4-7]
- [Source: Previous Story 2-4 — shared password policy and `api.ts` behavior]
- [Source: Previous Story 2-5 — reset-token generation, hashing, email utility, and route shape]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus-high-thinking

### Debug Log References

- `getByLabelText(/new password/i)` matched both "New Password" and "Confirm New Password" labels; fixed with `^new password$` anchor regex
- Lint caught unused `_siblingRaw1`/`_siblingRaw2` vars in sibling-token-invalidation test; fixed by dropping return values
- Architecture requires a dedicated reset-password rate limit (5 attempts / 15 minutes / IP); implemented in `rate-limit.middleware.ts`
- Invalid, expired, and already-used tokens all return the same `400 INVALID_RESET_TOKEN` to avoid token-state leakage

### Completion Notes List

- Manual end-to-end verified locally (request reset → reset link → new password → login)
- `resetPassword()` runs in a Prisma `$transaction` for atomicity
- Token lookup uses SHA-256 hash matching (same strategy as `requestPasswordReset`)
- Sibling unused tokens are invalidated on successful reset
- LoginPage consumes `location.state.message` for post-reset success banner
- ResetPasswordPage: invalid-link UI, missing-token guard, `token.trim()` on submit
- Post–code-review: reset limiter `Retry-After` on 429; test-only rate-limit slot header + 6th-request 429 integration test; `cancelPendingRequests` in page test mock
- Server/client tests, lint, and builds passing at story close

### File List

- `server/src/services/auth.service.ts` — MODIFIED: added `resetPassword()` with transaction
- `server/src/routes/auth.routes.ts` — MODIFIED: added `resetPasswordSchema` and `POST /reset-password` route
- `server/src/middleware/rate-limit.middleware.ts` — MODIFIED: `resetPasswordLimiter` (5/15min/IP, `Retry-After`, test slot for 429 coverage)
- `server/src/__tests__/auth.reset-password.test.ts` — NEW: reset-password integration tests (incl. rate limit)
- `client/src/pages/ResetPasswordPage.tsx` — NEW: password reset form with token from URL
- `client/src/pages/ResetPasswordPage.test.tsx` — NEW: 5 component tests
- `client/src/pages/LoginPage.tsx` — MODIFIED: consumes route state for post-reset success message
- `client/src/App.tsx` — MODIFIED: added `/reset-password/:token` route
